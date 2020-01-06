/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import {
    BotFrameworkAdapter,
    BotTelemetryClient,
    RecognizerResult,
    StatePropertyAccessor, 
    UserState,
    ConversationState,
    ActivityHandler} from 'botbuilder';
import { LuisRecognizer, LuisRecognizerTelemetryClient, QnAMakerResult, QnAMakerTelemetryClient } from 'botbuilder-ai';
import {
    DialogContext,
    DialogTurnResult,
    DialogTurnStatus, 
    ActivityPrompt} from 'botbuilder-dialogs';
import {
    ISkillManifest,
    SkillContext,
    SkillDialog,
    SkillRouter } from 'botbuilder-skills';
import {
    ICognitiveModelSet,
    InterruptionAction,
    RouterDialog,
    TokenEvents } from 'botbuilder-solutions';

import { TokenStatus } from 'botframework-connector';
import {
    Activity,
    ActivityTypes } from 'botframework-schema';
import i18next from 'i18next';
import { IOnboardingState } from '../models/onboardingState';
import { CancelResponses } from '../responses/cancelResponses';
import { MainResponses } from '../responses/mainResponses';
import { BotServices } from '../services/botServices';
import { IBotSettings } from '../services/botSettings';
import { CancelDialog } from './cancelDialog';
import { EscalateDialog } from './escalateDialog';
import { OnboardingDialog } from './onboardingDialog';
import { Activity, Activity, Activity } from 'botframework-connector/lib/connectorApi/models/mappers';


export class MainDialog extends ActivityHandlerDialog {
    // Fields

    private readonly settings: Partial<IBotSettings>;
    private readonly services: BotServices;
    private onboardingDialog: OnboardingDialog;
    private switchSkillDialog: SwitchSkillDialog;
    private templateEngine: LocaleTemplateEngineManager;
    private readonly skillContext: StatePropertyAccessor<SkillContext>;
    private userProfileState: StatePropertyAccessor<UserProfileState>;
    private previousResponseAccesor: StatePropertyAccessor<[Activity]>

    // Constructor
    public constructor(
        //serviceProvider: IServiceProvider,
        telemetryClient: BotTelemetryClient
    ) {
        super(MainDialog.name, telemetryClient);
        this.settings = serviceProvider.GetService<IBotSettings>();
        this.services = serviceProvider.GetService<BotServices>();
        this.templateEngine = serviceProvider.GetService<LocaleTemplateEngineManager>();
        this.telemetryClient = telemetryClient;
        
        // Create user state properties
        let userState = serviceProvider.GetService<UserState>();
        this.userProfileState = userState.CreateProperty<this.userProfileState>(UserProfileState.name);
        this.skillContext = userState.CreateProperty<SkillContext>(SkillContext.name);

        // Create conversation state properties
        let conversationState = serviceProvider.GetService<ConversationState>();
        this.previousResponseAccesor = conversationState.CreateProperty<[Activity]>(StateProperties.PreviousBotResponse)

        // Register dialogs
        this.onboardingDialog = serviceProvider.GetService<OnboardingDialog>();
        this.switchSkillDialog = serviceProvider.GetService<SwitchSkillDialog>()
        this.addDialog(onboardingDialog);
        this.addDialog(escalateDialog);

        let skillDialogs = serviceProvider.GetService<SkillDialog>();
        skillDialogs.forEach((skillDialog: SkillDialog): void => {
            this.addDialog(skillDialog);
        });
    }

    // Runs on every turn of the conversation.
    protected async onContinueDialog(innerDc: DialogContext): Promise<DialogTurnResult> {
        if (innerDc.context.activity.type == ActivityTypes.Message)
        {
            // Get cognitive models for the current locale.
            let localizedServices = this.services.getCognitiveModel();

            // Run LUIS recognition and store result in turn state.
            let dispatchResult = await localizedServices.dispatchService.recognize(innerDc.context);
            innerDc.context.turnState.set(StateProperties.DispatchResult, dispatchResult);

            if(dispatchResult.TopIntent().intent == DispatchLuis.Intent.l_General)
            {
                // Run LUIS recognition on General model and store result in turn state.
                let generalResult = await localizedServices.luisServices.get("General")?.recognize(innerDc.context);
                innerDc.context.turnState.set(StateProperties.GeneralResult, generalResult);
            }
        }

        // Set up response caching for "repeat" functionality.
        innerDc.context.onSendActivities(storeOutgoingActivities);
        return await this.onContinueDialog(innerDc);
    }

    protected async onStart(dc: DialogContext): Promise<void> {
        const view: MainResponses = new MainResponses();
        const onboardingState: IOnboardingState|undefined = await this.onboardingAccessor.get(dc.context);
        if (onboardingState === undefined || onboardingState.name === undefined || onboardingState.name === '') {
            await view.replyWith(dc.context, MainResponses.responseIds.newUserGreeting);
        } else {
            await view.replyWith(dc.context, MainResponses.responseIds.returningUserGreeting);
        }
    }

    protected async route(dc: DialogContext): Promise<void> {
        const cognitiveModels: ICognitiveModelSet = this.services.getCognitiveModel();

        // Check dispatch result
        const dispatchResult: RecognizerResult = await cognitiveModels.dispatchService.recognize(dc.context);
        const intent: string = LuisRecognizer.topIntent(dispatchResult);

        if (this.settings.skills === undefined) {
            throw new Error('There is no skills in settings value');
        }
        // Identify if the dispatch intent matches any Action within a Skill if so, we pass to the appropriate SkillDialog to hand-off
        const identifiedSkill: ISkillManifest | undefined = SkillRouter.isSkill(this.settings.skills, intent);
        if (identifiedSkill !== undefined) {
            // We have identified a skill so initialize the skill connection with the target skill
            const result: DialogTurnResult = await dc.beginDialog(identifiedSkill.id);

            if (result.status === DialogTurnStatus.complete) {
                await this.complete(dc);
            }
        } else if (intent === 'l_general') {
            // If dispatch result is general luis model
            const luisService: LuisRecognizerTelemetryClient | undefined = cognitiveModels.luisServices.get(this.luisServiceGeneral);
            if (luisService === undefined) {
                throw new Error('The specified LUIS Model could not be found in your Bot Services configuration.');
            } else {
                const result: RecognizerResult = await luisService.recognize(dc.context);
                if (result !== undefined) {
                    const generalIntent: string = LuisRecognizer.topIntent(result);

                    // switch on general intents
                    switch (generalIntent) {
                        case 'Escalate': {
                            // start escalate dialog
                            await dc.beginDialog(EscalateDialog.name);
                            break;
                        }
                        case 'None':
                        default: {
                            // No intent was identified, send confused message
                            await this.responder.replyWith(dc.context, MainResponses.responseIds.confused);
                        }
                    }
                }
            }
        } else if (intent === 'q_faq') {
            const qnaService: QnAMakerTelemetryClient | undefined = cognitiveModels.qnaServices.get(this.luisServiceFaq);

            if (qnaService === undefined) {
                throw new Error('The specified QnA Maker Service could not be found in your Bot Services configuration.');
            } else {
                const answers: QnAMakerResult[] = await qnaService.getAnswers(dc.context);
                if (answers !== undefined && answers.length > 0) {
                    await dc.context.sendActivity(answers[0].answer, answers[0].answer);
                } else {
                    await this.responder.replyWith(dc.context, MainResponses.responseIds.confused);
                }
            }
        } else if (intent === 'q_chitchat') {
            const qnaService: QnAMakerTelemetryClient | undefined = cognitiveModels.qnaServices.get(this.luisServiceChitchat);

            if (qnaService === undefined) {
                throw new Error('The specified QnA Maker Service could not be found in your Bot Services configuration.');
            } else {
                const answers: QnAMakerResult[] = await qnaService.getAnswers(dc.context);
                if (answers !== undefined && answers.length > 0) {
                    await dc.context.sendActivity(answers[0].answer, answers[0].answer);
                } else {
                    await this.responder.replyWith(dc.context, MainResponses.responseIds.confused);
                }
            }
        } else {
            // If dispatch intent does not map to configured models, send 'confused' response.
            await this.responder.replyWith(dc.context, MainResponses.responseIds.confused);
        }
    }

    protected async onEvent(dc: DialogContext): Promise<void> {
        // Check if there was an action submitted from intro card
        if (dc.context.activity.value) {
            if (dc.context.activity.value.action === 'startOnboarding') {
                await dc.beginDialog(OnboardingDialog.name);

                return;
            }
        }

        let forward: boolean = true;
        const ev: Activity = dc.context.activity;
        if (ev.name !== undefined && ev.name.trim().length > 0) {
            switch (ev.name) {
                case Events.timeZoneEvent: {
                    try {
                        const timezone: string = ev.value as string;
                        const tz: string = new Date().toLocaleString(timezone);
                        const timeZoneObj: {
                            timezone: string;
                        } = {
                            timezone: tz
                        };

                        const skillContext: SkillContext = await this.skillContextAccessor.get(dc.context, new SkillContext());
                        skillContext.setObj(timezone, timeZoneObj);

                        await this.skillContextAccessor.set(dc.context, skillContext);
                    } catch {
                        await dc.context.sendActivity(
                            {
                                type: ActivityTypes.Trace,
                                text: `"Timezone passed could not be mapped to a valid Timezone. Property not set."`
                            }
                        );
                    }
                    forward = false;
                    break;
                }
                case Events.locationEvent: {
                    const location: string = ev.value as string;
                    const locationObj: {
                        location: string;
                    } = {
                        location: location
                    };

                    const skillContext: SkillContext = await this.skillContextAccessor.get(dc.context, new SkillContext());
                    skillContext.setObj(location, locationObj);

                    await this.skillContextAccessor.set(dc.context, skillContext);

                    forward = true;
                    break;
                }
                case TokenEvents.tokenResponseEventName: {
                    forward = true;
                    break;
                }
                default: {
                    await dc.context.sendActivity(
                        {
                            type: ActivityTypes.Trace,
                            text: `"Unknown Event ${ ev.name } was received but not processed."`
                        }
                    );
                    forward = false;
                }
            }
        }

        if (forward) {
            const result: DialogTurnResult = await dc.continueDialog();

            if (result.status === DialogTurnStatus.complete) {
                await this.complete(dc);
            }
        }
    }

    protected async complete(dc: DialogContext, result?: DialogTurnResult): Promise<void> {
        // The active dialog's stack ended with a complete status
        await this.responder.replyWith(dc.context, MainResponses.responseIds.completed);
    }

    // Runs on every turn of the conversation to check if the conversation should be interrupted.
    protected async onInterruptDialog(dc: DialogContext): Promise<InterruptionAction> {

        let activity = dc.context.activity;
        let userProfile = await this.userProfileState.get(dc.context, () => new UserProfileState());
        let dialog = dc.activeDialog?.id != null ? dc.findDialog(dc.activeDialog?.id) : null;

        if (activity.type === ActivityTypes.Message) {

            // Check if the active dialog is a skill for conditional interruption.
            let isSkill = dialog as SkillDialog;

            // Get Dispatch LUIS result from turn state.
            let dispatchResult = dc.context.turnState.get(StateProperties.DispatchResult);

            let dispatch: [string, number] = dispatchResult.topIntent();
            let dispatchIntent: string = dispatch[0];
            let dispatchScore: number = dispatch[1];
             // Check if we need to switch skills.
             if(isSkill){

                if(dispatchIntent.toString() != dialog?.id && dispatchScore > 0.9){

                    let identifiedSkill = SkillRouter.isSkill(this.settings.skills, dispatchResult.topIntent().intent.toString());

                    if(identifiedSkill){
                        let prompt = this.templateEngine.generateActivityForLocale('SkillSwitchPrompt', new { Skill = identifiedSkill.name });
                        await dc.beginDialog(this.switchSkillDialog.id, new SwitchSkillDialog(prompt, identifiedSkill));
                        return InterruptionAction.waiting;
                    }
                }
            }

            if(dispatchIntent == dispatch.Intent.l_general)
            {

                // Get connected LUIS result from turn state.
                let generalResult = dc.context.turnState.get(StateProperties.GeneralResult);
                let general: [string, number] = generalResult.topIntent();
                let generalIntent: string = general[0];
                let generalScore: number = general[1];

                 if(generalScore > 0.5){

                    switch(generalIntent)
                    {
                        case GeneralLuis.Intent.Cancel: { 
                            // Suppress completion message for utility functions.
                            dc.SuppressCompletionMessage(true);

                            await dc.context.sendActivity(this.templateEngine.generateActivityForLocale('CancelledMessage', userProfile));
                            await dc.cancelAllDialogs();
                            return InterruptionAction.End;
                        } 

                        case GeneralLuis.Intent.Escalate: {
                            await dc.context.sendActivity(this,this.templateEngine.generateActivityForLocale('EscalateMessage', userProfile));
                            return InterruptionAction.Resume;
                        }

                        case GeneralLuis.Intent.Help: {
                            // Suppress completion message for utility functions.
                            dc.SuppressCompletionMessage(true);

                            if(isSkill)
                            {
                                // If current dialog is a skill, allow it to handle its own help intent.
                                await dc.continueDialog();
                                break;
                            }
                            else{
                                await dc.context.sendActivity(this.templateEngine.generateActivityForLocale('HelpCard', userProfile));
                                return InterruptionAction.Resume;
                            }
                        }

                        case GeneralLuis.Intent.Logout: {
                            
                            // Suppress completion message for utility functions.
                            dc.SuppressCompletionMessage(true);

                            // Log user out of all accounts.
                            await LogUserOut(dc);
                            
                            await dc.context.sendActivity(this.templateEngine.generateActivityForLocale('LogoutMessage', userProfile));
                            return InterruptionAction.End;
                        }

                        case GeneralLuis.Intent.Repeat: {
                            // No need to send the usual dialog completion message for utility capabilities such as these.
                            dc.SuppressCompletionMessage(true);

                            // Sends the activities since the last user message again.
                            let previousResponse = await this.previousResponseAccesor.get(dc.context, () => new [Activity()]);

                            for (const response of previousResponse) {

                                // Reset id of original activity so it can be processed by the channel.
                                response.id = '';
                                await dc.context.sendActivity(response);
                              }

                            return InterruptionAction.Waiting;
                        }

                        case GeneralLuis.Intent.StartOver: {
                            
                            // Suppresss completion message for utility functions.
                            dc.SuppressCompletionMessage(true);

                            await dc.context.sendActivity(this.templateEngine.generateActivityForLocale('StartOverMessage', userProfile))

                            // Cancel all dialogs on the stack.
                            await dc.cancelAllDialogs();
                            return InterruptionAction.End;

                        }

                        case GeneralLuis.Intent.Stop: {

                             // Use this intent to send an event to your device that can turn off the microphone in speech scenarios.
                             break;
                        }
                    }
                }
            }
        }

        return InterruptionAction.NoAction;
    }

    // Runs when the dialog stack is empty, and a new member is added to the conversation. Can be used to send an introduction activity.
    protected async onMembersAddedAsync(innerDc: DialogContext): Promise<void> {

        let userProfile = await this.userProfileState.get(innerDc.context, () => new UserProfileState());

        if (userProfile.name || userProfile != undefined){

            // Send new user intro card.
            await innerDc.context.sendActivity(this.templateEngine.generateActivityForLocale('NewUserIntroCard', userProfile));

            // Start onboarding dialog.
            await innerDc.beginDialog(OnboardingDialog.name);
        }
        else{

            // Send returning user intro card.
            await innerDc.context.sendActivity(this.templateEngine.generateActivityForLocale('ReturningUserIntroCard', userProfile));
        }

        // Suppress completion message.
        innerDc.SuppressCompletionMessage(true);
    }

    protected async onMessageActivityAsync(innerDc: DialogContext): Promise<void> {

        let activity = innerDc.context.activity.asMessageActivity();
        let userProfile = await this.userProfileState.get(innerDc.context, () => new UserProfileState());

        if (activity.text || activity != undefined){

            // Get current cognitive models for the current locale.
            let localizedServices: ICognitiveModelSet = this.services.getCognitiveModel();

            // Get dispatch result from turn state.
            let dispatchResult = innerDc.context.turnState.get(StateProperties.DispatchResult);

            let dispatch: [string, number] = dispatchResult.topIntent();
            let dispatchIntent: string = dispatch[0];
            let dispatchScore: number = dispatch[1];

            // Check if the dispatch intent maps to a skill.
            let identifiedSkill = SkillRouter.isSkill(this.settings.skills, dispatchIntent.toString());

            if(identifiedSkill){

                // Start the skill dialog.
                await innerDc.beginDialog(identifiedSkill.id);
            }
            else if (dispatchIntent === DispatchLuis.Intent.q_faq){
                await CallQnaMaker(innerDc, localizedServices.qnaServices['Faq']);
            }
            else if (dispatchIntent === DispatchLuis.Intent.q_chitchat){
                innerDc.SuppressCompletionMessage(true);

                await CallQnaMaker(innerDc, localizedServices.qnaServices['Chitchat']);
            }
            else{
                innerDc.SuppressCompletionMessage(true);
                await innerDc.context.sendActivity(this.templateEngine.generateActivityForLocale('UnsupportedMessage',userProfile));
            }
        }
    }

    protected async OnEventActivityAsync(innerDc: DialogContext): Promise<void> {

        let ev = innerDc.context.activity.asEventActivity();
        let value = ev.value?.toString();

        switch (ev.name){

            case Events.Location:{

                let locationObj = new JObject();
                locationObj.Add(StateProperties.Location, JToken.FromObject(value));

                // Store location for use by skills.
                let skillContext = await this.skillContext.get(innerDc.context, () => new SkillContext());
                skillContext[StateProperties.location] = locationObj;

                break;
            }

            case EventSource.TimeZone: {
                try {
                    let timeZoneInfo = await this.skillContext.get(innerDc.context, () => new SkillContext());
                    let timeZoneObj = new JObject();
                    timeZoneObj.Add(StateProperties.TimeZone, JToken.FromObject(timeZoneInfo));

                    // Store location for use by skills.
                    let skillContext = await this.skillContext.get(innerDc.context, () => new SkillContext());
                    skillContext[StateProperties.TimeZone] = timeZoneObj;
                    await this.skillContext.set(innerDc.context, skillContext);
                }
                catch{
                    await innerDc.context.sendActivity(new Activity(type: ActivityTypes.Trace, text: 'Received time zone could not be parsed. Property not set.'));
                }

                break;
            }

            case TokenEvents.tokenResponseEventName: {
                // Forward the token response activity to the dialog waiting on the stack.
                await innerDc.continueDialog();
                break;
            }

            default: {
                await innerDc.context.sendActivity(new Activity(type:ActivityTypes.Trace, text:`Unknown Event ${ev.name ?? 'undefined'} was received but not processed.`));
            }
        }
    }

    private async onCancel(dc: DialogContext): Promise<InterruptionAction> {
        if (dc.activeDialog !== undefined && dc.activeDialog.id !== CancelDialog.name) {
            // Don't start restart cancel dialog
            await dc.beginDialog(CancelDialog.name);

            // Signal that the dialog is waiting on user response
            return InterruptionAction.StartedDialog;
        }

        const view: CancelResponses = new CancelResponses();
        await view.replyWith(dc.context, CancelResponses.responseIds.nothingToCancelMessage);

        return InterruptionAction.StartedDialog;
    }

    private async onHelp(dc: DialogContext): Promise<InterruptionAction> {
        await this.responder.replyWith(dc.context, MainResponses.responseIds.help);

        // Signal the conversation was interrupted and should immediately continue
        return InterruptionAction.MessageSentToUser;
    }

    private async onLogout(dc: DialogContext): Promise<InterruptionAction> {
        let adapter: BotFrameworkAdapter;
        const supported: boolean = dc.context.adapter instanceof BotFrameworkAdapter;
        if (!supported) {
            throw new Error('OAuthPrompt.SignOutUser(): not supported by the current adapter');
        } else {
            adapter = dc.context.adapter as BotFrameworkAdapter;
        }

        await dc.cancelAllDialogs();

        // Sign out user
        // PENDING check adapter.getTokenStatusAsync
        const tokens: TokenStatus[] = [];
        tokens.forEach(async (token: TokenStatus): Promise<void> => {
            if (token.connectionName !== undefined) {
                await adapter.signOutUser(dc.context, token.connectionName);
            }
        });
        await dc.context.sendActivity(i18next.t('main.logOut'));

        return InterruptionAction.StartedDialog;
    }
}
