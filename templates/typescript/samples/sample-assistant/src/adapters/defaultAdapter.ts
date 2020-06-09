/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import {
    ActivityTypes,
    BotFrameworkAdapter,
    BotFrameworkAdapterSettings,
    BotTelemetryClient,
    ConversationState,
    ShowTypingMiddleware, SkillHttpClient,
    TranscriptLoggerMiddleware,
    TranscriptStore,
    TurnContext,
    TelemetryException} from 'botbuilder';
import { AzureBlobTranscriptStore } from 'botbuilder-azure';
import {
    EventDebuggerMiddleware,
    LocaleTemplateManager,
    SetLocaleMiddleware, 
    SetSpeakMiddleware} from 'bot-solutions';
import { TelemetryInitializerMiddleware } from 'botbuilder-applicationinsights';
import { IBotSettings } from '../services/botSettings.js';
import {ActivityEx, SkillsConfiguration} from "bot-solutions/lib";
import {AuthenticationConfiguration} from "botframework-connector";
import {MainDialog} from "../dialogs/mainDialog";
import { Activity, BotFrameworkSkill } from 'botbuilder-core';

export class DefaultAdapter extends BotFrameworkAdapter {

    private readonly conversationState: ConversationState;
    private readonly telemetryClient: BotTelemetryClient;
    private readonly templateManager: LocaleTemplateManager;
    private readonly skillClient: SkillHttpClient;
    private readonly skillsConfig: SkillsConfiguration;

    public constructor(
        settings: Partial<IBotSettings>,
        authConfig: AuthenticationConfiguration,
        templateManager: LocaleTemplateManager,
        conversationState: ConversationState,
        adapterSettings: Partial<BotFrameworkAdapterSettings>,
        telemetryMiddleware: TelemetryInitializerMiddleware,
        telemetryClient: BotTelemetryClient,
        skillsConfig: SkillsConfiguration,
        skillClient: SkillHttpClient
    ) {
        super(adapterSettings);

        this.conversationState = conversationState ?? new Error('conversationState parameter is null');
        this.templateManager = templateManager ?? new Error('templateManager parameter is null');
        this.telemetryClient = telemetryClient ?? new Error('telemetryClient parameter is null');
        this.skillClient = skillClient;
        this.skillsConfig = skillsConfig;

        this.onTurnError = this.handleTurnError;

        if (settings.blobStorage === undefined) {
            throw new Error('There is no blobStorage value in appsettings file');
        }

        const transcriptStore: TranscriptStore = new AzureBlobTranscriptStore({
            containerName: settings.blobStorage.container,
            storageAccountOrConnectionString: settings.blobStorage.connectionString
        });

        this.use(telemetryMiddleware);

        // Uncomment the following line for local development without Azure Storage
        // this.use(new TranscriptLoggerMiddleware(new MemoryTranscriptStore()));
        this.use(new TranscriptLoggerMiddleware(transcriptStore));
        this.use(new SetLocaleMiddleware(settings.defaultLocale || 'en-us'));
        this.use(new ShowTypingMiddleware());
        this.use(new EventDebuggerMiddleware());
        this.use(new SetSpeakMiddleware());
    }

    private async handleTurnError(context: TurnContext, error: Error): Promise<void> {
        // Log any leaked exception from the application.
        console.error(`unhandled error "${error.message}"`);

        await this.sendErrorMessage(context, error);
        await this.endSkillConversation(context);
        await this.clearConversationState(context);
    }

    private async sendErrorMessage(context: TurnContext, error: Error): Promise<void> {
        try {
            const telemetryException: TelemetryException = {
                exception: error
            }

            this.telemetryClient.trackException(telemetryException);

            await context.sendActivity(this.templateManager.generateActivityForLocale("ErrorMessage"));

            // Send a trace activity, which will be displayed in the Bot Framework Emulator.
            // Note: we return the entire exception in the value property to help the developer;
            // this should not be done in production.
            await context.sendTraceActivity("OnTurnError Trace", error.message, "https://www.botframework.com/schemas/error", "TurnError");
        }
        catch (Exception) {
            console.error(`Exception caught in SendErrorMessageAsync "${Exception}"`);
        }
    }

    private async endSkillConversation(context: TurnContext): Promise<void> {
        if (this.skillClient == null || this.skillsConfig == null) {
            return;
        }

        try {
            // Inform the active skill that the conversation is ended so that it has a chance to clean up.
            // Note: the root bot manages the ActiveSkillPropertyName, which has a value while the root bot
            // has an active conversation with a skill.
            const activeSkill = await this.conversationState.createProperty<BotFrameworkSkill>(MainDialog.activeSkillPropertyName).get(context);
            if (activeSkill != null) {
                let endOfConversation = ActivityEx.createEndOfConversationActivity();
                endOfConversation.code = "RootSkillError";
                endOfConversation = TurnContext.applyConversationReference(endOfConversation, TurnContext.getConversationReference(context.activity), true);

                await this.conversationState.saveChanges(context, true);
                await this.skillClient.postToSkill<BotFrameworkSkill>(this.settings.appId, this.settings.appId, activeSkill, this.skillsConfig.skillHostEndpoint, <Activity>endOfConversation);
            }
        }
        catch (Exception) {
            console.error(`Exception caught on attempting to send EndOfConversation: ${Exception}`);
        }
    }

    private async clearConversationState(context: TurnContext): Promise<void> {
        try {
            // Delete the conversationState for the current conversation to prevent the
            // bot from getting stuck in a error-loop caused by being in a bad state.
            // ConversationState should be thought of as similar to "cookie-state" for a Web page.
            await this.conversationState.delete(context);
        }
        catch (Exception) {
            console.error(`Exception caught on attempting to Delete ConversationState: ${Exception}`);
        }
    }
}
