/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
import {
    Activity,
    ActivityTypes,
    BotFrameworkAdapter,
    BotTelemetryClient,
    RecognizerResult,
    StatePropertyAccessor,
    EndOfConversationCodes
} from 'botbuilder';
import { LuisRecognizer } from 'botbuilder-ai';
import {
    DialogContext,
    DialogTurnResult,
    WaterfallStepContext,
    WaterfallDialog,
    TextPrompt,
    Dialog
} from 'botbuilder-dialogs';
import {
    ActivityHandlerDialog,
    ICognitiveModelSet,
    InterruptionAction,
    LocaleTemplateEngineManager,
    TokenEvents,
    isRemoteUserTokenProvider } from 'botbuilder-solutions';
import { TokenStatus } from 'botframework-connector';
import { SkillState } from '../models/skillState';
import { BotServices } from '../services/botServices';
import { SampleDialog } from './sampleDialog';
import { StateProperties } from '../models';

export class MainDialog extends ActivityHandlerDialog {

    // Fields
    private readonly services: BotServices;
    private readonly sampleDialog: SampleDialog;
    private readonly sampleAction: SampleDialog;
    private readonly templateEngine: LocaleTemplateEngineManager;
    private readonly stateAccessor: StatePropertyAccessor<SkillState>;
    private readonly telemetryClient: BotTelemetryClient;
    
    // Constructor
    public constructor(
        services: BotServices,
        telemetryClient: BotTelemetryClient,
        stateAccessor: StatePropertyAccessor<SkillState>,
        sampleDialog: SampleDialog,
        sampleAction: SampleDialog,
        templateEngine: LocaleTemplateEngineManager,
    ) {
        super(MainDialog.name);
        this.services = services;
        this.templateEngine = templateEngine;
        this.telemetryClient = telemetryClient;

        // Create conversationstate properties
        this.stateAccessor = stateAccessor;

        const steps: ((sc: WaterfallStepContext) => Promise<DialogTurnResult>)[] = [
            introStep.bind(this),
            routeStep.bind(this),
            finalStep.bind(this),
        ];

        this.addDialog(new WaterfallDialog (MainDialog.name, steps));
        this.addDialog(new TextPrompt(TextPrompt.name));
        const InitialDialogId: string = MainDialog.name;
        
        // Register dialogs
        this.sampleDialog = sampleDialog;
        this.sampleAction = sampleAction;
        this.addDialog(sampleDialog);
        this.addDialog(sampleAction);
    }

    // Runs when the dialog is started.
    protected async onBeginDialog(innerDc: DialogContext, options: Object): Promise<DialogTurnResult> {
        if (innerDc.context.activity.type == ActivityTypes.Message) {
        
            // Get cognitive models for the current locale.
            const localizedServices: Partial<ICognitiveModelSet> = this.services.getCognitiveModels();

            // Run LUIS recognition and store result in turn state.
            const skillLuis: LuisRecognizer | undefined = localizedServices.luisServices ? localizedServices.luisServices.get("sampleSkill") : undefined;
            if (skillLuis !== undefined) {
                const skillResult: RecognizerResult = await skillLuis.recognize(innerDc.context);
                innerDc.context.turnState.set(StateProperties.skillLuisResult, skillResult);
            }
            
            // Run LUIS recognition on General model and store result in turn state.
            const generalLuis: LuisRecognizer | undefined = localizedServices.luisServices ? localizedServices.luisServices.get("general") : undefined;
            if (generalLuis !== undefined) {
                const generalResult: RecognizerResult = await generalLuis.recognize(innerDc.context);
                innerDc.context.turnState.set(StateProperties.generalLuisResult, generalResult);
            }

            // Check for any interruptions
            var interrupted = await onInterruptDialog(innerDc);

            if (interrupted) {
                // If dialog was interrupted, return EndOfTurn
                return MainDialog.EndOfTurn;
            }
        }

        return await super.onBeginDialog(innerDc, options);
    }

    protected async onContinueDialog(innerDc: DialogContext): Promise<DialogTurnResult> {
        if (innerDc.context.activity.type == ActivityTypes.Message) {
        
            // Get cognitive models for the current locale.
            const localizedServices: Partial<ICognitiveModelSet> = this.services.getCognitiveModels();

            // Run LUIS recognition and store result in turn state.
            const skillLuis: LuisRecognizer | undefined = localizedServices.luisServices ? localizedServices.luisServices.get("sampleSkill") : undefined;
            if (skillLuis !== undefined) {
                const skillResult: RecognizerResult = await skillLuis.recognize(innerDc.context);
                innerDc.context.turnState.set(StateProperties.skillLuisResult, skillResult);
            }
        
            // Check for any interruptions
            var interrupted = await onInterruptDialog(innerDc);

            if (interrupted) {
                // If dialog was interrupted, return EndOfTurn
                return MainDialog.EndOfTurn;
            }
        }

        return await super.onContinueDialog(innerDc);
    }

    // Runs on every turn of the conversation to check if the conversation should be interrupted.
    protected async onInterruptDialog(innerDc: DialogContext): Promise<Boolean> {
        let interrupted: Boolean = false;
        const activity: Activity = innerDc.context.activity;

        if (activity.type === ActivityTypes.Message && activity.text.trim().length > 0) {
        
            // Get connected LUIS result from turn state.
            const generalResult: RecognizerResult = innerDc.context.turnState.get(StateProperties.generalLuisResult);
            const intent: string = LuisRecognizer.topIntent(generalResult);

            if(generalResult.intents[intent].score > 0.5) {
                switch(intent.toString()) {
                    case 'Cancel': { 

                        await innerDc.context.sendActivity(this.templateEngine.generateActivityForLocale('CancelledMessage'));
                        await innerDc.cancelAllDialogs();
                        await innerDc.beginDialog(initialDialogId);
                        interrupted = true;
                        break;
                    } 
                    case 'Help': {

                        await innerDc.context.sendActivity(this.templateEngine.generateActivityForLocale('HelpMessage'));
                        await innerDc.repromptDialog();
                        interrupted = true;
                        break;
                    }
                    case 'Logout': {

                        // Log user out of all accounts.
                        await this.logUserOut(innerDc);

                        await innerDc.context.sendActivity(this.templateEngine.generateActivityForLocale('LogoutMessage'));
                        await innerDc.cancelAllDialogs();
                        await innerDc.beginDialog(initialDialogId);
                        interrupted = true;
                        break;
                    }
                }
            }
        }
        
        return interrupted;
    }

    // Handles introduction/continuation prompt logic.
    private async introStepAsync(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        if (stepContext.context.IsSkill()) {
            // If the bot is in skill mode, skip directly to route and do not prompt
            return await stepContext.next();
        } else {
            // If bot is in local mode, prompt with intro or continuation message
            const promptOptions = new PromptOptions {
                Prompt = stepContext.options as Activity ?? this.templateEngine.GenerateActivityForLocale("FirstPromptMessage")
            };

            return await stepContext.prompt(TextPrompt.name, promptOptions);
        }
    }

    // Runs when the dialog stack is empty, and a new message activity comes in.
    protected async routeStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        //PENDING: This should be const activity: IMessageActivity = innerDc.context.activity.asMessageActivity()
        // but it's not in botbuilder-js currently
        const activity: Activity = stepContext.context.activity;

        if (activity !== undefined && activity.text.trim().length > 0){
            // Get current cognitive models for the current locale.
            const localizedServices: Partial<ICognitiveModelSet> = this.services.getCognitiveModels();

            // Get skill LUIS model from configuration.
            const luisService: LuisRecognizer | undefined = localizedServices.luisServices? localizedServices.luisServices.get('sampleSkill') : undefined;

            if (luisService !== null){
                const result = stepContext.context.turnState.get(StateProperties.skillLuisResult);
                const intent: string = LuisRecognizer.topIntent(result);
                
                switch(intent.toString()) {
                    case 'Sample': { 

                        await stepContext.beginDialog(this.sampleDialog.id);
                        break;
                    } 
                    case 'None': {

                        await stepContext.context.sendActivity(this.templateEngine.generateActivityForLocale('UnsupportedMessage'));
                        return await stepContext.next();
                        break;
                    }
                }  
            } else {
                throw new Error("The specified LUIS Model could not be found in your Bot Services configuration.");
            } /* PENDING else if (activity.type === ActivityTypes.Event) {
                
                const ev = activity.asEventActivity();
                switch (ev.name) {
                    /* PENDING
                    case "SampleAction": {
                            const actionData: SampleActionInput = '';

                            if (ev.value is JObject eventValue)
                            {
                                actionData = eventValue.ToObject<SampleActionInput>();
                            }

                            // Invoke the SampleAction dialog passing input data if available
                            return await stepContext.beginDialog(SampleAction.name, actionData);
                        }

                    default: {
                        await stepContext.context.sendActivity(new Activity(type: ActivityTypes.Trace, text: $"Unknown Event '{ev.Name ?? "undefined"}' was received but not processed."));
                        break;
                    }  
                }
            }
            */
        }
    }

    // Handles conversation cleanup.
    private async finalStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult>
    {
        if (stepContext.context.IsSkill())
        {
            // EndOfConversation activity should be passed back to indicate that VA should resume control of the conversation
            const endOfConversation: Activity = new Activity(ActivityTypes.EndOfConversation) {
                code = EndOfConversationCodes.CompletedSuccessfully,
                value = stepContext.result,
            };

            await stepContext.context.sendActivities(endOfConversation);
            return await stepContext.endDialog();
        }
        else
        {
            return await stepContext.replaceDialog(Dialog.id, this.templateEngine.GenerateActivityForLocale("CompletedMessage"));
        }
    }

    private async logUserOut(dc: DialogContext): Promise<void> {
        const supported: BotFrameworkAdapter = dc.context.adapter as BotFrameworkAdapter;
        if (supported !== undefined){
            // Sign out user
            const tokens: TokenStatus[] = await supported.getTokenStatus(dc.context, dc.context.activity.from.id)
            tokens.forEach(async (token: TokenStatus): Promise<void> => {
                if (token.connectionName !== undefined) {
                    await supported.signOutUser(dc.context, token.connectionName);
                }
            });

            // Cancel all active dialogs
            await dc.cancelAllDialogs();

        } else {
            throw new Error('OAuthPrompt.SignOutUser(): not supported by the current adapter')
        }
    }
}
