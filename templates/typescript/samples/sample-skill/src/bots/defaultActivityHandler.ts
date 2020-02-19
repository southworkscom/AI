/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import {
    ActivityHandler,
    TurnContext,
    BotState,
    StatePropertyAccessor } from 'botbuilder';
import {
    Dialog,
    DialogState, 
    DialogContext,
    DialogSet } from 'botbuilder-dialogs';

export class DefaultActivityHandler<T extends Dialog> extends ActivityHandler {
    private readonly conversationState: BotState;
    private readonly userState: BotState;
    private dialogStateAccesor: StatePropertyAccessor<DialogState>;

    private readonly dialogs: DialogSet;
    private readonly rootDialogId: string;

    public constructor(
        conversationState: BotState,
        userState: BotState,
        dialog: T
    ) {
        super();

        this.rootDialogId = dialog.id;
        
        this.conversationState = conversationState;
        this.userState = userState;
        this.dialogStateAccesor = conversationState.createProperty<DialogState>('DialogState');

        this.dialogs = new DialogSet(this.dialogStateAccesor);
        this.dialogs.add(dialog);
        this.onTurn(this.turn.bind(this));
        this.onMembersAdded(this.membersAdded.bind(this));
        
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public async turn(turnContext: TurnContext, next: () => Promise<void>): Promise<any> {

        super.onTurn(next);

        const dc: DialogContext = await this.dialogs.createContext(turnContext);

        if (dc.activeDialog !== undefined) {
            await dc.continueDialog();
        } else {
            await dc.beginDialog(this.rootDialogId);
        }
        // Save any state changes that might have occured during the turn.
        await this.conversationState.saveChanges(turnContext, false);
        await this.userState.saveChanges(turnContext, false);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected async membersAdded(turnContext: TurnContext, next: () => Promise<void>): Promise<any> {
        
        const dc: DialogContext = await this.dialogs.createContext(turnContext);

        if (dc.activeDialog !== undefined) {
            return await dc.continueDialog();
        } else {
            return await dc.beginDialog(this.rootDialogId);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected async onMessageActivity(turnContext: TurnContext): Promise<any> {
        const dc: DialogContext = await this.dialogs.createContext(turnContext);

        if (dc.activeDialog !== undefined) {
            return await dc.continueDialog();
        } else {
            return await dc.beginDialog(this.rootDialogId);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected async onEventActivity(turnContext: TurnContext): Promise<any> {
        const dc: DialogContext = await this.dialogs.createContext(turnContext);

        if (dc.activeDialog !== undefined) {
            return await dc.continueDialog();
        } else {
            return await dc.beginDialog(this.rootDialogId);
        }
    }
    
}
