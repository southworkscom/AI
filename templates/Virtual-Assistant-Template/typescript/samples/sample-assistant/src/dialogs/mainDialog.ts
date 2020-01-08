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
    ActivityPrompt,
} from 'botbuilder-dialogs';

import {
    ICognitiveModelSet,
    InterruptionAction,
    RouterDialog,
    TokenEvents, 
    isRemoteUserTokenProvider,
    SkillRouter,
    ISkillManifest,
    LocaleTemplateEngineManager,
    DialogContextEx,
    SwitchSkillDialog,
    SwitchSkillDialogOptions,
    ActivityHandlerDialog,
    SkillContext,
    SkillDialog
} from 'botbuilder-solutions';

import { TokenStatus } from 'botframework-connector';
import {
    Activity,
    ActivityTypes, 
    ResourceResponse, 
    IMessageActivity} from 'botframework-schema';
import i18next from 'i18next';

import { CancelResponses } from '../responses/cancelResponses';
import { MainResponses } from '../responses/mainResponses';
import { BotServices } from '../services/botServices';
import { IBotSettings } from '../services/botSettings';
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

// Dialog providing activity routing and message/event processing.
export class MainDialog extends ActivityHandlerDialog {
    // Fields

    private readonly settings: IBotSettings;
    private readonly services: BotServices;
    private onboardingDialog: OnboardingDialog;
    private switchSkillDialog: SwitchSkillDialog;
    private templateEngine: LocaleTemplateEngineManager;
    private readonly skillContext: StatePropertyAccessor<SkillContext>;
    private userProfileState: StatePropertyAccessor<IUserProfileState>;
    private previousResponseAccesor: StatePropertyAccessor<Activity[]>
    
    private activitiesArray: Activity[] = 
    [
        {
            type: '',
            localTimezone: '',
            callerId:'',
            channelId: '',
            conversation: {
                            conversationType: '',
                            isGroup: false,
                            tenantId: '',
                            id: '',
                            name:''
                        },
            action: '',
            serviceUrl: '',
            from: { id:'', name:''},
            recipient: { id:'', name:''},
            text:'',
            label:'',
            valueType:'',
            listenFor:['']
        }
    ];

    // Constructor
    public constructor(
        telemetryClient: BotTelemetryClient,
        settings: IBotSettings,
        services: BotServices,
        templateEngine: LocaleTemplateEngineManager,
        userState: UserState,
        onboardingDialog: OnboardingDialog,
        switchSkillDialog: SwitchSkillDialog,
        skillDialogs: [SkillDialog],
        conversationState: ConversationState

    ) {
        super(MainDialog.name, telemetryClient);
        this.settings = settings
        this.services = services
        this.templateEngine = templateEngine
        this.telemetryClient = telemetryClient;
        
        // Create user state properties
        let userProfileState: IUserProfileState = {name: ''}
        this.userProfileState = userState.createProperty<IUserProfileState>(userProfileState.name);
        this.skillContext = userState.createProperty<SkillContext>(SkillContext.name);

        // Create conversation state properties
        this.previousResponseAccesor = conversationState.createProperty<[Activity]>(stateProperties.previousBotResponse)

        // Register dialogs
        this.onboardingDialog = onboardingDialog
        this.switchSkillDialog = switchSkillDialog
        this.addDialog(this.onboardingDialog);
        this.addDialog(this.switchSkillDialog);

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

            const intent: string = LuisRecognizer.topIntent(dispatchResult);
            if(intent == 'l_General')
            {
                // Run LUIS recognition on General model and store result in turn state.
                let generalResult = await localizedServices.luisServices.get("General")?.recognize(innerDc.context);
                innerDc.context.turnState.set(stateProperties.generalResult, generalResult);
            }
        }

        // Set up response caching for "repeat" functionality.
        let test = this.storeOutgoingActivities(
            innerDc.context,
            [innerDc.context.activity],
            async (): Promise<[ResourceResponse]> => { return await [{id:''}]})


        innerDc.context.onSendActivities(test);
            
        return await this.onContinueDialog(innerDc);
    }

    // Runs on every turn of the conversation to check if the conversation should be interrupted.
    protected async onInterruptDialog(dc: DialogContext): Promise<InterruptionAction> {

        let activity = dc.context.activity;
        let userProfile = await this.userProfileState.get(dc.context, {name:''});
        let dialog = dc.activeDialog?.id != null ? dc.findDialog(dc.activeDialog?.id) : null;

        if (activity.type === ActivityTypes.Message && activity.text) {

            // Check if the active dialog is a skill for conditional interruption.
            let isSkill = dialog instanceof SkillDialog;

            // Get Dispatch LUIS result from turn state.
            const dispatchResult: RecognizerResult = dc.context.turnState.get(stateProperties.dispatchResult);

            let intent: string = LuisRecognizer.topIntent(dispatchResult);
            
             // Check if we need to switch skills.
             if(isSkill){

                if(intent != dialog?.id && dispatchResult.intents[intent].score > 0.9){

                    let identifiedSkill: ISkillManifest | undefined = SkillRouter.isSkill(this.settings.skills, LuisRecognizer.topIntent(dispatchResult).toString());

                    if(identifiedSkill){
                        let prompt: Partial<Activity> = this.templateEngine.generateActivityForLocale('SkillSwitchPrompt', { skill: identifiedSkill.name });
                        await dc.beginDialog(this.switchSkillDialog.id, new SwitchSkillDialogOptions(<Activity>prompt, identifiedSkill));
                        return InterruptionAction.Waiting;
                    }
                }
            }

            if(intent == 'l_general')
            {
                // Get connected LUIS result from turn state.
                let generalResult: RecognizerResult = dc.context.turnState.get(stateProperties.generalResult);
                let intent: string = LuisRecognizer.topIntent(generalResult);

                 if(generalResult.intents[intent].score > 0.5){

                    switch(intent.toString())
                    {
                        case 'Cancel': { 
                            // Suppress completion message for utility functions.
                            DialogContextEx.suppressCompletionMessageValidation(dc);

                            await dc.context.sendActivity(this.templateEngine.generateActivityForLocale('CancelledMessage', userProfile));
                            await dc.cancelAllDialogs();
                            return InterruptionAction.End;
                        } 

                        case 'Escalate': {
                            await dc.context.sendActivity(this.templateEngine.generateActivityForLocale('EscalateMessage', userProfile));
                            return InterruptionAction.Resume;
                        }

                        case 'Help': {
                            // Suppress completion message for utility functions.
                            DialogContextEx.suppressCompletionMessageValidation(dc);

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

                        case 'Logout': {
                            
                            // Suppress completion message for utility functions.
                            DialogContextEx.suppressCompletionMessageValidation(dc);

                            // Log user out of all accounts.
                            await this.logUserOut(dc);
                            
                            await dc.context.sendActivity(this.templateEngine.generateActivityForLocale('LogoutMessage', userProfile));
                            return InterruptionAction.End;
                        }

                        case 'Repeat': {
                            // No need to send the usual dialog completion message for utility capabilities such as these.
                            DialogContextEx.suppressCompletionMessageValidation(dc);

                            // Sends the activities since the last user message again.
                           
                            let previousResponse: Activity[] = await this.previousResponseAccesor.get(dc.context, this.activitiesArray);

                            for (const response of previousResponse) {

                                // Reset id of original activity so it can be processed by the channel.
                                response.id = '';
                                await dc.context.sendActivity(response);
                              }

                            return InterruptionAction.Waiting;
                        }

                        case 'StartOver': {
                            
                            // Suppresss completion message for utility functions.
                            DialogContextEx.suppressCompletionMessageValidation(dc);

                            await dc.context.sendActivity(this.templateEngine.generateActivityForLocale('StartOverMessage', userProfile))

                            // Cancel all dialogs on the stack.
                            await dc.cancelAllDialogs();
                            return InterruptionAction.End;

                        }

                        case 'Stop': {

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

        const userProfile: IUserProfileState = await this.userProfileState.get(innerDc.context, {name:''});

        if (userProfile != undefined && userProfile.name){

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
        DialogContextEx.suppressCompletionMessageValidation(innerDc);
    }

    // Runs when the dialog stack is empty, and a new message activity comes in.
    protected async onMessageActivity(innerDc: DialogContext): Promise<void> {

        const activity: Activity = innerDc.context.activity;

        const userProfile: IUserProfileState = await this.userProfileState.get(innerDc.context, {name:''});

        if (activity != undefined && activity.text){

            // Get current cognitive models for the current locale.
            let localizedServices: ICognitiveModelSet = this.services.getCognitiveModel();

            // Get dispatch result from turn state.
            let dispatchResult: RecognizerResult = innerDc.context.turnState.get(stateProperties.dispatchResult);

            let dispatch: string = LuisRecognizer.topIntent(dispatchResult);

            // Check if the dispatch intent maps to a skill.
            let identifiedSkill: ISkillManifest | undefined = SkillRouter.isSkill(this.settings.skills, dispatch.toString());

            if(identifiedSkill){

                // Start the skill dialog.
                await innerDc.beginDialog(identifiedSkill.id);
            }
            else if (dispatch.toString() === 'q_faq'){
                await this.callQnaMaker(innerDc, <QnAMaker>localizedServices.qnaServices.get('Faq'));
            }
            else if (dispatch.toString() === 'q_chitchat'){
                DialogContextEx.suppressCompletionMessageValidation(innerDc);

                await this.callQnaMaker(innerDc, <QnAMaker>localizedServices.qnaServices.get('Chitchat'));
            }
            else{
                DialogContextEx.suppressCompletionMessageValidation(innerDc);
                await innerDc.context.sendActivity(this.templateEngine.generateActivityForLocale('UnsupportedMessage',userProfile));
            }
        }
    }

    // Runs when a new event activity comes in.
    protected async OnEventActivity(innerDc: DialogContext): Promise<void> {

        let ev = innerDc.context.activity;
        let value: string = ev.value?.toString();

        switch (ev.name){

            case Events.location:{

                let locationObj = {location: ''};
                locationObj.location = value;

                // Store location for use by skills.
                let skillContext = await this.skillContext.get(innerDc.context, new SkillContext());
                skillContext.setObj(stateProperties.location, locationObj);
                await this.skillContext.set(innerDc.context, skillContext);

                break;
            }

            case Events.timeZone: {
                try {
                    
                    let timeZoneInfo = TimeZoneInfo.FindSystemTimeZoneById(value);
                    let timeZoneObj = {timezone: Object};
                    timeZoneObj.timezone = timeZoneInfo;

                    // Store location for use by skills.
                    let skillContext = await this.skillContext.get(innerDc.context, new SkillContext());
                    skillContext.setObj(stateProperties.timeZone, timeZoneObj);
                    await this.skillContext.set(innerDc.context, skillContext);
                }
                catch{
                    await innerDc.context.sendActivity({type: ActivityTypes.Trace, text: 'Received time zone could not be parsed. Property not set.'});
                }

                break;
            }

            case TokenEvents.tokenResponseEventName: {
                // Forward the token response activity to the dialog waiting on the stack.
                await innerDc.continueDialog();
                break;
            }

            default: {
                await innerDc.context.sendActivity({type: ActivityTypes.Trace, text: `Unknown Event ${ev.name ?? 'undefined'} was received but not processed.`});
            }
        }
    }

    // Runs when an activity with an unknown type is received.
    protected async onUnhandledActivityType(innerDc: DialogContext): Promise<void> {
        await innerDc.context.sendActivity({type: ActivityTypes.Trace, text: 'Unknown activity was received but not processed.'});
    }

    // Runs when the dialog stack completes.
    protected async onDialogComplete(outerDc: DialogContext, result :Object): Promise<void> {
        const userProfile: IUserProfileState = await this.userProfileState.get(outerDc.context, {name:''});

        // Only send a completion message if the user sent a message activity.
        if (outerDc.context.activity.type === ActivityTypes.Message && !DialogContextEx.suppressCompletionMessageValidation(outerDc)){
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
        let userProfile: IUserProfileState = await this.userProfileState.get(innerDc.context, {name:''});

        let answer: QnAMakerResult[] = await qnaMaker.getAnswers(innerDc.context);

        if (answer && answer != undefined && answer.length > 0){
            await innerDc.context.sendActivity(answer[0].answer, answer[0].answer);
        }
        else {
            await innerDc.context.sendActivity(this.templateEngine.generateActivityForLocale('UnsupportedMessage', userProfile));
        }
    }
    
    private async storeOutgoingActivities(turnContext: TurnContext, activities: Activity[], next: () => Promise<ResourceResponse[]>): Promise<ResourceResponse[]> {
        
        const messageActivities: Activity[] = activities.filter(a => a.type == ActivityTypes.Message);

        // If the bot is sending message activities to the user (as opposed to trace activities)
        if (messageActivities.length > 0) {
            let botResponse: Activity[] = await this.previousResponseAccesor.get(turnContext, this.activitiesArray);

            // Get only the activities sent in response to last user message
            botResponse = botResponse
            .concat(messageActivities)
            .filter(a => a.replyToId == turnContext.activity.id);

            await this.previousResponseAccesor.set(turnContext, botResponse);
        }

        return await next();
    }

}
