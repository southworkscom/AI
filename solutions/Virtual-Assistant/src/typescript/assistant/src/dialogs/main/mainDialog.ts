// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License

import {
    InterruptionAction,
    ISkillDialogOptions,
    ITelemetryLuisRecognizer,
    ITelemetryQnAMaker,
    LocaleConfiguration,
    RouterDialog,
    SkillConfiguration,
    SkillDefinition,
    SkillDialog,
    SkillRouter,
    TelemetryExtensions} from 'bot-solution';
import {
    BotFrameworkAdapter,
    BotTelemetryClient,
    ConversationState,
    RecognizerResult,
    StatePropertyAccessor,
    UserState} from 'botbuilder';
import { LuisRecognizer, QnAMakerResult } from 'botbuilder-ai';
import {
    DialogContext,
    DialogTurnResult,
    DialogTurnStatus } from 'botbuilder-dialogs';
import { EndpointService } from 'botframework-config';
import {
    Activity,
    ActivityTypes } from 'botframework-schema';
import * as i18n from 'i18n';
import { BotServices } from '../../botServices';
import { IVirtualAssistantState } from '../../virtualAssistantState';
import { EscalateDialog } from '../escalate/escalateDialog';
import { OnboardingDialog } from '../onboarding/onboardingDialog';
import { IOnboardingState } from '../onboarding/onboardingState';
import { MainResponses } from './mainResponses';

export class MainDialog extends RouterDialog {

    // Fields
    private readonly services: BotServices;
    private readonly userState: UserState;
    private readonly conversationState: ConversationState;
    private readonly endpointService: EndpointService;
    private readonly onboardingState: StatePropertyAccessor<IOnboardingState>;
    private readonly parametersAccessor: StatePropertyAccessor<Map<string, object>>;
    private readonly virtualAssistantState: StatePropertyAccessor<IVirtualAssistantState>;
    private readonly responder: MainResponses = new MainResponses();
    private skillRouter!: SkillRouter;

    private conversationStarted: boolean = false;

    // Initialize the dialog class properties
    constructor(services: BotServices,
                conversationState: ConversationState,
                userState: UserState,
                endpointService: EndpointService,
                telemetryClient: BotTelemetryClient) {
        super(MainDialog.name, telemetryClient);

        if (services) {
            this.services = services;
        } else {
            throw new Error(('Missing parameter.  services is required'));
        }

        this.conversationState = conversationState;
        this.userState = userState;
        this.endpointService = endpointService;
        // this.TelemetryClient = telemetryClient; // ComponentDialog property, dependencies should be resolved for this to work
        this.onboardingState = this.userState.createProperty<IOnboardingState>('IOnboardingState'); // nameof(OnboardingState)
        this.parametersAccessor = this.userState.createProperty<Map<string, object>>('userInfo');
        // nextline: nameof(VirtualAssistanState)
        this.virtualAssistantState = this.conversationState.createProperty<IVirtualAssistantState>('VirtualAssistantState');

        this.addDialog(new OnboardingDialog(this.services, this.onboardingState, telemetryClient));
        this.addDialog(new EscalateDialog(this.services, telemetryClient));

        this.registerSkills(this.services.skillDefinitions);
    }

    protected async onStart(dc: DialogContext): Promise<void> {
        // if the onStart call doesn't have the locale info in the activity, we don't take it as a startConversation call
        if (dc.context.activity.locale) {
            await this.startConversation(dc);

            this.conversationStarted = true;
        }
    }
    // tslint:disable-next-line:max-func-body-length
    protected async route(dc: DialogContext): Promise<void> {
        const parameters: Map<string, object> = await this.parametersAccessor.get(dc.context, new Map<string, object>());
        const virtualAssistantState: IVirtualAssistantState = await this.virtualAssistantState.get(dc.context, {});
        // get current activity locale
        const locale: string = i18n.getLocale();
        const localeConfig: LocaleConfiguration = (this.services.localeConfigurations.get(locale) || new LocaleConfiguration());

        // No dialog is currently on the stack and we haven't responded to the user
        // Check dispatch result
        const dispatchResult: RecognizerResult = await localeConfig.dispatchRecognizer.recognize(dc, true);
        const intent: string = LuisRecognizer.topIntent(dispatchResult);

        switch (intent) {
            case 'l_General': { //Dispatch.Intent.l_General:
                // If dispatch result is general luis model
                const luisService: ITelemetryLuisRecognizer | undefined = (localeConfig.luisServices.get(LocaleConfigurationKeys.general));
                if (luisService) {
                    const luisResult: RecognizerResult =  await luisService.recognize(dc, true);
                    if (luisResult) {
                        const luisIntent: string = LuisRecognizer.topIntent(luisResult);

                        // switch on general intents
                        if (luisResult.intents[luisIntent].score > 0.5) {
                            switch (luisIntent) {
                                case 'Greeting': {
                                    // send greeting response
                                    await this.responder.replyWith(dc.context, MainResponses.responseIds.greeting);
                                    break;
                                }
                                case 'Help': {
                                    // send help response
                                    await this.responder.replyWith(dc.context, MainResponses.responseIds.help);
                                    break;
                                }
                                case 'Cancel': {
                                    // if this was triggered, then there is no active dialog
                                    await this.responder.replyWith(dc.context, MainResponses.responseIds.noActiveDialog);
                                    break;
                                }
                                case 'Escalate': {
                                    // start escalate dialog
                                    await dc.beginDialog(EscalateDialog.name);
                                    break;
                                }
                                case 'Logout': {
                                    await this.logout(dc);
                                    break;
                                }
                                case 'Next':
                                case 'Previous':
                                case 'ReadMore': {
                                    const lastExecutedIntent: string | undefined = virtualAssistantState.lastIntent;
                                    if (lastExecutedIntent) {
                                        const skillDialogOption: ISkillDialogOptions = {
                                            skillDefinition: this.skillRouter.identifyRegisteredSkill(lastExecutedIntent),
                                            parameters: parameters
                                        };
                                        await this.routeToSkill(dc, skillDialogOption);
                                    }
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
                }

                break;
            }
            case 'l_Calendar':
            case 'l_Email':
            case 'l_ToDo':
            case 'l_PointOfInterest': {
                virtualAssistantState.lastIntent = intent;
                const skillDialogOption: ISkillDialogOptions = {
                    skillDefinition: this.skillRouter.identifyRegisteredSkill(intent),
                    parameters: parameters
                };
                await this.routeToSkill(dc, skillDialogOption);
                break;
            }
            case 'q_FAQ': {
                const qnaService: ITelemetryQnAMaker | undefined = localeConfig.qnaServices.get(LocaleConfigurationKeys.faq);
                if (qnaService) {
                    const answers: QnAMakerResult[] = await qnaService.getAnswers(dc.context);
                    if (answers && answers.length > 0) {
                        await this.responder.replyWith(dc.context, MainResponses.responseIds.qna, answers[0].answer);
                    }
                }

                break;
            }
            case 'None':
            default: {
                // No intent was identified, send confused message
                await this.responder.replyWith(dc.context, MainResponses.responseIds.confused);
            }
        }
    }

    protected async complete(dc: DialogContext, result?: DialogTurnResult): Promise<void> {
        await this.responder.replyWith(dc.context, MainResponses.responseIds.completed);

        // End active dialog
        await dc.endDialog(result);
    }

    protected async onEvent(dc: DialogContext): Promise<void> {
        // Indicates whether the event activity should be sent to the active dialog on the stack
        let forward: boolean = true;
        const ev: Activity = dc.context.activity;
        const parameters: Map<string, object> = await this.parametersAccessor.get(dc.context, new Map<string, object>());

        if (ev.name) {
            // Send trace to emulator
            const trace: Partial<Activity> = {
                type: ActivityTypes.Trace,
                text: `Received event: ${ev.name}` };
            await dc.context.sendActivity(trace);

            switch (ev.name) {
                case Events.timezoneEvent: {
                    try {
                        /** PENDING - how to handle TimeZones in TypeScript?
                         * var timezone = ev.Value.ToString();
                         * var tz = TimeZoneInfo.FindSystemTimeZoneById(timezone);
                         * parameters[ev.Name] = tz;
                         */
                    } catch (err) {
                        const activity: Partial<Activity> = { type: ActivityTypes.Trace,
                            text: 'Timezone passed could not be mapped to a valid Timezone. Property not set.' };
                        await dc.context.sendActivity(activity);
                    }
                    forward = false;
                    break;
                }
                case Events.locationEvent: {
                    parameters.set(ev.name, ev.value);
                    forward = false;
                    break;
                }
                case Events.tokenResponseEvent: {
                    forward = true;
                    break;
                }
                case Events.activeLocationUpdate:
                case Events.activeRouteUpdate: {
                    const skillDialogOption: ISkillDialogOptions = {
                        // Intent from skill needed, LUISGen not generating things right, an issue should be opened
                        skillDefinition: this.skillRouter.identifyRegisteredSkill('l_PointOfInterest'),
                        parameters: new Map<string, Object>()
                    };
                    await this.routeToSkill(dc, skillDialogOption);
                    forward = false;
                    break;
                }
                case Events.resetUser: {
                    const activity: Partial<Activity> = {
                        type: ActivityTypes.Trace,
                        text: 'Reset User Event received, clearing down State and Tokens.' };
                    await dc.context.sendActivity(activity);
                    // Clear state
                    await this.onboardingState.delete(dc.context);
                    // CLear tokens
                    const adapter: BotFrameworkAdapter = <BotFrameworkAdapter> dc.context.adapter;
                    if (adapter) {
                        await adapter.signOutUser(dc.context, '');
                    }

                    forward = false;
                    break;
                }
                case Events.startConversation: {
                    forward = false;
                    if (!this.conversationStarted) {
                        if (!dc.context.activity.locale) {
                            TelemetryExtensions.trackEventEx(
                                this.telemetryClient,
                                'NoLocaleInStartConversation',
                                dc.context.activity,
                                (dc.activeDialog ? dc.activeDialog.id : undefined));
                            break;
                        }

                        await this.startConversation(dc);
                        this.conversationStarted = true;
                    }

                    break;
                }
                default: {
                    const activity: Partial<Activity> = {
                        type: ActivityTypes.Trace,
                        text: `Unknown Event ${ev.name} was received but not processed.` };
                    await dc.context.sendActivity(activity);
                    forward = false;
                }
            }

            if (forward) {
                const result: DialogTurnResult = await dc.continueDialog();
                if (result.status === DialogTurnStatus.complete) {
                    await this.complete(dc);
                }
            }
        }
    }

    private async startConversation(dc: DialogContext): Promise<void> {
        const view: MainResponses = new MainResponses();
        await view.replyWith(dc.context, MainResponses.responseIds.intro);
    }

    private async routeToSkill(dc: DialogContext, options: ISkillDialogOptions): Promise<void> {
        // If we can't handle this within the local Bot it's a skill (prefix of s will make this clearer)
        if (options.skillDefinition !== undefined) {
            const activity: Partial<Activity> = {
                type: ActivityTypes.Trace,
                text: `-->Forwarding your utterance to the ${options.skillDefinition.name} skill.`
            };

            // We have matched to a Skill
            await dc.context.sendActivity(activity);

            // Begin the SkillDialog and pass the arguments in
            await dc.beginDialog(options.skillDefinition.id, options);

            // Pass the activity we have
            const result: DialogTurnResult = await dc.continueDialog();

            if (result.status === DialogTurnStatus.complete) {
                await this.complete(dc);
            }
        }
    }

    private async logout(dc: DialogContext): Promise<InterruptionAction> {
        let adapter: BotFrameworkAdapter;
        const supported: boolean = dc.context.adapter instanceof BotFrameworkAdapter;
        if (!supported) {
            throw new Error('OAuthPrompt.SignOutUser(): not supported by the current adapter');
        } else {
            adapter = <BotFrameworkAdapter> dc.context.adapter;
        }

        await dc.cancelAllDialogs();

        // Sign out user
        /** PENDING
         * const tokens = await adapter.getTokenStatus(dc.Context, dc.Context.Activity.From.Id);
         * foreach (var token in tokens)
         * {
         *     await adapter.SignOutUserAsync(dc.Context, token.ConnectionName);
         * }
         *
         * await dc.Context.SendActivityAsync(MainStrings.LOGOUT);
         */
        return InterruptionAction.StartedDialog;
    }

    private registerSkills(skillDefinitions: SkillDefinition[]): void {
        skillDefinitions.forEach((definition: SkillDefinition) => {
            this.addDialog(new SkillDialog(
                definition,
                this.services.skillConfigurations.get(definition.id) || new SkillConfiguration(),
                this.endpointService,
                this.telemetryClient));
        });

        // Initialize skill dispatcher
        this.skillRouter = new SkillRouter(this.services.skillDefinitions);
    }
}

namespace Events {
    export const tokenResponseEvent: string = 'tokens/response';
    export const timezoneEvent: string = 'IPA.Timezone';
    export const locationEvent: string = 'IPA.Location';
    export const activeLocationUpdate: string = 'POI.ActiveLocation';
    export const activeRouteUpdate: string = 'POI.ActiveRoute';
    export const resetUser: string = 'IPA.ResetUser';
    export const startConversation: string = 'startConversation';
}

namespace LocaleConfigurationKeys {
    export const general: string = 'general';
    export const faq: string = 'faq';
}
