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
    ActivityTypes} from 'botbuilder';
import {
    Dialog,
    DialogContext,
    DialogSet,
    DialogState } from 'botbuilder-dialogs';
import { DialogEx, LocaleTemplateEngineManager, TokenEvents } from 'botbuilder-solutions';

export class DefaultActivityHandler<T extends Dialog> extends TeamsActivityHandler {
    private readonly solutionName: string = 'sampleAssistant';
    private readonly rootDialogId: string;
    private readonly dialogs: DialogSet;
    private readonly dialog: Dialog;
    private dialogStateAccessor: StatePropertyAccessor;
    private userProfileState: StatePropertyAccessor;
    private engineTemplate: TemplateManager;

    public constructor(
        conversationState: ConversationState,
        userState: UserState,
        dialog: T,
        templateEngine: LocaleTemplateEngineManager) {
        super();

        this.dialog = dialog;
        this.rootDialogId = this.dialog.id;
        this.dialogs = new DialogSet(conversationState.createProperty<DialogState>(this.solutionName));
        this.dialogs.add(this.dialog);
        this.dialogStateAccessor = conversationState.createProperty<DialogState>('DialogState');
        this.userProfileState = userState.createProperty<DialogState>('UserProfileState');
        this.engineTemplate = templateEngine;
        this.onTurn(this.turn.bind(this));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/tslint/config
    public async turn(turnContext: TurnContext, next: () => Promise<void>): Promise<any> {
        const dc: DialogContext = await this.dialogs.createContext(turnContext);

        if (dc.activeDialog !== undefined) {
            await dc.continueDialog();
        } else {
            await dc.beginDialog(this.rootDialogId);
        }

        await next();
    }

    protected async onTeamsMembersAdded(turnContext: TurnContext): Promise<void> {
        let userProfile = await this.userProfileState.get(turnContext, () => { name: '' })

        if( userProfile.name === '' ) {
            // Send new user intro card.
            await turnContext.sendActivity(this.engineTemplate.generateActivityForLocale('NewUserIntroCard', userProfile));
        } else {
            // Send returning user intro card.
            await turnContext.sendActivity(this.engineTemplate.generateActivityForLocale('ReturningUserIntroCard', userProfile));
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
