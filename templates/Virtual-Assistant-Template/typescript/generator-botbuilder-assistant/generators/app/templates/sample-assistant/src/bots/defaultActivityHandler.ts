/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { TeamsActivityHandler, ConversationState, UserState, StatePropertyAccessor, BotTelemetryClient, TurnContext } from 'botbuilder';
import { Dialog, DialogState, DialogSet } from 'botbuilder-dialogs';
import { ChannelAccount } from 'botframework-schema';

export class DefaultActivityHandler<T extends Dialog> extends TeamsActivityHandler {
    private dialog: Dialog;
    private readonly conversationState: ConversationState;
    private readonly userState: UserState;
    private readonly telemetryClient: BotTelemetryClient;
    private dialogStateAccessor: StatePropertyAccessor;

    public constructor (        
        conversationState: ConversationState,
        userState: UserState,
        telemetryClient: BotTelemetryClient,
        dialog: T) {
        super();
        
        this.userState = userState;
        this.dialog = dialog;
        this.telemetryClient = telemetryClient;
        this.conversationState = conversationState;
        this.dialogStateAccessor = conversationState.createProperty<DialogState>('DialogState');
    }

    public async turn(turnContext: TurnContext): Promise<any> {
        await super.onTurn(turnContext);

        // Save any state changes that might have occured during the turn.
        await this.conversationState.saveChanges(turnContext, false);
        await this.userState.saveChanges(turnContext, false);
    }

    protected async onMembersAdded(membersAdded: ChannelAccount[], turnContext: () => TurnContext): Promise<any> {
        return this.dialog.run(turnContext, this.dialogStateAccessor);
    }

    protected async onMessageActivity(turnContext: () => TurnContext): Promise<any> {
        return this.dialog.run(turnContext, this.dialogStateAccessor);
    }

    protected async onTeamsSigninVerifyState(turnContext: () => TurnContext): Promise<any> {
        return this.dialog.run(turnContext, this.dialogStateAccessor);
    }

    protected async onEventActivity(turnContext: () => TurnContext): Promise<any> {
        return this.dialog.run(turnContext, this.dialogStateAccessor);
    }
}
