/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
import {
    Activity,
    ActivityHandlerBase,
    ActivityTypes,
    BotAdapter,
    ExtendedUserTokenProvider,
    ResourceResponse,
    TurnContext
} from 'botbuilder-core';
import {
    AuthenticationConfiguration,
    ClaimsIdentity,
    JwtTokenValidation,
    SimpleCredentialProvider
} from 'botframework-connector';
import {ITokenExchangeConfig} from './tokenExchangeConfig';
import {ActivityEx, SkillConversationIdFactory, SkillsConfiguration, IEnhancedBotFrameworkSkill} from 'bot-solutions/lib';
import {SkillHandler, SkillHttpClient, BotFrameworkSkill, BotFrameworkAdapter} from 'botbuilder';
import {OAuthCard, Attachment, TokenExchangeRequest} from 'botframework-schema'
import { uuid } from '../utils';
import * as appsettings from '../appsettings.json';

// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
//@ts-ignore
export class TokenExchangeSkillHandler extends SkillHandler {
    private readonly adapter: BotAdapter;
    private readonly tokenExchangeProvider: ExtendedUserTokenProvider;
    private readonly tokenExchangeConfig: ITokenExchangeConfig;
    private readonly skillsConfig: SkillsConfiguration;
    private readonly skillClient: SkillHttpClient;
    private readonly botId: string;
    private readonly conversationIdFactory: SkillConversationIdFactory;
    private readonly oAuthCardContentType: string = 'application/vnd.microsoft.card.oauth'

    public constructor(
        adapter: BotAdapter,
        bot: ActivityHandlerBase,
        conversationIdFactory: SkillConversationIdFactory,
        skillClient: SkillHttpClient,
        credentialProvider: SimpleCredentialProvider,
        authConfig: AuthenticationConfiguration,
        tokenExchangeConfig: ITokenExchangeConfig,
        skillsConfig: SkillsConfiguration
    ) {
        super(adapter,bot, conversationIdFactory, credentialProvider, authConfig);
        this.adapter = adapter;
        this.tokenExchangeProvider = adapter as BotFrameworkAdapter;
        this.tokenExchangeConfig = tokenExchangeConfig;
        this.skillsConfig = skillsConfig;
        this.skillClient = skillClient;
        this.conversationIdFactory = conversationIdFactory;
        this.botId = appsettings.microsoftAppId;
    }

    protected async onSendToConversation(claimsIdentity: ClaimsIdentity, conversationId: string, activity: Activity): Promise<ResourceResponse> {
        if (this.tokenExchangeConfig !== undefined && await this.interceptOAuthCards(claimsIdentity, activity)) {
            return { id: uuid().toString()};
        }

        return await super.onSendToConversation(claimsIdentity, conversationId, activity);
    }

    protected async onReplyToActivity(claimsIdentity: ClaimsIdentity, conversationId: string, activityId: string, activity: Activity): Promise<ResourceResponse> {
        if (this.tokenExchangeConfig !== undefined && await this.interceptOAuthCards(claimsIdentity, activity)) {
            return { id: uuid().toString()};
        }

        return await super.onReplyToActivity(claimsIdentity, conversationId, activityId, activity);
    }

    private getCallingSkill(claimsIdentity: ClaimsIdentity): BotFrameworkSkill | undefined {
        const appId = JwtTokenValidation.getAppIdFromClaims(claimsIdentity.claims);

        if (appId !== undefined && appId.trim().length > 0) {
            return undefined;
        }

        return Array.from(this.skillsConfig.skills.values())
            .find((s: IEnhancedBotFrameworkSkill) => {
                s.appId.toLowerCase() === appId.toLowerCase();
            });
    }

    private async interceptOAuthCards(claimsIdentity: ClaimsIdentity, activity: Activity): Promise<boolean> {
        if (activity.attachments !== undefined) {
            let targetSkill: BotFrameworkSkill;
            activity.attachments.filter(a => a.contentType == this.oAuthCardContentType).forEach(async (attachment: Attachment): Promise<boolean> => {
                if (targetSkill === undefined) {
                    targetSkill = this.getCallingSkill(claimsIdentity) as IEnhancedBotFrameworkSkill;
                }

                if (targetSkill === undefined) {
                    const oauthCard = attachment.content as OAuthCard;
                    
                    if (oauthCard !== undefined && oauthCard.tokenExchangeResource !== undefined && this.tokenExchangeConfig !== undefined && this.tokenExchangeConfig.provider !== undefined && this.tokenExchangeConfig.provider !== '' && this.tokenExchangeConfig.provider === oauthCard.tokenExchangeResource.providerId) {
                        const context = new TurnContext(this.adapter, activity);

                        context.turnState.set(this.adapter.BotIdentityKey, claimsIdentity);

                        // AAD token exchange
                        const result = await this.tokenExchangeProvider.exchangeToken(
                            context,
                            activity.recipient?.id,
                            this.tokenExchangeConfig.connectionName,
                            { Uri: oauthCard.tokenExchangeResource.uri } as TokenExchangeRequest);

                        if (result.token !== undefined && result.token !== ''){
                            // Send an Invoke back to the Skill
                            return await this.sendTokenExchangeInvokeToSkill(activity, oauthCard.tokenExchangeResource.id as string,result.token, oauthCard.connectionName, targetSkill);
                        }
                        return false;
                    }
                }

                return false;
            });

        }
        
        return false;
    }

    private async sendTokenExchangeInvokeToSkill(incomingActivity: Activity, id: string, token: string, connectionName: string, targetSkill: BotFrameworkSkill): Promise<boolean> {
        const activity: Activity = ActivityEx.createReply(incomingActivity);
        activity.type = ActivityTypes.Invoke;
        activity.name = 'signin/tokenExchange';
        activity.value = {
            id: id,
            token: token,
            connectionName: connectionName
        };

        const conversationReference = await this.conversationIdFactory.getSkillConversationReference(incomingActivity.conversation.id);
        activity.conversation = conversationReference.conversationReference.conversation;

        // route the activity to the skill
        const response = await this.skillClient.postActivity(this.botId, targetSkill.appId, targetSkill.skillEndpoint, this.skillsConfig.skillHostEndpoint, activity.conversation.id, activity);

        // Check response status: true if success, false if failure
        return response.status >= 200 && response.status <= 299;
    }
}