/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { BotFrameworkAdapter, BotTelemetryClient, NullTelemetryClient,
    TurnContext, WebRequest, WebResponse } from 'botbuilder';
    import { Server, Socket } from 'microsoft-bot-protocol-websocket';
import { IBotSettingsBase } from 'botbuilder-solutions';
import { BotCallbackHandler } from '../activityHandler';
import { IAuthenticationProvider, MsJWTAuthenticationProvider } from '../auth';
import { SkillWebSocketBotAdapter } from './skillWebSocketBotAdapter';
import { SkillWebSocketRequestHandler } from './skillWebSocketRequestHandler';

/* PENDING - Websocket functionality
import { ISocket, WebSocketServer } from 'botframework-streaming-extensions';
import { SkillWebSocketRequestHandler } from './skillWebSocketRequestHandler';
*/

/**
 * This adapter is responsible for accepting a bot-to-bot call over websocket transport.
 * It'll perform the following tasks:
 * 1. Authentication.
 * 2. Create RequestHandler to handle follow-up websocket frames.
 * 3. Start listening on the websocket connection.
 */
export class SkillWebSocketAdapter extends BotFrameworkAdapter {
    // private readonly skillWebSocketBotAdapter: SkillWebSocketBotAdapter; PENDING - Websocket functionality
    private readonly telemetryClient: BotTelemetryClient;
    private readonly botSettingsBase: Partial<IBotSettingsBase>;
    private readonly authenticationProvider?: IAuthenticationProvider;
    private readonly botAdapter: SkillWebSocketBotAdapter;

    public constructor(
        // skillWebSocketBotAdapter: SkillWebSocketBotAdapter, PENDING - Websocket functionality
        botAdapter: SkillWebSocketBotAdapter,
        botSettingsBase: Partial<IBotSettingsBase>,
        telemetryClient?: BotTelemetryClient,
    ) {
        super();
       
        /* PENDING - Websocket functionality
        if (skillWebSocketBotAdapter === undefined) { throw new Error('skillWebSocketBotAdapter has no value'); }
        this.skillWebSocketBotAdapter = skillWebSocketBotAdapter; 
        */

        this.botAdapter = botAdapter;
        if (botSettingsBase === undefined) { throw new Error('botSettingsBase has no value'); }
        this.botSettingsBase = botSettingsBase;
        const microsoftAppId: string = this.botSettingsBase.microsoftAppId !== undefined
            ? this.botSettingsBase.microsoftAppId
            : '';
        this.authenticationProvider = new MsJWTAuthenticationProvider(microsoftAppId);
        this.telemetryClient = telemetryClient || new NullTelemetryClient();
    }

    public async processActivity(req: WebRequest, res: WebResponse, bot: (context: TurnContext) => Promise<any>): Promise<void> {
        if (req === undefined) { throw new Error('request has no value'); }
        if (res === undefined) { throw new Error('response has no value'); }
        if (bot === undefined) { throw new Error('bot has no value'); }
        
        /* PENDING - Websocket functionality
        if (!httpRequest.HttpContext.WebSockets.IsWebSocketRequest) {
            httpResponse.StatusCode = (int)HttpStatusCode.BadRequest;
            await httpResponse.WriteAsync("Upgrade to WebSocket required.").ConfigureAwait(false);
            return;
        }
        */
        await this.createWebSocketConnection(req, bot);
    }

    private async createWebSocketConnection(req: any, bot: BotCallbackHandler): Promise<void> {
        // const socket: ISocket = req.socket; PENDING - Websocket functionality
        const socket: Socket = req.socket;
        const handler: SkillWebSocketRequestHandler = new SkillWebSocketRequestHandler(this.telemetryClient);
        // const server: WebSocketServer = new WebSocketServer(socket, handler); PENDING - Websocket functionality
        const server: Server = new Server(socket, handler);
        // this.skillWebSocketBotAdapter.server = server; PENDING - Websocket functionality 
        this.botAdapter.server = server;
        handler.bot = bot;
        // handler.skillWebSocketBotAdapter = this.skillWebSocketBotAdapter; PENDING - Websocket functionality
        handler.activityHandler = this.botAdapter;

        await server.startAsync();

        /* PENDING - Websocket functionality 
        let latency: number = 0;
        try {
            const begin: [number, number] = process.hrtime();
            await server.start();
            const end: [number, number] = process.hrtime(begin);
            latency = toMilliseconds(end);

        } catch (error) {
            throw new Error('Callback failed');
        }
        const latencyMetrics: { latency: number } = { latency: latency };
        const event: string = 'Starting listening on websocket';
        this.telemetryClient.trackEvent({
            name: event,
            metrics: latencyMetrics
        });
        */
    }
}

function toMilliseconds(hrtime: [number, number]): number {
    const nanoseconds: number = (hrtime[0] * 1e9) + hrtime[1];

    return nanoseconds / 1e6;
}