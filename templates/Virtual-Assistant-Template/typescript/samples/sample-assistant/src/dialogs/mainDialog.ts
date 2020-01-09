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
    TurnContext} from 'botbuilder';
import { LuisRecognizer, QnAMakerResult, QnAMaker } from 'botbuilder-ai';
import {
    DialogContext,
    DialogTurnResult,
} from 'botbuilder-dialogs';

import {
    ICognitiveModelSet,
    InterruptionAction,
    TokenEvents, 
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
    ResourceResponse
    } from 'botframework-schema';
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
    private previousResponseAccesor: StatePropertyAccessor<Partial<Activity>[]>
    
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
        const userProfileState: IUserProfileState = {name: ''}
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
            const localizedServices = this.services.getCognitiveModel();

            // Run LUIS recognition and store result in turn state.
            const dispatchResult = await localizedServices.dispatchService.recognize(innerDc.context);
            innerDc.context.turnState.set(stateProperties.dispatchResult, dispatchResult);

            const intent: string = LuisRecognizer.topIntent(dispatchResult);
            if(intent == 'l_General')
            {
                // Run LUIS recognition on General model and store result in turn state.
                const generalResult = await localizedServices.luisServices.get("General")?.recognize(innerDc.context);
                innerDc.context.turnState.set(stateProperties.generalResult, generalResult);
            }
        }

        // Set up response caching for "repeat" functionality.
        innerDc.context.onSendActivities(this.storeOutgoingActivities.bind(this));
            
        return await this.onContinueDialog(innerDc);
    }

    // Runs on every turn of the conversation to check if the conversation should be interrupted.
    protected async onInterruptDialog(dc: DialogContext): Promise<InterruptionAction> {

        const activity = dc.context.activity;
        const userProfile = await this.userProfileState.get(dc.context, {name:''});
        const dialog = dc.activeDialog?.id != null ? dc.findDialog(dc.activeDialog?.id) : null;

        if (activity.type === ActivityTypes.Message && activity.text) {

            // Check if the active dialog is a skill for conditional interruption.
            const isSkill = dialog instanceof SkillDialog;

            // Get Dispatch LUIS result from turn state.
            const dispatchResult: RecognizerResult = dc.context.turnState.get(stateProperties.dispatchResult);

            const intent: string = LuisRecognizer.topIntent(dispatchResult);
            
             // Check if we need to switch skills.
             if(isSkill){

                if(intent != dialog?.id && dispatchResult.intents[intent].score > 0.9){

                    const identifiedSkill: ISkillManifest | undefined = SkillRouter.isSkill(this.settings.skills, LuisRecognizer.topIntent(dispatchResult).toString());

                    if(identifiedSkill){
                        const prompt: Partial<Activity> = this.templateEngine.generateActivityForLocale('SkillSwitchPrompt', { skill: identifiedSkill.name });
                        await dc.beginDialog(this.switchSkillDialog.id, new SwitchSkillDialogOptions(<Activity>prompt, identifiedSkill));
                        return InterruptionAction.Waiting;
                    }
                }
            }

            if(intent == 'l_general')
            {
                // Get connected LUIS result from turn state.
                const generalResult: RecognizerResult = dc.context.turnState.get(stateProperties.generalResult);
                const intent: string = LuisRecognizer.topIntent(generalResult);

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
                           
                            const previousResponse: Partial<Activity>[] = await this.previousResponseAccesor.get(dc.context, []);


                            previousResponse.forEach( async (response) => {
                                // Reset id of original activity so it can be processed by the channel.
                                response.id = '';
                                await dc.context.sendActivity(response);
                            });

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
            const localizedServices: ICognitiveModelSet = this.services.getCognitiveModel();

            // Get dispatch result from turn state.
            const dispatchResult: RecognizerResult = innerDc.context.turnState.get(stateProperties.dispatchResult);

            const dispatch: string = LuisRecognizer.topIntent(dispatchResult);

            // Check if the dispatch intent maps to a skill.
            const identifiedSkill: ISkillManifest | undefined = SkillRouter.isSkill(this.settings.skills, dispatch.toString());

            if(identifiedSkill){

                // Start the skill dialog.
                await innerDc.beginDialog(identifiedSkill.id);
            }
            else if (dispatch.toString() === 'q_faq'){

                const qnaMaker: QnAMaker | undefined = localizedServices.qnaServices.get('Faq');
                if (qnaMaker !== undefined){
                    await this.callQnaMaker(innerDc, qnaMaker);
                }

            }
            else if (dispatch.toString() === 'q_chitchat'){

                DialogContextEx.suppressCompletionMessageValidation(innerDc);
                
                const qnaMaker: QnAMaker | undefined = localizedServices.qnaServices.get('Chitchat');
                if (qnaMaker !== undefined){
                    await this.callQnaMaker(innerDc, qnaMaker);
                }
            }
            else{
                
                DialogContextEx.suppressCompletionMessageValidation(innerDc);
                await innerDc.context.sendActivity(this.templateEngine.generateActivityForLocale('UnsupportedMessage',userProfile));
            }
        }
    }

    // Runs when a new event activity comes in.
    protected async OnEventActivity(innerDc: DialogContext): Promise<void> {

        const ev = innerDc.context.activity;
        const value: string = ev.value?.toString();

        switch (ev.name){

            case Events.location:{

                const locationObj = {location: ''};
                locationObj.location = value;

                // Store location for use by skills.
                const skillContext = await this.skillContext.get(innerDc.context, new SkillContext());
                skillContext.setObj(stateProperties.location, locationObj);
                await this.skillContext.set(innerDc.context, skillContext);

                break;
            }

            case Events.timeZone: {
                try {
                    const tz: string = new Date().toLocaleString(value);
                    const timeZoneObj: {
                        timezone: string;
                    } = {
                        timezone: tz
                    };

                    // Store location for use by skills.
                    const skillContext = await this.skillContext.get(innerDc.context, new SkillContext());
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
        const tokenProvider: BotFrameworkAdapter = <BotFrameworkAdapter> dc.context.adapter;
        if (tokenProvider){
            // Sign out user
            const tokens: TokenStatus[] = await tokenProvider.getTokenStatus(dc.context, dc.context.activity.from.id)
            tokens.forEach(async (token: TokenStatus) => {
                if(token.connectionName) {
                    await tokenProvider.signOutUser(dc.context, token.connectionName);
                }
            });

            // Cancel all active dialogs
            await dc.cancelAllDialogs();

        }
        else{
            throw new Error('OAuthPrompt.SignOutUser(): not supported by the current adapter')
        }
    }

    private async callQnaMaker(innerDc: DialogContext, qnaMaker: QnAMaker): Promise<void> {
        const userProfile: IUserProfileState = await this.userProfileState.get(innerDc.context, {name:''});

        const answer: QnAMakerResult[] = await qnaMaker.getAnswers(innerDc.context);

        if (answer && answer != undefined && answer.length > 0){
            await innerDc.context.sendActivity(answer[0].answer, answer[0].answer);
        }
        else {
            await innerDc.context.sendActivity(this.templateEngine.generateActivityForLocale('UnsupportedMessage', userProfile));
        }
    }
    
    private async storeOutgoingActivities(turnContext: TurnContext, activities: Partial<Activity>[], next: () => Promise<ResourceResponse[]>): Promise<ResourceResponse[]> {
        
        const messageActivities: Partial<Activity>[] = activities.filter(a => a.type == ActivityTypes.Message);

        // If the bot is sending message activities to the user (as opposed to trace activities)
        if (messageActivities.length > 0) {
            let botResponse: Partial<Activity>[] = await this.previousResponseAccesor.get(turnContext, []);

            // Get only the activities sent in response to last user message
            botResponse = botResponse
            .concat(messageActivities)
            .filter(a => a.replyToId == turnContext.activity.id);

            await this.previousResponseAccesor.set(turnContext, botResponse);
        }

        return await next();
    }

}
