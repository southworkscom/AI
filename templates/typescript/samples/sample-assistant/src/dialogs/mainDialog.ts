/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
import {
    BotFrameworkAdapter,
    BotTelemetryClient,
    RecognizerResult,
    StatePropertyAccessor, 
    TurnContext, 
    BotFrameworkSkill} from 'botbuilder';
import {
    LuisRecognizer,
    QnAMakerDialog, 
    QnAMakerEndpoint} from 'botbuilder-ai';
import {
    DialogContext,
    DialogTurnResult, 
    Dialog, 
    ComponentDialog,
    WaterfallStepContext,
    TextPrompt,
    SkillDialog,
    PromptOptions, 
    WaterfallDialog, 
    BeginSkillDialogOptions} from 'botbuilder-dialogs';
import {
    DialogContextEx,
    ICognitiveModelSet,
    LocaleTemplateManager,
    SwitchSkillDialog,
    SwitchSkillDialogOptions, 
    SkillsConfiguration,
    IEnhancedBotFrameworkSkill } from 'bot-solutions';
import { TokenStatus } from 'botframework-connector';
import { Activity, ActivityTypes, ResourceResponse, IMessageActivity } from 'botframework-schema';
import { IUserProfileState } from '../models/userProfileState';
import { BotServices } from '../services/botServices';
import { OnboardingDialog, StateProperties } from './onboardingDialog';

/**
 * Dialog providing activity routing and message/event processing.
 */
export class MainDialog extends ComponentDialog {

    // Conversation state property with the active skill (if any).
    public static readonly activeSkillPropertyName: string = `${ typeof(MainDialog).name }.ActiveSkillProperty`;

    private readonly services: BotServices;
    private onBoardingDialog: OnboardingDialog;
    private switchSkillDialog: SwitchSkillDialog;
    private skillsConfig: SkillsConfiguration;
    private templateManager: LocaleTemplateManager;
    private userProfileState: StatePropertyAccessor<IUserProfileState>;
    private previousResponseAccesor: StatePropertyAccessor<Partial<Activity>[]>;
    private activeSkillProperty: StatePropertyAccessor<BotFrameworkSkill>;
    
    public constructor(
        services: BotServices,
        templateManager: LocaleTemplateManager,
        userProfileState: StatePropertyAccessor<IUserProfileState>,
        previousResponseAccessor: StatePropertyAccessor<Partial<Activity>[]>,
        onBoardingDialog: OnboardingDialog,
        switchSkillDialog: SwitchSkillDialog,
        skillDialogs: SkillDialog[],
        skillsConfig: SkillsConfiguration,
        activeSkillProperty: StatePropertyAccessor<BotFrameworkSkill>
    ) {
        super(MainDialog.name);

        this.services = services,
        this.templateManager = templateManager,
        this.skillsConfig = skillsConfig,
        
        this.userProfileState = userProfileState;
        this.previousResponseAccesor = previousResponseAccessor;

        // Create state property to track the active skillCreate state property to track the active skill
        this.activeSkillProperty = activeSkillProperty;

        const steps: ((sc: WaterfallStepContext) => Promise<DialogTurnResult>)[] = [
            this.onBoardingStep.bind(this),
            this.introStep.bind(this),
            this.routeStep.bind(this),
            this.finalStep.bind(this)
        ];

        this.addDialog(new WaterfallDialog (MainDialog.name, steps));
        this.addDialog(new TextPrompt(TextPrompt.name));
        this.initialDialogId = MainDialog.name;

        // Register dialogs
        this.onBoardingDialog = onBoardingDialog;
        this.switchSkillDialog = switchSkillDialog;
        this.addDialog(this.onBoardingDialog);
        this.addDialog(this.switchSkillDialog);

        // Register skill dialogs
        skillDialogs.forEach((skillDialog: SkillDialog): void => {
            this.addDialog(skillDialog);
        });
    }

    protected async onBeginDialog(innerDc: DialogContext, options: Object): Promise<DialogTurnResult> {
        if (innerDc.context.activity.type === ActivityTypes.Message) {
            // Get cognitive models for the current locale.
            const localizedServices = this.services.getCognitiveModels(innerDc.context.activity.locale as string);

            // Run LUIS recognition and store result in turn state.
            const dispatchResult: RecognizerResult = await localizedServices.dispatchService.recognize(innerDc.context);
            innerDc.context.turnState.set(StateProperties.DispatchResult, dispatchResult);

            const intent: string = LuisRecognizer.topIntent(dispatchResult);
            if (intent === 'l_general') {
                // Run LUIS recognition on General model and store result in turn state.
                const generalLuis: LuisRecognizer | undefined = localizedServices.luisServices.get('general');
                if (generalLuis !== undefined) {
                    const generalResult: RecognizerResult = await generalLuis.recognize(innerDc.context);
                    innerDc.context.turnState.set(StateProperties.GeneralResult, generalResult);
                }
            }

            // Check for any interruptions
            const interrupted: boolean = await this.interruptDialog(innerDc);

            if (interrupted) {
                // If dialog was interrupted, return EndOfTurn
                return MainDialog.EndOfTurn;
            }
        }

        // Set up response caching for "repeat" functionality.
        innerDc.context.onSendActivities(this.storeOutgoingActivities.bind(this));
            
        return await super.onBeginDialog(innerDc, options);
    }

    protected async onContinueDialog(innerDc: DialogContext): Promise<DialogTurnResult> {
        if (innerDc.context.activity.type === ActivityTypes.Message) {
            // Get cognitive models for the current locale.
            const localizedServices = this.services.getCognitiveModels(innerDc.context.activity.locale as string);

            // Run LUIS recognition and store result in turn state.
            const dispatchResult: RecognizerResult = await localizedServices.dispatchService.recognize(innerDc.context);
            innerDc.context.turnState.set(StateProperties.DispatchResult, dispatchResult);

            const intent: string = LuisRecognizer.topIntent(dispatchResult);
            if (intent === 'l_general') {
                // Run LUIS recognition on General model and store result in turn state.
                const generalLuis: LuisRecognizer | undefined = localizedServices.luisServices.get('general');
                if (generalLuis !== undefined) {
                    const generalResult: RecognizerResult = await generalLuis.recognize(innerDc.context);
                    innerDc.context.turnState.set(StateProperties.GeneralResult, generalResult);
                }
            }

            // Check for any interruptions
            const interrupted: boolean = await this.interruptDialog(innerDc);

            if (interrupted) {
                // If dialog was interrupted, return EndOfTurn
                return MainDialog.EndOfTurn;
            }
        }

        // Set up response caching for "repeat" functionality.
        innerDc.context.onSendActivities(this.storeOutgoingActivities.bind(this));

        return await super.onContinueDialog(innerDc);
    }

    private async interruptDialog(innerDc: DialogContext): Promise<boolean> {
        let interrupted = false;
        const activity: Activity = innerDc.context.activity;
        const userProfile: IUserProfileState = await this.userProfileState.get(innerDc.context, { name: '' });
        const dialog: Dialog | undefined = innerDc.activeDialog !== undefined ? innerDc.findDialog(innerDc.activeDialog.id) : undefined;

        if (activity.type === ActivityTypes.Message && activity.text !== undefined && activity.text.trim().length > 0) {
            // Check if the active dialog is a skill for conditional interruption.
            const isSkill: boolean = dialog instanceof SkillDialog;

            // Get Dispatch LUIS result from turn state.
            const dispatchResult: RecognizerResult = innerDc.context.turnState.get(StateProperties.DispatchResult);
            const intent: string = LuisRecognizer.topIntent(dispatchResult);
            
            // Check if we need to switch skills.
            if(dialog !== undefined){
                if (isSkill && this.isSkillIntent(intent) && intent !== dialog.id && dispatchResult.intents[intent].score > 0.9) {
                    const identifiedSkill: IEnhancedBotFrameworkSkill | undefined = this.skillsConfig.skills.get(intent);
                    if (identifiedSkill !== undefined) {
                        const prompt: Partial<Activity> = this.templateManager.generateActivityForLocale('SkillSwitchPrompt', innerDc.context.activity.locale as string, { skill: identifiedSkill.name });
                        await innerDc.beginDialog(this.switchSkillDialog.id, new SwitchSkillDialogOptions(prompt as Activity, identifiedSkill));
                        interrupted = true;
                    } else {
                        throw new Error(`${ intent } is not in the skills configuration`);
                    }
                }
            } 
        
            if (intent === 'l_general') {
                // Get connected LUIS result from turn state.
                const generalResult: RecognizerResult = innerDc.context.turnState.get(StateProperties.GeneralResult);
                const intent: string = LuisRecognizer.topIntent(generalResult);

                if (generalResult.intents[intent].score > 0.5) {
                    switch(intent) {
                        case 'Cancel': { 
                            await innerDc.context.sendActivity(this.templateManager.generateActivityForLocale('CancelledMessage', innerDc.context.activity.locale as string, userProfile));
                            await innerDc.cancelAllDialogs();
                            await innerDc.beginDialog(this.initialDialogId);
                            interrupted = true;
                            break;
                        } 

                        case 'Escalate': {
                            await innerDc.context.sendActivity(this.templateManager.generateActivityForLocale('EscalateMessage', innerDc.context.activity.locale as string, userProfile));
                            await innerDc.repromptDialog();
                            interrupted = true;
                            break;
                        }

                        case 'Help': {
                            if (!isSkill) {
                                // If current dialog is a skill, allow it to handle its own help intent.
                                await innerDc.context.sendActivity(this.templateManager.generateActivityForLocale('HelpCard', innerDc.context.activity.locale as string, userProfile));
                                await innerDc.repromptDialog();
                                interrupted = true;
                            }

                            break;
                        }

                        case 'Logout': {
                            // Log user out of all accounts.
                            await this.logUserOut(innerDc);
                            
                            await innerDc.context.sendActivity(this.templateManager.generateActivityForLocale('LogoutMessage', innerDc.context.activity.locale as string, userProfile));
                            await innerDc.cancelAllDialogs();
                            await innerDc.beginDialog(this.initialDialogId);
                            interrupted = true;
                            break;
                        }

                        case 'Repeat': {
                            // Sends the activities since the last user message again.
                            const previousResponse: Partial<Activity>[] = await this.previousResponseAccesor.get(innerDc.context, []);

                            previousResponse.forEach(async (response: Partial<Activity>): Promise<void> => {
                                // Reset id of original activity so it can be processed by the channel.
                                response.id = '';
                                await innerDc.context.sendActivity(response);
                            });

                            interrupted = true;
                            break;
                        }

                        case 'StartOver': {
                            await innerDc.context.sendActivity(this.templateManager.generateActivityForLocale('StartOverMessage', innerDc.context.activity.locale as string, userProfile));

                            // Cancel all dialogs on the stack.
                            await innerDc.cancelAllDialogs();
                            await innerDc.beginDialog(this.initialDialogId);
                            interrupted = true;
                            break;
                        }

                        case 'Stop': {
                            // Use this intent to send an event to your device that can turn off the microphone in speech scenarios.
                            break;
                        }
                    }
                }
            }
        }

        return interrupted;
    }

    private async onBoardingStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const userProfile: IUserProfileState = await this.userProfileState.get(stepContext.context, { name: '' });
        if (userProfile.name === undefined || userProfile.name.trim().length === 0) {
            return await stepContext.beginDialog(this.onBoardingDialog.id);
        } 

        return await stepContext.next();
    }
    
    private async introStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        
        if (DialogContextEx.suppressCompletionMessageValidation(stepContext)){
            return await stepContext.prompt(TextPrompt.name, {});
        }
        
        // Use the text provided in FinalStepAsync or the default if it is the first time.
        const promptOptions: PromptOptions = {
            prompt: stepContext.options as Activity || this.templateManager.generateActivityForLocale('FirstPromptMessage', stepContext.context.activity.locale as string, {})
        };

        return await stepContext.prompt(TextPrompt.name, promptOptions);
    }

    private async routeStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        //PENDING: This should be const activity: IMessageActivity = innerDc.context.activity.asMessageActivity()
        const activity: IMessageActivity = stepContext.context.activity;
        const userProfile: IUserProfileState = await this.userProfileState.get(stepContext.context, { name: '' });

        if (activity.text !== undefined && activity.text.trim().length > 0) {

            // Get current cognitive models for the current locale.
            const localizedServices = this.services.getCognitiveModels(stepContext.context.activity.locale as string);

            // Get dispatch result from turn state.
            const dispatchResult: RecognizerResult = stepContext.context.turnState.get(StateProperties.DispatchResult);
            const dispatch: string = LuisRecognizer.topIntent(dispatchResult);
            if (this.isSkillIntent(dispatch)) {
                const dispatchIntentSkill: string = dispatch;
                const skillDialogArgs: BeginSkillDialogOptions = {
                    activity: activity as Activity
                };

                // Save active skill in state.
                const selectedSkill: IEnhancedBotFrameworkSkill | undefined = this.skillsConfig.skills.get(dispatchIntentSkill);
                if (selectedSkill){
                    await this.activeSkillProperty.set(stepContext.context, selectedSkill);
                }
                
                // Start the skill dialog.
                return await stepContext.beginDialog(dispatchIntentSkill, skillDialogArgs);      
            }
            
            if (dispatch === 'q_faq') {

                DialogContextEx.suppressCompletionMessage(stepContext, true);
                const knowledgebaseId = `faq${ stepContext.context.activity.locale }`;
                this.registerQnADialog(knowledgebaseId, localizedServices, stepContext.context.activity.locale as string);

                return await stepContext.beginDialog(knowledgebaseId);
            }
            
            if (this.shouldBeginChitChatDialog(stepContext, dispatch, dispatchResult.intents[dispatch].score)) {

                DialogContextEx.suppressCompletionMessage(stepContext, true);
                const knowledgebaseId = `chitchat${ stepContext.context.activity.locale }`;
                this.registerQnADialog(knowledgebaseId, localizedServices, stepContext.context.activity.locale as string);

                return await stepContext.beginDialog(knowledgebaseId);
            }

            DialogContextEx.suppressCompletionMessage(stepContext, true);
            await stepContext.context.sendActivity(this.templateManager.generateActivityForLocale('UnsupportedMessage', stepContext.context.activity.locale as string, userProfile));
            
            return await stepContext.next();
            
        } 
            
        return await stepContext.next();
        
    }

    private async finalStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        // Clear active skill in state.
        await this.activeSkillProperty.delete(stepContext.context);
        
        // Restart the main dialog with a different message the second time around
        return await stepContext.replaceDialog(this.initialDialogId, this.templateManager.generateActivityForLocale('CompletedMessage', stepContext.context.activity.locale as string, {}));
    }

    private async logUserOut(dc: DialogContext): Promise<void> {
        const tokenProvider: BotFrameworkAdapter = dc.context.adapter as BotFrameworkAdapter;
        if (tokenProvider !== undefined) {
            // Sign out user
            const tokens: TokenStatus[] = await tokenProvider.getTokenStatus(dc.context, dc.context.activity.from.id);
            tokens.forEach(async (token: TokenStatus) => {
                if (token.connectionName !== undefined) {
                    await tokenProvider.signOutUser(dc.context, token.connectionName);
                }
            });

            // Cancel all active dialogs
            await dc.cancelAllDialogs();
        } else {
            throw new Error('OAuthPrompt.SignOutUser(): not supported by the current adapter');
        }
    }

    private async storeOutgoingActivities(turnContext: TurnContext, activities: Partial<Activity>[], next: () => Promise<ResourceResponse[]>): Promise<ResourceResponse[]> {
        const messageActivities: Partial<Activity>[] = activities.filter(a => a.type === ActivityTypes.Message);

        // If the bot is sending message activities to the user (as opposed to trace activities)
        if (messageActivities.length > 0) {
            let botResponse: Partial<Activity>[] = await this.previousResponseAccesor.get(turnContext, []);

            // Get only the activities sent in response to last user message
            botResponse = botResponse.concat(messageActivities)
                .filter(a => a.replyToId === turnContext.activity.id);

            await this.previousResponseAccesor.set(turnContext, botResponse);
        }

        return await next();
    }

    private registerQnADialog(knowledgebaseId: string, cognitiveModels: ICognitiveModelSet, locale: string): void {
        const qnaEndpoint: QnAMakerEndpoint | undefined = cognitiveModels.qnaConfiguration.get(knowledgebaseId);
        if (qnaEndpoint == undefined){
            throw new Error(`Could not find QnA Maker knowledge base configuration with id: ${ knowledgebaseId }.`);
        }

        if (this.dialogs.find(knowledgebaseId) == undefined) {
            const qnaDialog: QnAMakerDialog = new QnAMakerDialog(
                qnaEndpoint.knowledgeBaseId,
                qnaEndpoint.endpointKey,
                // The following line is a workaround until the method getQnAClient of QnAMakerDialog is fixed
                // as per issue https://github.com/microsoft/botbuilder-js/issues/1885
                new URL(qnaEndpoint.host).hostname.split('.')[0],
                this.templateManager.generateActivityForLocale('UnsupportedMessage', locale as string, {}) as Activity,
                // Before, instead of 'undefined' a '0.3' value was used in the following line
                undefined,
                this.templateManager.generateActivityForLocale('QnaMakerAdaptiveLearningCardTitle', locale as string, {}).text,
                this.templateManager.generateActivityForLocale('QnaMakerNoMatchText', locale as string, {}).text
            );

            qnaDialog.id = knowledgebaseId;

            this.addDialog(qnaDialog);
        }
    }
    

    private isSkillIntent(dispatchIntent: string): boolean {
        if (dispatchIntent.toLowerCase() === 'l_general' || 
            dispatchIntent.toLowerCase() === 'q_faq' || 
            dispatchIntent.toLowerCase() === 'none') {

            return false;
        }

        return true;
    } 

    private shouldBeginChitChatDialog(stepContext: WaterfallStepContext, dispatchIntent: string, dispatchScore: number, threshold = 0.5): boolean{
        
        if(threshold < 0.0 || threshold > 1.0){
            throw new Error('ArgumentOutOfRangeException: threshold');
        }

        if(dispatchIntent.toLocaleLowerCase() === 'none'){
            return true;
        }

        if(dispatchIntent.toLocaleLowerCase() === 'l_general'){
            // If dispatch classifies user query as general, we should check against the cached general Luis score instead.
            const generalResult: RecognizerResult = stepContext.context.turnState.get(StateProperties.GeneralResult);
            const intent: string = LuisRecognizer.topIntent(generalResult);
            if (intent !== undefined){
                return generalResult.intents[intent].score < threshold;
            }
        }

        else if (dispatchScore < threshold){
            return true;
        }

        return false;

    }
}