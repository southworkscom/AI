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
    ActivityHandler,
    IUserTokenProvider,
    TurnContext} from 'botbuilder';
import { LuisRecognizer, LuisRecognizerTelemetryClient, QnAMakerResult, QnAMakerTelemetryClient, QnAMaker } from 'botbuilder-ai';
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
    TokenEvents, 
    isRemoteUserTokenProvider} from 'botbuilder-solutions';

import { TokenStatus } from 'botframework-connector';
import {
    Activity,
    ActivityTypes, 
    ResourceResponse} from 'botframework-schema';
import i18next from 'i18next';
import { IOnboardingState } from '../models/onboardingState';
import { CancelResponses } from '../responses/cancelResponses';
import { MainResponses } from '../responses/mainResponses';
import { BotServices } from '../services/botServices';
import { IBotSettings } from '../services/botSettings';
import { CancelDialog } from './cancelDialog';
import { EscalateDialog } from './escalateDialog';
import { OnboardingDialog } from './onboardingDialog';

enum Events {
    location = 'VA.Location',
    timeZone = 'VA.Timezone'
}

enum stateProperties{
        
    dispatchResult = "dispatchResult",
    generalResult = "generalResult",
    previousBotResponse = "previousBotResponse",
    location = "location",
    timeZone = "timezone"
}

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
        serviceProvider: IServiceProvider,
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
        this.previousResponseAccesor = conversationState.CreateProperty<[Activity]>(stateProperties.previousBotResponse)

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
            innerDc.context.turnState.set(stateProperties.dispatchResult, dispatchResult);

            if(dispatchResult.TopIntent().intent == DispatchLuis.Intent.l_General)
            {
                // Run LUIS recognition on General model and store result in turn state.
                let generalResult = await localizedServices.luisServices.get("General")?.recognize(innerDc.context);
                innerDc.context.turnState.set(stateProperties.generalResult, generalResult);
            }
        }

        // Set up response caching for "repeat" functionality.
        innerDc.context.onSendActivities(this.storeOutgoingActivities);
        return await this.onContinueDialog(innerDc);
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
            let dispatchResult = dc.context.turnState.get(stateProperties.dispatchResult);

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
                let generalResult = dc.context.turnState.get(stateProperties.generalResult);
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
                            await this.logUserOut(dc);
                            
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
    protected async onMembersAdded(innerDc: DialogContext): Promise<void> {

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

    protected async onMessageActivity(innerDc: DialogContext): Promise<void> {

        let activity = innerDc.context.activity.asMessageActivity();
        let userProfile = await this.userProfileState.get(innerDc.context, () => new UserProfileState());

        if (activity.text || activity != undefined){

            // Get current cognitive models for the current locale.
            let localizedServices: ICognitiveModelSet = this.services.getCognitiveModel();

            // Get dispatch result from turn state.
            let dispatchResult = innerDc.context.turnState.get(stateProperties.dispatchResult);

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
                await this.callQnaMaker(innerDc, localizedServices.qnaServices.get('Faq'));
            }
            else if (dispatchIntent === DispatchLuis.Intent.q_chitchat){
                innerDc.SuppressCompletionMessage(true);

                await this.callQnaMaker(innerDc, localizedServices.qnaServices.get('Chitchat'));
            }
            else{
                innerDc.SuppressCompletionMessage(true);
                await innerDc.context.sendActivity(this.templateEngine.generateActivityForLocale('UnsupportedMessage',userProfile));
            }
        }
    }

    protected async OnEventActivity(innerDc: DialogContext): Promise<void> {

        let ev = innerDc.context.activity.asEventActivity();
        let value = ev.value?.toString();

        switch (ev.name){

            case Events.location:{

                let locationObj = {location: Object};
                locationObj.location = value;

                // Store location for use by skills.
                let skillContext = await this.skillContext.get(innerDc.context, () => new SkillContext());
                skillContext.setObj(stateProperties.location, locationObj);
                await this.skillContext.set(innerDc.context, skillContext);

                break;
            }

            case Events.timeZone: {
                try {
                    let timeZoneInfo = await this.skillContext.get(innerDc.context, () => new SkillContext());
                    let timeZoneObj = {timezone: Object};
                    timeZoneObj.timezone = timeZoneInfo;

                    // Store location for use by skills.
                    let skillContext = await this.skillContext.get(innerDc.context, () => new SkillContext());
                    skillContext.setObj(stateProperties.timeZone, timeZoneObj);
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

    protected async onUnhandledActivityType(innerDc: DialogContext): Promise<void> {
        await innerDc.context.sendActivity(new Activity(type: ActivityTypes.Trace, text: 'Unknown activity was received but not processed.'));
    }

    protected async onDialogComplete(outerDc: DialogContext, result :Object): Promise<void> {
        let userProfile = await this.userProfileState.get(outerDc.context, () => new UserProfileState());

        // Only send a completion message if the user sent a message activity.
        if (outerDc.context.activity.type === ActivityTypes.Message && !outerDc.SuppressCompletionMessage()){
            await outerDc.context.sendActivity(this.templateEngine.generateActivityForLocale('CompletedMessage', userProfile));
        }
    }

    private async logUserOut(dc: DialogContext): Promise<void> {

        let tokenProvider: IUserTokenProvider;
        let supported = dc.context.adapter instanceof IUserTokenProvider;

        if (supported){

            tokenProvider = <IUserTokenProvider>dc.context.adapter;
            // Sign out user
            let tokens = await tokenProvider.getTokenStatus(dc.context, dc.context.activity.from.id);
            for (const token of tokens){
                await tokenProvider.signOutUser(dc.context, token.connectionName);
            }

            // Cancel all active dialogs
            await dc.cancelAllDialogs();

        }
        else{
            throw new Error('OAuthPrompt.SignOutUser(): not supported by the current adapter')
        }
    }

    private async callQnaMaker(innerDc: DialogContext, qnaMaker: QnAMaker): Promise<void> {
        let userProfile = await this.userProfileState.get(innerDc.context, () => new UserProfileState());

        let answer = await qnaMaker.getAnswers(innerDc.context);

        if (answer && answer != undefined && answer.length > 0){
            await innerDc.context.sendActivity(answer[0].answer, answer[0].answer);
        }
        else {
            await innerDc.context.sendActivity(this.templateEngine.generateActivityForLocale('UnsupportedMessage', userProfile));
        }
    }
    
    private async storeOutgoingActivities(turnContext: TurnContext, activities: [Activity], next: () => Promise<[ResourceResponse]>): Promise<[ResourceResponse]> {
        
        let messageActivities = activities.filter(a => a.type == ActivityTypes.Message);

        // If the bot is sending message activities to the user (as opposed to trace activities)
        if (messageActivities.length > 0) {
            let botResponse = await this.previousResponseAccesor.get(turnContext, () => [new Activity()]);

            // Get only the activities sent in response to last user message
            botResponse = botResponse
            .concat(messageActivities)
            .filter(a => a.replyToId == turnContext.activity.id);

            await this.previousResponseAccesor.set(turnContext, botResponse);
        }

        return await next();
    }

}
