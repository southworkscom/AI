// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License

import {
    Activity,
    CardFactory,
    InputHints,
    MessageFactory,
    TurnContext } from 'botbuilder';
import {
    ActionTypes,
    Attachment,
    ThumbnailCard } from 'botframework-schema';
import * as i18n from 'i18n';
import { ActivityExtensions } from '../../extensions/activityExtensions';
import {
    DictionaryRenderer,
    LanguageTemplateDictionary,
    TemplateFunction,
    TemplateIdMap } from '../templateManager/dictionaryRenderer';
import { TemplateManager } from '../templateManager/templateManager';

export class MainResponses extends TemplateManager {

    // Declare here the type of properties and the prompts
    public static responseIds: {
        cancelled: string;
        completed: string;
        confused: string;
        greeting: string;
        help: string;
        intro: string;
        error: string;
        noActiveDialog: string;
        qna: string;
    } = {
        cancelled: 'cancelled',
        completed: 'completed',
        confused: 'confused',
        greeting: 'greeting',
        help: 'help',
        intro: 'intro',
        error: 'error',
        noActiveDialog: 'noActiveDialog',
        qna: 'qna'
    };

    // Declare the responses map prompts
    private static readonly responseTemplates: LanguageTemplateDictionary = new Map([
        ['default', <TemplateIdMap> new Map([
            [MainResponses.responseIds.cancelled, MainResponses.fromResources('main.cancelled')],
            [MainResponses.responseIds.noActiveDialog, MainResponses.fromResources('main.noActiveDialog')],
            [MainResponses.responseIds.completed, MainResponses.fromResources('main.completed')],
            [MainResponses.responseIds.confused, MainResponses.fromResources('main.confused')],
            [MainResponses.responseIds.greeting, MainResponses.fromResources('main.greeting')],
            [MainResponses.responseIds.error, MainResponses.fromResources('main.error')],
            [MainResponses.responseIds.help,
                // tslint:disable-next-line:no-any
                (context: TurnContext, data: any): Promise<Activity>  => MainResponses.BuildHelpCard(context, data)],
                [MainResponses.responseIds.intro,
                    // tslint:disable-next-line:no-any
                    (context: TurnContext, data: any): Promise<Activity>  => MainResponses.BuildIntroCard(context, data)],
                    [MainResponses.responseIds.qna,
                        // tslint:disable-next-line:no-any
                        (context: TurnContext, data: any): Promise<Activity>  => MainResponses.BuildQnACard(context, data)]
                    ])]
                ]);

    // Initialize the responses class properties
    constructor() {
        super();
        this.register(new DictionaryRenderer(MainResponses.responseTemplates));
    }

    // tslint:disable-next-line:no-any
    public static BuildHelpCard(context: TurnContext, data: any): Promise<Activity> {
        const title: string = i18n.__('main.helpTitle');
        const text: string = i18n.__('main.helpText');
        const attachment: Attachment = CardFactory.heroCard(title, text);
        const response: Partial<Activity> = MessageFactory.attachment(attachment, '', text, InputHints.AcceptingInput);

        response.suggestedActions = {
            actions: [
            {
                title: i18n.__('main.calendarSuggestedAction'),
                type: ActionTypes.ImBack,
                value: undefined
            },
            {
                title: i18n.__('main.emailSuggestedAction'),
                type: ActionTypes.ImBack,
                value: undefined
            },
            {
                title: i18n.__('main.meetingSuggestedAction'),
                type: ActionTypes.ImBack,
                value: undefined
            },
            {
                title: i18n.__('main.poiSuggestedAction'),
                type: ActionTypes.ImBack,
                value: undefined
            }
            ],
            to: []
        };

        return Promise.resolve(<Activity> response);
    }

    // tslint:disable-next-line:no-any
    public static BuildIntroCard(context: TurnContext, data: any): Promise<Activity> {
        const introPath: string = i18n.__('main.introPath');
        // tslint:disable-next-line:no-any non-literal-require
        const introCard: any = require(introPath);
        const attachment: Attachment = CardFactory.adaptiveCard(introCard);

        return Promise.resolve(<Activity>MessageFactory.attachment(attachment, '', introCard.speak, InputHints.AcceptingInput));
    }

    // tslint:disable-next-line:no-any
    public static BuildQnACard(context: TurnContext, answer: any): Promise<Activity> {
        const response: Partial<Activity> = ActivityExtensions.createReply(context.activity);

        try {
            const card: ThumbnailCard = <ThumbnailCard> JSON.parse(answer); // JsonConvert.DeserializeObject<ThumbnailCard>(answer);

            response.attachments = [
                CardFactory.thumbnailCard(card.title, card.images, card.buttons, card)
            ];
            response.speak =  card.title ? `"${card.title} "` : '';
            response.speak += card.subtitle ? `"${card.subtitle} "` : '';
            response.speak += card.text ? `"${card.text} "` : '';
        } catch (err) {
            response.text = answer;
        }

        return Promise.resolve(<Activity> response);
    }

    private static fromResources(name: string): TemplateFunction {
        return (): Promise<string> => Promise.resolve(i18n.__(name));
    }
}
