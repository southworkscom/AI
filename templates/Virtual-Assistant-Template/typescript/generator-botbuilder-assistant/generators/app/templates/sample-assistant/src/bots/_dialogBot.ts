/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import {
    ActivityHandler,
    BotTelemetryClient,
    ConversationState,
    EndOfConversationCodes,
    Severity,
    TurnContext,
    BotState } from 'botbuilder';
import {
    Dialog,
    DialogContext,
    DialogSet,
    DialogState } from 'botbuilder-dialogs';

export class DialogBot<T extends Dialog> extends ActivityHandler {
    private readonly telemetryClient: BotTelemetryClient;
    private readonly conversationState: BotState;
    private readonly userState: BotState;
    private readonly solutionName: string = '<%=assistantNameCamelCase%>';
    private readonly rootDialogId: string;
    private readonly dialogs: DialogSet;
    private readonly dialog: Dialog;

    public constructor(
        conversationState: ConversationState,
        userState: ConversationState,
        telemetryClient: BotTelemetryClient,
        dialog: T) {
        super();

        this.rootDialogId = dialog.id;
        this.dialog = dialog;
        this.telemetryClient = telemetryClient;
        this.conversationState = conversationState;
        this.userState = userState;
        this.dialogs = new DialogSet(conversationState.createProperty<DialogState>(this.solutionName));
        this.dialogs.add(dialog);

        this.onTurn(this.turn.bind(this));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/tslint/config
    public async turn(turnContext: TurnContext, next: () => Promise<void>): Promise<any> {
        // Client notifying this bot took to long to respond (timed out)
        if (turnContext.activity.code === EndOfConversationCodes.BotTimedOut) {
            this.telemetryClient.trackTrace({
                message: `Timeout in ${ turnContext.activity.channelId } channel: Bot took too long to respond`,
                severityLevel: Severity.Information
            });

            return;
        }

        // PENDING: we should remove these lines to use only this.dialog.run()
        const dc: DialogContext = await this.dialogs.createContext(turnContext);

        if (dc.activeDialog !== undefined) {
            await dc.continueDialog();
        } else {
            await dc.beginDialog(this.rootDialogId);
        }

        // PENDING: the method run doesn't exist in the Dialog class, we leave this in pending
        // await this.dialog.run(turnContext, this.conversationState.createProperty<DialogState>());

        // Save any state changes that might have occured during the turn.
        await this.conversationState.saveChanges(turnContext, false);
        await this.userState.saveChanges(turnContext, false);

        await next();
    }
}
