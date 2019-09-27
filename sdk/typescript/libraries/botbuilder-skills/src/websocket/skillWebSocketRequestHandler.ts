/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { BotTelemetryClient, InvokeResponse } from 'botbuilder';
import { Activity } from 'botframework-schema';
import { ContentStream, IReceiveRequest, RequestHandler, StreamingResponse } from 'botframework-streaming-extensions';
import { BotCallbackHandler, IActivityHandler } from '../activityHandler';

export class SkillWebSocketRequestHandler extends RequestHandler {
    private readonly botTelemetryClient: BotTelemetryClient;
    public bot!: BotCallbackHandler;
    public skillWebSocketBotAdapter!: IActivityHandler;

    public constructor(botTelemetryClient: BotTelemetryClient) {
        super();
        this.botTelemetryClient = botTelemetryClient;
    }

    // eslint-disable-next-line @typescript-eslint/tslint/config, @typescript-eslint/no-explicit-any
    public async processRequest(request: IReceiveRequest, logger?: any, context?: object): Promise<StreamingResponse> {
        if (this.bot === undefined) { throw new Error(('Missing parameter.  "bot" is required')); }
        if (this.skillWebSocketBotAdapter === undefined) { throw new Error(('Missing parameter.  "activityHandler" is required')); }

        const response: StreamingResponse = new StreamingResponse();
        // MISSING: await request.readBodyAsString();
        const bodyParts: string[] = await Promise.all(request.streams.map((s: ContentStream): Promise<string> => s.readAsString()));
        const body: string = bodyParts.join();

        if (body === undefined || request.streams.length === 0) {
            response.statusCode = 400;
            response.setBody('Empty request body.');

            return response;
        }

        if (request.streams.some((x: ContentStream): boolean => x.contentType !== 'application/json; charset=utf-8')) {
            response.statusCode = 406;

            return response;
        }

        let activity: Activity;

        try {
            activity = <Activity> JSON.parse(body);

        } catch (error) {
            // tslint:disable-next-line:no-unsafe-any
            this.botTelemetryClient.trackException({ exception: error });
            response.statusCode = 400;
            response.setBody('Request body is not an Activity instance.');

            return response;
        }

        try {
            const begin: [number, number] = process.hrtime();
            const invokeResponse: InvokeResponse = await this.skillWebSocketBotAdapter.processActivity(activity, this.bot);
            const end: [number, number] = process.hrtime(begin);

            const latency: { latency: number } = { latency: toMilliseconds(end) };

            const event: string = 'SkillWebSocketProcessRequestLatency';
            this.botTelemetryClient.trackEvent({
                name: event,
                metrics: latency
            });

            if (invokeResponse === undefined) {
                response.statusCode = 200;
            } else {
                response.statusCode = invokeResponse.status;
                if (invokeResponse.body) {
                    response.setBody(invokeResponse.body);
                }
            }
        } catch (error) {
            // eslint-disable-next-line @typescript-eslint/tslint/config
            this.botTelemetryClient.trackException({ exception: error });
            response.statusCode = 500;
            response.setBody('Error');

            return response;
        }

        return response;
    }
}

function toMilliseconds(hrtime: [number, number]): number {
    const nanoseconds: number = (hrtime[0] * 1e9) + hrtime[1];

    return nanoseconds / 1e6;
}
