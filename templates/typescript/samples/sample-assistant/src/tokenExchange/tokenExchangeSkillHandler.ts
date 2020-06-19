/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
import {
    Activity,
    ActivityHandlerBase,
    ActivityTypes,
    BotAdapter,
    CallerIdConstants,
    ExtendedUserTokenProvider,
    ResourceResponse,
    SkillConversationIdFactoryBase,
    SkillConversationReference,
    SkillConversationReferenceKey,
    TurnContext
} from 'botbuilder-core'
import { AuthenticationConfiguration, AppCredentials, ICredentialProvider, ClaimsIdentity, JwtTokenValidation, GovernmentConstants, AuthenticationConstants } from 'botframework-connector';
import {ITokenExchangeConfig} from "./ITokenExchangeConfig";
import {ActivityEx, SkillConversationIdFactory, SkillsConfiguration} from "bot-solutions/lib";
import {SkillHandler, SkillHttpClient, BotFrameworkSkill} from "botbuilder";
import {TokenExchangeInvokeRequest} from "botframework-schema"
import {conversationId} from "botframework-connector/lib/connectorApi/models/parameters";

export class TokenExchangeSkillHandler extends SkillHandler {
    //private readonly adapter: BotAdapter;
    private readonly tokenExchangeProvider: ExtendedUserTokenProvider;
    private readonly tokenExchangeConfig: ITokenExchangeConfig;
    private readonly skillsConfig: SkillsConfiguration;
    private readonly skillClient: SkillHttpClient;
    private readonly botId: string;
    private readonly conversationIdFactory: SkillConversationIdFactory;

    public constructor(
        adapter: BotAdapter,
        bot: ActivityHandlerBase,
        configuration: IConfiguration ,
        conversationIdFactory: SkillConversationIdFactory,
        skillsConfig: SkillsConfiguration,
        skillClient: SkillHttpClient,
        credentialProvider: ICredentialProvider,
        authConfig: AuthenticationConfiguration,
        tokenExchangeConfig: ITokenExchangeConfig,
        channelService: string
    ) {
        super(adapter,bot, conversationIdFactory, credentialProvider, authConfig, channelService);
        //this.adapter = adapter;
        this.tokenExchangeProvider = adapter as ExtendedUserTokenProvider;
        this.tokenExchangeConfig = tokenExchangeConfig;
        this.skillsConfig = skillsConfig;
        this.skillClient = skillClient;
        this.conversationIdFactory = conversationIdFactory;

        this.botId = configuration.microsoftAppIdKey;
    }

    protected async onSendToConversation(claimsIdentity: ClaimsIdentity, conversationId: string, activity: Activity):Promise<ResourceResponse> {
        if (this.tokenExchangeConfig !== undefined && await this.interceptOAuthCardsAsync(claimsIdentity, activity)) {
            return new ResourceResponse();
        }

        return await super.onSendToConversation(claimsIdentity, conversationId, activity);
    }

    protected async onReplyToActivity(claimsIdentity: ClaimsIdentity, conversationId: string, activityId: string, activity: Activity): Promise<ResourceResponse> {
        if (this.tokenExchangeConfig !== undefined && await this.interceptOAuthCardsAsync(claimsIdentity, activity)) {
            return new ResourceResponse();
        }

        return await super.onReplyToActivity(claimsIdentity, conversationId, activityId, activity);
    }

    private getCallingSkill(claimsIdentity: ClaimsIdentity):BotFrameworkSkill {
        let appId = JwtTokenValidation.getAppIdFromClaims(claimsIdentity.claims);

        if (appId !== undefined && appId.trim().length > 0) {
            return undefined;
        }

        return this.skillsConfig.skills.values()
    }

    private async interceptOAuthCardsAsync(claimsIdentity: ClaimsIdentity, activity: Activity) {
        if (activity.attachments !== undefined) {
            let targetSkill: BotFrameworkSkill;

        }
    }

    private async sendTokenExchangeInvokeToSkill(incomingActivity:Activity, id: string, token: string, connectionName: string, targetSkill:BotFrameworkSkill) {
        let activity: Activity = ActivityEx.createReply(incomingActivity, )
        activity.type = ActivityTypes.Invoke;
        activity.name = 'signin/tokenExchange';
        activity.value = {
            id: id,
            token: token,
            connectionName: connectionName
        }

        let conversationReference = await this.conversationIdFactory.getSkillConversationReference(incomingActivity.conversation.id);
        activity.conversation = conversationReference.conversationReference.conversation;

        // route the activity to the skill
        let response = await this.skillClient.postActivity(this.botId, targetSkill.appId, targetSkill.skillEndpoint, this.skillsConfig.skillHostEndpoint, activity.conversation.id, activity);

        // Check response status: true if success, false if failure
        return response.status >= 200 && response.status <= 299;
    }
}