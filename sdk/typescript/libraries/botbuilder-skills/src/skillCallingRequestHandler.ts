/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { BotTelemetryClient, TurnContext } from 'botbuilder';
import { TokenEvents } from 'botbuilder-solutions';
import { Activity, ActivityTypes, ResourceResponse } from 'botframework-schema';
import { ContentStream, ReceiveRequest, HttpContent, RequestHandler, Response } from 'microsoft-bot-protocol';
// import { ContentStream, HttpContent, IReceiveRequest, RequestHandler, StreamingResponse } from 'botframework-streaming-extensions'; PENDING - Websocket functionality
import { SkillEvents } from './models';
import { IRouteContext, IRouteTemplate, Router } from './protocol';

export declare type ActivityAction = (activity: Activity) => void;

export class SkillCallingRequestHandler extends RequestHandler {
    private readonly router: Router;
    private readonly turnContext: TurnContext;
    private readonly telemetryClient: BotTelemetryClient;
    private readonly tokenRequestHandler?: ActivityAction;
    private readonly fallbackRequestHandler?: ActivityAction;
    private readonly handoffActivityHandler?: ActivityAction;

    public constructor(
        turnContext: TurnContext,
        telemetryClient: BotTelemetryClient,
        tokenRequestHandler?: ActivityAction,
        handoffActivityHandler?: ActivityAction,
        fallbackRequestHandler?: ActivityAction
    ) {
        super();
        if (turnContext === undefined) { throw new Error('Value of \'turnContext\' is null'); }

        this.turnContext = turnContext;
        this.telemetryClient = telemetryClient;
        this.tokenRequestHandler = tokenRequestHandler;
        this.fallbackRequestHandler = fallbackRequestHandler;
        this.handoffActivityHandler = handoffActivityHandler;

        const postRoute: IRouteTemplate = {
            method: 'POST',
            path: '/activities/{activityId}',
            action: {
                action: async (request: ReceiveRequest, routeData: Object): Promise<object|undefined> => {
                    // MISSING Check response converter
                    const bodyParts: string[] = await Promise.all(request.Streams.map
                    ((s: ContentStream): Promise<string> => s.readAsJson()));
                    const body: string = bodyParts.join();
                    const activity: Activity = <Activity> JSON.parse(body);
                    if (activity !== undefined) {
                        if (activity.type === ActivityTypes.Event && activity.name === TokenEvents.tokenRequestEventName) {
                            if (this.tokenRequestHandler !== undefined) {
                                this.tokenRequestHandler(activity);

                                return { id: '' };
                            } else {
                                throw new Error('TokenRequestHandler: Skill is requesting for token but there\'s no handler on the calling side!');
                            }
                        } else if (activity.type === ActivityTypes.Event && activity.name === SkillEvents.fallbackEventName) {
                            if (this.fallbackRequestHandler !== undefined) {
                                this.fallbackRequestHandler(activity);

                                return { id: '' };
                            } else {
                                throw new Error('FallbackRequestHandler: Skill is asking for fallback but there is no handler on the calling side!');
                            }
                        } else if (activity.type === ActivityTypes.Handoff) {
                            await this.turnContext.sendActivity(activity);
                            if (this.handoffActivityHandler !== undefined) {
                                this.handoffActivityHandler(activity);

                                return { id: '' };
                            } else {
                                throw new Error('HandoffActivityHandler: Skill is sending handoff activity but there\'s no handler on the calling side!');
                            }
                        } else {
                            return this.turnContext.sendActivity(activity);
                        }
                    } else {
                        throw new Error('Error deserializing activity response!');

                    }
                }
            }
        };

        const putRoute: IRouteTemplate = {
            method: 'PUT',
            path: '/activities/{activityId}',
            action: {
                action: async (request: ReceiveRequest, routeData: Object): Promise<object|undefined> => {
                    // MISSING Check response converter
                    const bodyParts: string[] = await Promise.all(
                        request.Streams.map((s: ContentStream): Promise<string> => s.readAsJson()));
                    const body: string = bodyParts.join();
                    const activity: Activity = <Activity> JSON.parse(body);
                    await this.turnContext.updateActivity(activity);

                    // MISSING this method should return the result of updateActivity
                    return undefined;
                }
            }
        };

        const deleteRoute: IRouteTemplate = {
            method: 'DELETE',
            path: '/activities/{activityId}',
            action: {
                action: async (request: ReceiveRequest, routeData: Object): Promise<object|undefined> => {
                    // MISSING Check response converter
                    const activityIdProp: [string, string]|undefined = Object.entries(routeData)
                        .find((e: [string, string]): boolean => e[0] === 'activityId');
                    const activityId: string = activityIdProp ? activityIdProp[1] : '';
                    await this.turnContext.deleteActivity(activityId);

                    // MISSING this method should return the result of updateActivity
                    return undefined;
                }
            }
        };

        const routes: IRouteTemplate[] = [postRoute, putRoute, deleteRoute];
        this.router = new Router(routes);
    }

    // eslint-disable-next-line @typescript-eslint/tslint/config, @typescript-eslint/no-explicit-any
    public async processRequestAsync(request: ReceiveRequest, context: Object, logger?: any): Promise<Response> {
        const routeContext: IRouteContext|undefined = this.router.route(request);
        if (routeContext !== undefined) {
            try {
                const responseBody: HttpContent = <HttpContent> await routeContext.action.action(request, routeContext.routerData);
                // MISSING Response.OK(new StringContent(JsonConvert.SerializeObject(responseBody...
                // return StreamingResponse.create(200, responseBody); PENDING - Websocket functionality
                const response: Response = Response.create(200);
                response.setBody(responseBody);

                return response;
            } catch (error) {
                // tslint:disable-next-line:no-unsafe-any
                this.telemetryClient.trackException({ exception: error });

                return Response.create(500);
                // return StreamingResponse.create(500); PENDING - Websocket functionality
            }
        } else {
            return Response.create(404);
            // return StreamingResponse.create(404); PENDING - Websocket functionality
        }
    }
}
