/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { BotTelemetryClient, TurnContext } from 'botbuilder';
import { ActivityExtensions } from 'botbuilder-solutions';
import { MicrosoftAppCredentials } from 'botframework-connector';
import { Activity, ActivityTypes } from 'botframework-schema';
import { CancellationToken, IStreamingTransportClient, Request, RequestHandler } from 'microsoft-bot-protocol';
import { Client } from 'microsoft-bot-protocol-websocket';
// import { IStreamingTransportClient, RequestHandler, StreamingRequest, WebSocketClient } from 'botframework-streaming-extensions'; PENDING -
import { IServiceClientCredentials } from '../auth';
import { ISkillManifest, SkillEvents } from '../models';
import { ActivityAction, SkillCallingRequestHandler } from '../skillCallingRequestHandler';
import { FallbackHandler, ISkillTransport, TokenRequestHandler } from '../skillTransport';

export class SkillWebSocketTransport implements ISkillTransport {
    private readonly cToken: CancellationToken;
    private streamingTransportClient!: IStreamingTransportClient;
    private readonly telemetryClient: BotTelemetryClient;
    private handoffActivity: Partial<Activity> | undefined;

    public constructor(telemetryClient: BotTelemetryClient, streamingTransportClient?: IStreamingTransportClient) {
        this.telemetryClient = telemetryClient;

        if (streamingTransportClient !== undefined) {
            this.streamingTransportClient = streamingTransportClient;
        }

        this.cToken = new CancellationToken();
    }

    public async forwardToSkill(
        skillManifest: ISkillManifest,
        serviceClientCredentials: IServiceClientCredentials,
        turnContext: TurnContext,
        activity: Partial<Activity>,
        tokenRequestHandler?: TokenRequestHandler,
        fallbackHandler?: FallbackHandler
    ): Promise<Partial<Activity>>  {
        if (this.streamingTransportClient === undefined) {
            const url: string = this.ensureWebSocketUrl(skillManifest.endpoint);
            const tokenCallBack: ActivityAction = this.getTokenCallback(turnContext, tokenRequestHandler);
            const fallbackCallback: ActivityAction = this.getFallbackCallback(turnContext, fallbackHandler);
            const handoffActivityCallback: ActivityAction = this.getHandoffActivityCallback();

            const requestHandler: RequestHandler = new SkillCallingRequestHandler(
                turnContext,
                this.telemetryClient,
                tokenCallBack,
                fallbackCallback,
                handoffActivityCallback
            );
            
            this.streamingTransportClient = new Client({url: url, requestHandler: requestHandler});
            await this.streamingTransportClient.connectAsync();
            
            /* PENDING - Websocket functionality
            // establish websocket connection
            this.streamingTransportClient = new WebSocketClient({ url, requestHandler });
            */
        }

        // acquire AAD token
        MicrosoftAppCredentials.trustServiceUrl(skillManifest.endpoint);
        const token: string = await serviceClientCredentials.getToken();
        /* PENDING - Websocket functionality
        // put AAD token in the header
        const headers: Map<string, string> = new Map();
        const keyHeader: string = 'Authorization';
        const valHeader: string = `Bearer ${token}`;
        headers.set(keyHeader, valHeader);
        // PENDING connect methods needs a header parameter?
        // await this.streamingTransportClient.connect();
        let latency: number = 0;
        */

        // set recipient to the skill
        if (activity !== undefined && activity.recipient !== undefined) {
            const recipientId: string = activity.recipient.id;
            activity.recipient.id = skillManifest.msaAppId;

            // Serialize the activity and POST to the Skill endpoint
            // const request: StreamingRequest = StreamingRequest.create('POST'); PENDING - Websocket functionality
            const request: Request = Request.create('POST', '');
            request.setBody(JSON.stringify(activity));

            // set back recipient id to make things consistent
            activity.recipient.id = recipientId;
            await this.streamingTransportClient.sendAsync(request, this.cToken);

            /* PENDING - Websocket functionality
            try {
                const begin: [number, number] = process.hrtime();
                await this.streamingTransportClient.send(request);
                const end: [number, number] = process.hrtime(begin);
                latency = toMilliseconds(end);
            } catch (error) {
                throw new Error('Callback failed');
            }
           */ 
        }

        /* PENDING - Websocket functionality
        this.telemetryClient.trackEvent({
            name: 'SkillWebSocketTurnLatency',
            properties: {
                SkillName: skillManifest.name,
                SkillEndpoint: skillManifest.endpoint
            },
            metrics: { latency: latency }
        });
        */

        if (this.handoffActivity === undefined) {
            throw new Error('handoffActivity value is Undefined');
        }

        return this.handoffActivity;
    }

    public async cancelRemoteDialogs(
        skillManifest: ISkillManifest,
        appCredentials: IServiceClientCredentials,
        turnContext: TurnContext
    ): Promise<void> {
        const cancelRemoteDialogEvent: Activity = ActivityExtensions.createReply(turnContext.activity);

        cancelRemoteDialogEvent.type = ActivityTypes.Event;
        cancelRemoteDialogEvent.name = SkillEvents.cancelAllSkillDialogsEventName;

        await this.forwardToSkill(skillManifest, appCredentials, turnContext, cancelRemoteDialogEvent);
    }

    public disconnect(): void {
        if (this.streamingTransportClient !== undefined) {
            this.streamingTransportClient.disconnect();
        }
    }

    private getTokenCallback(turnContext: TurnContext, tokenRequestHandler: ActivityAction | undefined): ActivityAction {
        return (activity: Activity): void => {
            if (tokenRequestHandler !== undefined) {
                tokenRequestHandler(activity);
            }
        };
    }

    private getFallbackCallback(turnContext: TurnContext, fallbackEventHandler: ActivityAction | undefined): ActivityAction {
        return (activity: Activity): void => {
            if (fallbackEventHandler !== undefined) {
                fallbackEventHandler(activity);
            }
        };
    }

    private getHandoffActivityCallback(): ActivityAction {
        return (activity: Activity): void => {
            this.handoffActivity = activity;
        };
    }
 
    private ensureWebSocketUrl(url: string): string {
        if (!url) {
            throw new Error('url is empty!');
        }
        const httpPrefix: string = 'http://';
        const httpsPrefix: string = 'https://';
        const wsPrefix: string = 'ws://';
        const wssPrefix: string = 'wss://';
        if (url.startsWith(httpPrefix)) {
            return url.replace(httpPrefix, wsPrefix);
        }
        if (url.startsWith(httpsPrefix)) {
            return url.replace(httpsPrefix, wssPrefix);
        }

        return url;
    }
}

function toMilliseconds(hrtime: [number, number]): number {
    const nanoseconds: number = (hrtime[0] * 1e9) + hrtime[1];

    return nanoseconds / 1e6;
}
