/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { BotAdapter, BotTelemetryClient, InvokeResponse, Middleware, NullTelemetryClient,
    ResourceResponse, Severity, TurnContext } from 'botbuilder';
import { ActivityExtensions, IFallbackRequestProvider, IRemoteUserTokenProvider, TokenEvents } from 'botbuilder-solutions';
import { ContentStream, IReceiveResponse, StreamingRequest, WebSocketServer } from 'botframework-streaming-extensions';
import { Activity, ActivityTypes, ConversationReference } from 'botframework-schema';
import { v4 as uuid } from 'uuid';
import { BotCallbackHandler, IActivityHandler, SkillConstants } from '../';
import { SkillEvents } from '../models';

/**
 * This adapter is responsible for processing incoming activity from a bot-to-bot call over websocket transport.
 * It'll performs the following tasks:
 * 1. Process the incoming activity by calling into pipeline.
 * 2. Implement BotAdapter protocol. Each method will send the activity back to calling bot using websocket.
 */
export class SkillWebSocketBotAdapter extends BotAdapter implements IActivityHandler, IRemoteUserTokenProvider, IFallbackRequestProvider {
    private readonly telemetryClient: BotTelemetryClient;
    public server!: WebSocketServer;
    
    public constructor(middleware?: Middleware, telemetryClient?: BotTelemetryClient) {
        super();
        this.telemetryClient = telemetryClient || new NullTelemetryClient();
        if (middleware !== undefined) {
            this.use(middleware);
        }
    }
    
    continueConversation(reference: Partial<ConversationReference>, logic: (revocableContext: TurnContext) => Promise<void>): Promise<void> {
        throw new Error("Method not implemented.");
    }

    /**
     * Primary adapter method for processing activities sent from calling bot.
     * @param activity The activity to process.
     * @param callback The BotCallBackHandler to call on completion.
     * @returns The response to the activity.
     */
    public async processActivity(activity: Activity, callback: BotCallbackHandler): Promise<InvokeResponse> {
        const message: string = `Received an incoming activity. ActivityId: ${activity.id}`;
        this.telemetryClient.trackTrace({
            message: message,
            severityLevel: Severity.Information
        });

        //PENDING
        const context: TurnContext = new TurnContext(this, activity);
        await this.runMiddleware(context, callback);

        // We do not support Invoke in websocket transport
        if (activity.type === ActivityTypes.Invoke) {
            return { status: 501 };
        }

        return { status: 200 };
    }

    /**
     * Sends activities to the conversation.
     * If the activities are successfully sent, the task result contains
     * an array of ResourceResponse objects containing the IDs that
     * the receiving channel assigned to the activities.
     * @param turnContext The context object for the turn.
     * @param activities The activities to send.
     * @returns A task that represents the work queued to execute.
     */
    public async sendActivities(turnContext: TurnContext, activities: Partial<Activity>[]): Promise<ResourceResponse[]> {
        const responses: ResourceResponse[] = [];

        activities.forEach(async (activity: Partial<Activity>, index: number): Promise<void> => {
            if (!activity.id) {
                activity.id = uuid();
            }

            let response: ResourceResponse|undefined = { id: '' };

            if (activity.type === 'delay') {
                // The Activity Schema doesn't have a delay type build in, so it's simulated
                // here in the Bot. This matches the behavior in the Node connector.
                const delayMs: number = <number> activity.value;
                await sleep(delayMs);
                // No need to create a response. One will be created below.
            }

            // set SemanticAction property of the activity properly
            this.ensureActivitySemanticAction(turnContext, activity);

            if (activity.type !== ActivityTypes.Trace || (activity.type === ActivityTypes.Trace && activity.channelId === 'emulator')) {
                const requestPath: string = `/activities/${activity.id}`;
                const request: StreamingRequest = StreamingRequest.create('POST', requestPath);

                // set callerId to empty so it's not sent over the wire
                activity.callerId = undefined;

                request.setBody(activity);

                const message: string = `Sending activity. ReplyToId: ${activity.replyToId}`;
                this.telemetryClient.trackTrace({
                    message: message,
                    severityLevel: Severity.Information
                });

                let latency: number = 0;
                try {
                    const begin: [number, number] = process.hrtime();
                    response = await this.sendRequest<ResourceResponse>(request);
                    const end: [number, number] = process.hrtime(begin);
                    latency = toMilliseconds(end);
                } catch (error) {
                    throw new Error('Callback failed');
                }

                const latencyMetrics: { latency: number } = { latency: latency };

                const event: string = 'SkillWebSocketSendActivityLatency';
                this.telemetryClient.trackEvent({
                    name: event,
                    metrics: latencyMetrics
                });

                // If No response is set, then default to a "simple" response. This can't really be done
                // above, as there are cases where the ReplyTo/SendTo methods will also return null
                // (See below) so the check has to happen here.

                if (response === undefined) {
                    response = { id: activity.id || '' };
                }
            }

            responses.push(response);
        });

        return responses;
    }

    public async updateActivity(turnContext: TurnContext, activity: Partial<Activity>): Promise<void> {
        const requestPath: string = `/activities/${activity.id}`;
        const request: StreamingRequest = StreamingRequest.create('PUT', requestPath);

        // set callerId to empty so it's not sent over the wire
        activity.callerId = undefined;

        request.setBody(activity);

        let response: ResourceResponse|undefined = { id: '' };

        const message: string = `Updating activity. activity id: ${activity.replyToId}`;
        this.telemetryClient.trackTrace({
            message: message,
            severityLevel: Severity.Information
        });
        let latency: number = 0;
        try {
            const begin: [number, number] = process.hrtime();
            response = await this.sendRequest<ResourceResponse>(request);
            const end: [number, number] = process.hrtime(begin);
            latency = toMilliseconds(end);
        } catch (error) {
            throw new Error('Callback failed');
        }

        const latencyMetrics: { latency: number } = { latency: latency };

        const event: string = 'SkillWebSocketUpdateActivityLatency';
        this.telemetryClient.trackEvent({
            name: event,
            metrics: latencyMetrics
        });

        if (response === undefined) {
            response = { id: '' };
        }
    }

    public async deleteActivity(turnContext: TurnContext, reference: Partial<ConversationReference>): Promise<void> {
        const requestPath: string = `/activities/${reference.activityId}`;
        const request: StreamingRequest = StreamingRequest.create('DELETE', requestPath);

        const message: string = `Deleting activity. activity id: ${reference.activityId}`;
        this.telemetryClient.trackTrace({
            message: message,
            severityLevel: Severity.Information
        });

        let latency: number = 0;
        try {
            const begin: [number, number] = process.hrtime();
            await this.sendRequest<ResourceResponse>(request);
            const end: [number, number] = process.hrtime(begin);
            latency = toMilliseconds(end);
        } catch (error) {
            throw new Error('Callback failed');
        }

        const latencyMetrics: { latency: number } = { latency: latency };

        const event: string = 'SkillWebSocketDeleteActivityLatency';
        this.telemetryClient.trackEvent({
            name: event,
            metrics: latencyMetrics
        });
    }

    public async sendRemoteTokenRequestEvent(turnContext: TurnContext): Promise<void> {
        // We trigger a Token Request from the Parent Bot by sending a "TokenRequest" event back and then waiting for a "TokenResponse"
        const response: Activity = ActivityExtensions.createReply(turnContext.activity);
        response.type = ActivityTypes.Event;
        response.name = TokenEvents.tokenRequestEventName;

        // set SemanticAction property of the activity properly
        this.ensureActivitySemanticAction(turnContext, response);

        // Send the tokens/request Event
        await this.sendActivities(turnContext, [response]);
    }

    public async sendRemoteFallbackEvent(turnContext: TurnContext): Promise<void> {
        // We trigger a Fallback Request from the Parent Bot by sending a "skill/fallbackRequest" event
        const response: Activity = ActivityExtensions.createReply(turnContext.activity);
        response.type = ActivityTypes.Event;
        response.name = SkillEvents.fallbackEventName;

        // set SemanticAction property of the activity properly
        this.ensureActivitySemanticAction(turnContext, response);

        // send the tokens/request Event
        await this.sendActivities(turnContext, [response]);
    }

    private ensureActivitySemanticAction(turnContext: TurnContext, activity: Partial<Activity>): void {
        if (activity === undefined || turnContext === undefined || turnContext.activity === undefined) {
            return;
        }

        // set state of semantic action based on the activity type
        if (activity.type !== ActivityTypes.Trace &&
            turnContext.activity.semanticAction !== undefined &&
            turnContext.activity.semanticAction.id !== undefined &&
            turnContext.activity.semanticAction.id !== '') {
            // if Skill's dialog didn't set SemanticAction property
            // simply copy over from the incoming activity
            if (activity.semanticAction === undefined) {
                activity.semanticAction = turnContext.activity.semanticAction;
            }

            if (activity.type === ActivityTypes.Handoff) {
                activity.semanticAction.state = SkillConstants.skillDone;
            } else {
                activity.semanticAction.state = SkillConstants.skillContinue;
            }
        }
    }

    private async sendRequest<T>(request: StreamingRequest): Promise<T|undefined> {
        try {
            const serverResponse: IReceiveResponse = await this.server.send(request);

            if (serverResponse.StatusCode === 200) {
                // MISSING: await request.ReadBodyAsJson();
                const bodyParts: string[] = await Promise.all(serverResponse.Streams.map
                ((s: ContentStream): Promise<string> => s.readAsString()));
                const body: string = bodyParts.join();

                // eslint-disable-next-line @typescript-eslint/tslint/config
                return JSON.parse(body);
            }
        } catch (error) {
            this.telemetryClient.trackException({
                // eslint-disable-next-line @typescript-eslint/tslint/config
                exception: error,
                handledAt: SkillWebSocketBotAdapter.name
            });

            throw error;
        }

        return undefined;
    }
}

async function sleep(delay: number): Promise<void> {
    return new Promise<void>((resolve: (value: void) => void): void => {
        setTimeout(resolve, delay);
    });
}

function toMilliseconds(hrtime: [number, number]): number {
    const nanoseconds: number = (hrtime[0] * 1e9) + hrtime[1];

    return nanoseconds / 1e6;
}
