import { BotFrameworkAdapter, BotFrameworkAdapterSettings, BotTelemetryClient, NullTelemetryClient,
    TurnContext, WebRequest, WebResponse } from 'botbuilder';
import { ISocket, WebSocketServer } from 'botframework-streaming-extensions';
import { BotCallbackHandler } from '../activityHandler';
import { IAuthenticationProvider } from '../auth';
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
    private readonly botAdapter: SkillWebSocketBotAdapter;

    public constructor(
        botAdapter: SkillWebSocketBotAdapter,
        authenticationProvider?: IAuthenticationProvider,
        telemetryClient?: BotTelemetryClient,
        config?: Partial<BotFrameworkAdapterSettings>
    ) {
        super(config);
        this.botAdapter = botAdapter;
        this.authenticationProvider = authenticationProvider;
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
        // MISSING the Server class does not exposes Disconnected handler
        // in C# server.Disconnected += Server_Disconnected;
        this.botAdapter.server = server;
        handler.bot = bot;
        handler.skillWebSocketBotAdapter = this.botAdapter;

        await server.start();
    }
}
