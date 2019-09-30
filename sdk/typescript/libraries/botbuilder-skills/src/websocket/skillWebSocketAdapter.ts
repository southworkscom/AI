/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { BotFrameworkAdapter, BotFrameworkAdapterSettings, BotTelemetryClient, NullTelemetryClient,
    TurnContext, WebRequest, WebResponse } from 'botbuilder';
import { WebSocketServer, ISocket } from 'botframework-streaming-extensions';
import { BotCallbackHandler } from '../activityHandler';
import { IAuthenticationProvider, IAuthenticator, MsJWTAuthenticationProvider, IWhiteListAuthenticationProvider } from '../auth';
import { IBotSettingsBase} from 'botbuilder-solutions';
import { SkillWebSocketBotAdapter } from './skillWebSocketBotAdapter';
import { SkillWebSocketRequestHandler } from './skillWebSocketRequestHandler';

/**
 * This adapter is responsible for accepting a bot-to-bot call over websocket transport.
 * It'll perform the following tasks:
 * 1. Authentication.
 * 2. Create RequestHandler to handle follow-up websocket frames.
 * 3. Start listening on the websocket connection.
 */
export class SkillWebSocketAdapter extends BotFrameworkAdapter {
    private readonly authenticationProvider?: IAuthenticationProvider;
    private readonly telemetryClient: BotTelemetryClient;
    private readonly whiteListAuthenticationProvider: IWhiteListAuthenticationProvider;
    private readonly botSettings: IBotSettingsBase;
    private readonly skillWebSocketBotAdapter: SkillWebSocketBotAdapter;
    // private readonly authenticator: IAuthenticator;

    public constructor(
        skillWebSocketBotAdapter: SkillWebSocketBotAdapter,
        botSettings: IBotSettingsBase,
        whiteListAuthenticationProvider: IWhiteListAuthenticationProvider,
        telemetryClient?: BotTelemetryClient,
    ) {
        super();
        
        if (skillWebSocketBotAdapter === undefined) { throw new Error('skillWebSocketBotAdapter has no value'); }
        this.skillWebSocketBotAdapter = skillWebSocketBotAdapter;

        if (botSettings === undefined) { throw new Error('botSettings has no value'); }
        this.botSettings = botSettings;
        
        if (whiteListAuthenticationProvider === undefined) { throw new Error('whiteListAuthenticationProvider has no value'); }
        this.whiteListAuthenticationProvider = whiteListAuthenticationProvider;

        this.authenticationProvider = new MsJWTAuthenticationProvider(botSettings.microsoftAppId);
        // this.authenticator = new IAuthenticator (this.authenticationProvider, whiteListAuthenticationProvider)
        this.telemetryClient = telemetryClient || new NullTelemetryClient();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/tslint/config
    public async processActivity(req: WebRequest, res: WebResponse, logic: (context: TurnContext) => Promise<any>): Promise<void> {
        await this.createWebSocketConnection(req, logic);

    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/tslint/config
    private async createWebSocketConnection(req: any, bot: BotCallbackHandler): Promise<void> {
        // MISSING found an equivalent to websocket in TypeScript
        // eslint-disable-next-line @typescript-eslint/tslint/config
        const socket: ISocket = req.socket;
        const handler: SkillWebSocketRequestHandler = new SkillWebSocketRequestHandler(this.telemetryClient);
        const server: WebSocketServer = new WebSocketServer(socket, handler); 
        // server.disconnect + this.serverDisconnected;

        // MISSING the Server class does not exposes Disconnected handler
        // in C# server.Disconnected += Server_Disconnected;
        this.skillWebSocketBotAdapter.server = server;
        handler.bot = bot;
        handler.skillWebSocketBotAdapter = this.skillWebSocketBotAdapter;

        let latency: number = 0;
        const begin: [number, number] = process.hrtime();
        const end: [number, number] = process.hrtime(begin);
        latency = toMilliseconds(end);

        const latencyMetrics: { latency: number } = { latency: latency };
        const event: string = 'Starting listening on websocket';
        this.telemetryClient.trackEvent({
            name: event,
            metrics: latencyMetrics
        });

        await server.start();
    }

    private serverDisconnected(sender: object, e: DisconnectedEventArgs): void {
        try {
            const begin: [number, number] = process.hrtime();
            const end: [number, number] = process.hrtime(begin);
            const latency: { latency: number } = { latency: toMilliseconds(end) };
            const event: string = 'SkillWebSocketProcessRequestLatency';
            this.telemetryClient.trackEvent({
                name: event,
                metrics: latency
            });
        }
    }
}

function toMilliseconds(hrtime: [number, number]): number {
    const nanoseconds: number = (hrtime[0] * 1e9) + hrtime[1];

    return nanoseconds / 1e6;
}
