/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import {
    ConversationState,
    TurnContext, 
    UserState,
    TeamsActivityHandler,
    StatePropertyAccessor, 
    Activity,
    ActivityTypes,
    BotState } from 'botbuilder';
import {
    Dialog,
    DialogContext,
    DialogSet,
    DialogState } from 'botbuilder-dialogs';
import { DialogEx, LocaleTemplateEngineManager, TokenEvents } from 'botbuilder-solutions';

export class DefaultActivityHandler<T extends Dialog> extends TeamsActivityHandler {
    private readonly conversationState: BotState;
    private readonly userState: BotState;
    private readonly solutionName: string = 'sampleAssistant';
    private readonly rootDialogId: string;
    private readonly dialogs: DialogSet;
    private readonly dialog: Dialog;
    private dialogStateAccessor: StatePropertyAccessor;
    private userProfileState: StatePropertyAccessor;
    private templateEngine: LocaleTemplateEngineManager;

    public constructor(
        conversationState: ConversationState,
        userState: UserState,
        templateEngine: LocaleTemplateEngineManager,
        dialog: T
        ) {
        super();
        this.dialog = dialog;
        this.rootDialogId = this.dialog.id;
        this.conversationState = conversationState;
        this.userState = userState;
        this.dialogStateAccessor = conversationState.createProperty<DialogState>('DialogState');
        this.templateEngine = templateEngine;
        this.dialogs = new DialogSet(this.dialogStateAccessor);
        this.dialogs.add(this.dialog);
        this.userProfileState = userState.createProperty<DialogState>('UserProfileState');

        this.onTurn(this.turn.bind(this));
        this.onMembersAdded(this.membersAdded.bind(this));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/tslint/config
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

    protected async membersAdded(turnContext: TurnContext): Promise<void> {
        let userProfile = await this.userProfileState.get(turnContext, () => { name: '' })

        if (userProfile.name === undefined || userProfile.name.trim().length === 0) {
            // Send new user intro card.
            await turnContext.sendActivity(this.templateEngine.generateActivityForLocale('NewUserIntroCard', userProfile));
        } else {
            // Send returning user intro card.
            await turnContext.sendActivity(this.templateEngine.generateActivityForLocale('ReturningUserIntroCard', userProfile));
        }
        
        return DialogEx.run(this.dialog, turnContext, this.dialogStateAccessor);
    }

    protected async onMessageActivity(turnContext: TurnContext): Promise<any> {
        return DialogEx.run(this.dialog, turnContext, this.dialogStateAccessor);
    }

    protected async onTeamsSigninVerifyState(turnContext: TurnContext): Promise<any> {
        return DialogEx.run(this.dialog, turnContext, this.dialogStateAccessor);
    }

    protected async onEventActivity(turnContext: TurnContext): Promise<any> {
        //PENDING: This should be const ev: IEventActivity = innerDc.context.activity.asEventActivity()
        // but it's not in botbuilder-js currently
        const ev: Activity = turnContext.activity;
        const value: string = ev.value?.toString();

        switch (ev.name) {
            case TokenEvents.tokenResponseEventName:
                // Forward the token response activity to the dialog waiting on the stack.
                return DialogEx.run(this.dialog, turnContext, this.dialogStateAccessor);
        
            default:
                return turnContext.sendActivity({ type: ActivityTypes.Trace, text: `Unknown Event '${ev.name ?? 'undefined' }' was received but not processed.` });
        }
    }
}
