// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { BotTelemetryClient, ConversationState, EndOfConversationCodes,
    TurnContext, UserState } from 'botbuilder';
import { DialogContext, DialogSet, DialogState, DialogTurnResult } from 'botbuilder-dialogs';
import { EndpointService } from 'botframework-config';
import { BotServices } from './botServices';
import { MainDialog } from './dialogs/main/mainDialog';

/**
 * Main entry point and orchestration for bot.
 */
export class VirtualAssistant {
    private readonly services: BotServices;
    private readonly conversationState: ConversationState;
    private readonly userState: UserState;
    private readonly endpointService: EndpointService;
    private readonly telemetryClient: BotTelemetryClient;
    private readonly dialogs: DialogSet;

    /**
     * Constructs the three pieces necessary for this bot to operate.
     */
    constructor(
        botServices: BotServices,
        conversationState: ConversationState,
        userState: UserState,
        endpointService:
        EndpointService,
        telemetryClient: BotTelemetryClient
        ) {
        if (!botServices) { throw new Error(('Missing parameter.  botServices is required')); }
        if (!conversationState) { throw new Error(('Missing parameter.  conversationState is required')); }
        if (!userState) { throw new Error(('Missing parameter.  userState is required')); }
        if (!endpointService) { throw new Error(('Missing parameter.  endpointService is required')); }
        if (!telemetryClient) { throw new Error(('Missing parameter.  telemetryClient is required')); }

        this.services = botServices;
        this.conversationState = conversationState;
        this.userState = userState;
        this.endpointService = endpointService;
        this.telemetryClient = telemetryClient;

        this.dialogs = new DialogSet(this.conversationState.createProperty<DialogState>(VirtualAssistant.name));
        this.dialogs.add(new MainDialog());
    }

    /**
     * Run every turn of the conversation. Handles orchestration of messages.
     */
    public async onTurn(turnContext: TurnContext): Promise<void> {
        // Client notifying this bot took to long to respond (timed out)
        if (turnContext.activity.code === EndOfConversationCodes.BotTimedOut) {
            this.services.telemetryClient.trackTrace({
                message: `Timeout in ${turnContext.activity.channelId} channel: Bot took too long to respond.`
            });

            return;
        }

        const dc: DialogContext = await this.dialogs.createContext(turnContext);

        if (!dc.activeDialog) {
            // tslint:disable-next-line:no-any
            const result: DialogTurnResult<any> = await dc.continueDialog();
        } else {
            await dc.beginDialog(MainDialog.name);
        }
    }
}
