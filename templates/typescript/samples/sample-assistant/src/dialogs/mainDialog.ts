/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import {
    BotFrameworkAdapter,
    BotTelemetryClient,
    RecognizerResult,
    StatePropertyAccessor, 
    TurnContext} from 'botbuilder';
import { LuisRecognizer, QnAMakerResult, QnAMaker } from 'botbuilder-ai';
import {
    DialogContext,
    DialogTurnResult, 
    Dialog, 
    ComponentDialog,
    WaterfallStepContext,
    TextPrompt,
    PromptOptions, 
    WaterfallDialog,
    DialogTurnStatus} from 'botbuilder-dialogs';
import {
    DialogContextEx,
    ICognitiveModelSet,
    LocaleTemplateEngineManager,
    SkillDialog,
    SwitchSkillDialog,
    SwitchSkillDialogOptions, 
    SkillsConfiguration,
    EnhancedBotFrameworkSkill } from 'botbuilder-solutions';
import { TokenStatus } from 'botframework-connector';
import { Activity, ActivityTypes, ResourceResponse, IMessageActivity } from 'botframework-schema';
import { IUserProfileState } from '../models/userProfileState';
import { BotServices } from '../services/botServices';
import { IBotSettings } from '../services/botSettings';
import { OnboardingDialog, StateProperties } from './onboardingDialog';

// Dialog providing activity routing and message/event processing.
export class MainDialog extends ComponentDialog {
    private readonly services: BotServices;
    private readonly settings: IBotSettings;
    private onboardingDialog: OnboardingDialog;
    private switchSkillDialog: SwitchSkillDialog;
    private skillsConfig: SkillsConfiguration;
    private templateEngine: LocaleTemplateEngineManager;
    private userProfileState: StatePropertyAccessor<IUserProfileState>;
    private previousResponseAccesor: StatePropertyAccessor<Partial<Activity>[]>
    
    public constructor(
        settings: IBotSettings,
        services: BotServices,
        templateEngine: LocaleTemplateEngineManager,
        userProfileState: StatePropertyAccessor<IUserProfileState>,
        previousResponseAccessor: StatePropertyAccessor<Partial<Activity>[]>,
        onboardingDialog: OnboardingDialog,
        switchSkillDialog: SwitchSkillDialog,
        skillDialogs: SkillDialog[],
        skillsConfig: SkillsConfiguration,
        telemetryClient: BotTelemetryClient
    ) {
        super(MainDialog.name);

        this.services = services,
        this.settings = settings,
        this.templateEngine = templateEngine,
        this.skillsConfig = skillsConfig,
        this.telemetryClient = telemetryClient
        
        // Create user state properties
        this.userProfileState = userProfileState;

        // Create conversation state properties
        this.previousResponseAccesor = previousResponseAccessor;

        const steps: ((sc: WaterfallStepContext) => Promise<DialogTurnResult>)[] = [
            this.onBoardingStep.bind(this),
            this.introStep.bind(this),
            this.routeStep.bind(this),
            this.finalStep.bind(this)
        ];

        this.addDialog(new WaterfallDialog (MainDialog.name, steps));
        this.addDialog(new TextPrompt(TextPrompt.name));
        const initialDialogId: string = MainDialog.name;

        // Register dialogs
        this.onboardingDialog = onboardingDialog
        this.switchSkillDialog = switchSkillDialog
        this.addDialog(this.onboardingDialog);
        this.addDialog(this.switchSkillDialog);

        // Register a QnAMakerDialog for each registered knowledgebase and ensure localised responses are provided.
        let localizedServices = services.getCognitiveModels();

        // Register skill dialogs
        skillDialogs.forEach((skillDialog: SkillDialog): void => {
            this.addDialog(skillDialog);
        });
    }

    // Runs on every turn of the conversation.
    protected async onBeginDialog(innerDc: DialogContext, options: Object): Promise<DialogTurnResult> {
        if (innerDc.context.activity.type == ActivityTypes.Message) {
            // Get cognitive models for the current locale.
            const localizedServices = this.services.getCognitiveModels();

            // Run LUIS recognition and store result in turn state.
            const dispatchResult: RecognizerResult = await localizedServices.dispatchService.recognize(innerDc.context);
            innerDc.context.turnState.set(StateProperties.dispatchResult, dispatchResult);

            const intent: string = LuisRecognizer.topIntent(dispatchResult);
            if(intent == 'l_general') {
                // Run LUIS recognition on General model and store result in turn state.
                const generalLuis: LuisRecognizer | undefined = localizedServices.luisServices.get("general");
                if (generalLuis !== undefined) {
                    const generalResult: RecognizerResult = await generalLuis.recognize(innerDc.context);
                    innerDc.context.turnState.set(StateProperties.GeneralResult, generalResult);
                }
            }

            // Check for any interruptions
            var interrupted: Boolean = await this.onInterruptDialog(innerDc);

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
        if (innerDc.context.activity.type == ActivityTypes.Message) {
            // Get cognitive models for the current locale.
            const localizedServices = this.services.getCognitiveModels();

            // Run LUIS recognition and store result in turn state.
            const dispatchResult: RecognizerResult = await localizedServices.dispatchService.recognize(innerDc.context);
            innerDc.context.turnState.set(StateProperties.dispatchResult, dispatchResult);

            const intent: string = LuisRecognizer.topIntent(dispatchResult);
            if(intent == 'l_general') {
                // Run LUIS recognition on General model and store result in turn state.
                const generalLuis: LuisRecognizer | undefined = localizedServices.luisServices.get("general");
                if (generalLuis !== undefined) {
                    const generalResult: RecognizerResult = await generalLuis.recognize(innerDc.context);
                    innerDc.context.turnState.set(StateProperties.GeneralResult, generalResult);
                }
            }

            // Check for any interruptions
            const interrupted: Boolean = await this.onInterruptDialog(innerDc);

            if (interrupted) {
                // If dialog was interrupted, return EndOfTurn
                return MainDialog.EndOfTurn;
            }
        }

        // Set up response caching for "repeat" functionality.
        innerDc.context.onSendActivities(this.storeOutgoingActivities.bind(this));
            
        return await super.onContinueDialog(innerDc);
    }

    // Runs on every turn of the conversation to check if the conversation should be interrupted.
    protected async onInterruptDialog(innerDc: DialogContext): Promise<Boolean> {
        let interrupted: Boolean = false;
        const activity: Activity = innerDc.context.activity;
        const userProfile: IUserProfileState = await this.userProfileState.get(innerDc.context, { name: '' });
        const dialog: Dialog | undefined = innerDc.activeDialog !== undefined ? innerDc.findDialog(innerDc.activeDialog.id) : undefined;

        if (activity.type === ActivityTypes.Message && activity.text.trim().length > 0) {
            // Check if the active dialog is a skill for conditional interruption.
            const isSkill: boolean = dialog instanceof SkillDialog;

            // Get Dispatch LUIS result from turn state.
            const dispatchResult: RecognizerResult = innerDc.context.turnState.get(StateProperties.dispatchResult);
            const intent: string = LuisRecognizer.topIntent(dispatchResult);
            
            // Check if we need to switch skills.
            if (isSkill) {
                if (dialog !== undefined) {
                    if (intent !== dialog.id && dispatchResult.intents[intent].score > 0.9) {
                        const identifiedSkill: EnhancedBotFrameworkSkill;

                        if (this.skillsConfig.skills.get(intent.toString())) {
                            const prompt: Partial<Activity> = this.templateEngine.generateActivityForLocale('SkillSwitchPrompt', { skill: identifiedSkill.name });
                            await innerDc.beginDialog(this.switchSkillDialog.id, new SwitchSkillDialogOptions(prompt as Activity, identifiedSkill));
                            interrupted = true;
                        }
                        else
                        {
                            throw new Error(`${intent.toString()} is not in the skills configuration`);
                        }
                    }
                }
            }

            if(intent == 'l_general') {
                // Get connected LUIS result from turn state.
                const generalResult: RecognizerResult = innerDc.context.turnState.get(StateProperties.GeneralResult);
                const intent: string = LuisRecognizer.topIntent(generalResult);

                 if(generalResult.intents[intent].score > 0.5) {
                    switch(intent.toString()) {
                        case 'Cancel': { 

                            await innerDc.context.sendActivity(this.templateEngine.generateActivityForLocale('CancelledMessage', userProfile));
                            await innerDc.cancelAllDialogs();
                            await innerDc.beginDialog(this.initialDialogId);
                            interrupted = true;
                            break;
                        } 

                        case 'Escalate': {
                            await innerDc.context.sendActivity(this.templateEngine.generateActivityForLocale('EscalateMessage', userProfile));
                            await innerDc.repromptDialog();
                            interrupted = true;
                            break;
                        }

                        case 'Help': {
                            if (!isSkill) {
                                await innerDc.context.sendActivity(this.templateEngine.generateActivityForLocale('HelpCard', userProfile));
                                await innerDc.repromptDialog();
                                interrupted = true;
                            }

                            break;
                        }

                        case 'Logout': {
                            // Log user out of all accounts.
                            await this.logUserOut(innerDc);
                            
                            await innerDc.context.sendActivity(this.templateEngine.generateActivityForLocale('LogoutMessage', userProfile));
                            await innerDc.cancelAllDialogs();
                            await innerDc.beginDialog(this.initialDialogId);
                            interrupted = true;
                            break;
                        }

                        case 'Repeat': {
                            // Sends the activities since the last user message again.
                            const previousResponse: Partial<Activity>[] = await this.previousResponseAccesor.get(innerDc.context, []);

                            previousResponse.forEach(async (response: Partial<Activity>) => {
                                // Reset id of original activity so it can be processed by the channel.
                                response.id = '';
                                await innerDc.context.sendActivity(response);
                            });

                            interrupted = true;
                            break;
                        }

                        case 'StartOver': {
                            await innerDc.context.sendActivity(this.templateEngine.generateActivityForLocale('StartOverMessage', userProfile))

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

    // Runs when the dialog stack is empty, and a new member is added to the conversation. Can be used to send an introduction activity.
    protected async onBoardingStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const userProfile: IUserProfileState = await this.userProfileState.get(stepContext.context, { name: '' });

        if (userProfile === undefined || userProfile.name.trim().length === 0) {
            await stepContext.beginDialog(OnboardingDialog.name);
        } 

        return await stepContext.next();
    }
    
    protected async introStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
    // Use the text provided in FinalStepAsync or the default if it is the first time.
        let promptOptions: PromptOptions = {
            prompt: stepContext.options as Activity || this.templateEngine.generateActivityForLocale("")
        };
        return await stepContext.prompt(TextPrompt.name, promptOptions);
    }

    // Runs when the dialog stack is empty, and a new message activity comes in.
    protected async routeStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        //PENDING: This should be const activity: IMessageActivity = innerDc.context.activity.asMessageActivity()
        const activity: IMessageActivity = stepContext.context.activity;
        const userProfile: IUserProfileState = await this.userProfileState.get(stepContext.context, { name: '' });

        if (activity !== undefined && activity.text.trim().length > 0) {
            // Get current cognitive models for the current locale.
            const localizedServices: ICognitiveModelSet = this.services.getCognitiveModels();

            // Get dispatch result from turn state.
            const dispatchResult: RecognizerResult = stepContext.context.turnState.get(StateProperties.dispatchResult);
            const dispatch: string = LuisRecognizer.topIntent(dispatchResult);

            if (this.IsSkillIntent !== undefined) {
                const dispatchIntentSkill = dispatch.toString();
                const skillDialogArgs: SkillDialogArgs = skillDialogArgs{ skillId = dispatchIntentSkill };
                
                // Start the skill dialog.
                return await stepContext.beginDialog(dispatchIntentSkill, skillDialogArgs);
            
            } else if (dispatch === 'q_faq') {
                const qnaMaker: QnAMaker | undefined = localizedServices.qnaServices.get('faq');
                if (qnaMaker !== undefined) {
                    return await this.callQnaMaker(stepContext, qnaMaker);
                }
            } else if (dispatch === 'q_chitchat') {
                DialogContextEx.suppressCompletionMessage(stepContext, true);
                const qnaMaker: QnAMaker | undefined = localizedServices.qnaServices.get('chitchat');
                if (qnaMaker !== undefined){
                    return await this.callQnaMaker(stepContext, qnaMaker);
                }
            } else {
                DialogContextEx.suppressCompletionMessage(stepContext, true);
                await stepContext.context.sendActivity(this.templateEngine.generateActivityForLocale('UnsupportedMessage', userProfile));
                
                return await stepContext.next();
            } 
        } 

        return await stepContext.next();
    }

    private async finalStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        // Restart the main dialog with a different message the second time around
        return await stepContext.replaceDialog(this.initialDialogId, this.templateEngine.generateActivityForLocale("CompletedMessage"));
    }

    private async logUserOut(dc: DialogContext): Promise<void> {
        const tokenProvider: BotFrameworkAdapter = dc.context.adapter as BotFrameworkAdapter;
        if (tokenProvider !== undefined){
            // Sign out user
            const tokens: TokenStatus[] = await tokenProvider.getTokenStatus(dc.context, dc.context.activity.from.id)
            tokens.forEach(async (token: TokenStatus) => {
                if (token.connectionName !== undefined) {
                    await tokenProvider.signOutUser(dc.context, token.connectionName);
                }
            });

            // Cancel all active dialogs
            await dc.cancelAllDialogs();

        } else {
            throw new Error('OAuthPrompt.SignOutUser(): not supported by the current adapter')
        }
    }

    private async callQnaMaker(innerDc: DialogContext, qnaMaker: QnAMaker): Promise<DialogTurnResult> {
        const userProfile: IUserProfileState = await this.userProfileState.get(innerDc.context, { name: '' });

        const answer: QnAMakerResult[] = await qnaMaker.getAnswers(innerDc.context);

        if (answer !== undefined && answer.length > 0){
            await innerDc.context.sendActivity(answer[0].answer, answer[0].answer);
        } else {
            await innerDc.context.sendActivity(this.templateEngine.generateActivityForLocale('UnsupportedMessage', userProfile));
        }

        return {status: DialogTurnStatus.empty};
    }
    
    private async storeOutgoingActivities(turnContext: TurnContext, activities: Partial<Activity>[], next: () => Promise<ResourceResponse[]>): Promise<ResourceResponse[]> {
        const messageActivities: Partial<Activity>[] = activities.filter(a => a.type == ActivityTypes.Message);

        // If the bot is sending message activities to the user (as opposed to trace activities)
        if (messageActivities.length > 0) {
            let botResponse: Partial<Activity>[] = await this.previousResponseAccesor.get(turnContext, []);

            // Get only the activities sent in response to last user message
            botResponse = botResponse.concat(messageActivities)
                        .filter(a => a.replyToId == turnContext.activity.id);

            await this.previousResponseAccesor.set(turnContext, botResponse);
        }

        return await next();
    }

    private IsSkillIntent(dispatchIntent: string) {
        if (dispatchIntent.toLowerCase() === 'l_general' || dispatchIntent.toLowerCase() === 'q_chichat' || dispatchIntent.toLowerCase() === 'q_faq' || dispatchIntent.toLowerCase() === 'none') {
            return false;
        }

        return true;
    }
    
}
