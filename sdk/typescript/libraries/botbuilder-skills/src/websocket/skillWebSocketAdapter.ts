/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { BotTelemetryClient, NullTelemetryClient,
    TurnContext, WebRequest, WebResponse } from 'botbuilder';
import { IBotSettingsBase} from 'botbuilder-solutions';
import { ISocket, WebSocketServer } from 'botframework-streaming-extensions';
import { BotCallbackHandler } from '../activityHandler';
import { IAuthenticationProvider, MsJWTAuthenticationProvider } from '../auth';
import { SkillWebSocketBotAdapter } from './skillWebSocketBotAdapter';
import { SkillWebSocketRequestHandler } from './skillWebSocketRequestHandler';

/**
 * This adapter is responsible for accepting a bot-to-bot call over websocket transport.
 * It'll perform the following tasks:
 * 1. Authentication.
 * 2. Create RequestHandler to handle follow-up websocket frames.
 * 3. Start listening on the websocket connection.
 */
export class SkillWebSocketAdapter {
    private readonly telemetryClient: BotTelemetryClient;
    private readonly skillWebSocketBotAdapter: SkillWebSocketBotAdapter;
    private readonly botSettingsBase: IBotSettingsBase;
    private readonly authenticationProvider?: IAuthenticationProvider;

    public constructor(
        skillWebSocketBotAdapter: SkillWebSocketBotAdapter,
        botSettingsBase: IBotSettingsBase,
        telemetryClient?: BotTelemetryClient
    ) {
        if (skillWebSocketBotAdapter === undefined) { throw new Error('skillWebSocketBotAdapter has no value'); }
        if (botSettingsBase === undefined) { throw new Error('botSettingsBase has no value'); }
        this.skillWebSocketBotAdapter = skillWebSocketBotAdapter;
        this.botSettingsBase = botSettingsBase;
        this.authenticationProvider = new MsJWTAuthenticationProvider(this.botSettingsBase.microsoftAppId);
        this.telemetryClient = telemetryClient || new NullTelemetryClient();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/tslint/config
    public async processActivity(req: WebRequest, res: WebResponse, bot: (context: TurnContext) => Promise<any>): Promise<void> {
        if (req === undefined) { throw new Error('request has no value'); }
        if (res === undefined) { throw new Error('response has no value'); }
        if (bot === undefined) { throw new Error('bot has no value'); }
        //PENDING
        // if (!httpRequest.HttpContext.WebSockets.IsWebSocketRequest)
        // {
        //     httpResponse.StatusCode = (int)HttpStatusCode.BadRequest;
        //     await httpResponse.WriteAsync("Upgrade to WebSocket required.").ConfigureAwait(false);
        //     return;
        // }
        await this.createWebSocketConnection(req, bot);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/tslint/config
    private async createWebSocketConnection(req: any, bot: BotCallbackHandler): Promise<void> {
        const socket: ISocket = req.socket;
        const handler: SkillWebSocketRequestHandler = new SkillWebSocketRequestHandler(this.telemetryClient);
        const server: WebSocketServer = new WebSocketServer(socket, handler);
        this.skillWebSocketBotAdapter.server = server;
        handler.bot = bot;
        handler.skillWebSocketBotAdapter = this.skillWebSocketBotAdapter;
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
    }
}

function toMilliseconds(hrtime: [number, number]): number {
    const nanoseconds: number = (hrtime[0] * 1e9) + hrtime[1];

    return nanoseconds / 1e6;
}
