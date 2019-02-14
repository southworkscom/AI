// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License

import {
    ActionTypes,
    Activity,
    Attachment,
    CardFactory,
    CardImage,
    InputHints,
    MessageFactory,
    TurnContext } from 'botbuilder';
import * as i18n from 'i18n';
import {
    DictionaryRenderer,
    LanguageTemplateDictionary,
    TemplateFunction,
    TemplateIdMap} from '../templateManager/dictionaryRenderer';
import { TemplateManager } from '../templateManager/templateManager';

export class OnboardingResponses extends TemplateManager {
    public static responseIds: {
        NamePrompt: string;
        LocationPrompt: string;
        HaveLocation: string;
        AddLinkedAccountsMessage: string;
    } = {
        NamePrompt: 'namePrompt',
        LocationPrompt: 'locationPrompt',
        HaveLocation: 'haveLocation',
        AddLinkedAccountsMessage: 'linkedAccountsInfo'
    };

    private static readonly responseTemplates: LanguageTemplateDictionary = new Map([
        ['default', <TemplateIdMap> new Map([
            [OnboardingResponses.responseIds.NamePrompt, OnboardingResponses.fromResources('onBoarding.namePrompt')],
            [OnboardingResponses.responseIds.LocationPrompt, OnboardingResponses.fromResources('onBoarding.locationPrompt')],
            [OnboardingResponses.responseIds.HaveLocation, OnboardingResponses.fromResources('onBoarding.haveLocation')],
            [OnboardingResponses.responseIds.AddLinkedAccountsMessage,
                // tslint:disable-next-line:no-any
                (context: TurnContext, data: any): Promise<Activity> => OnboardingResponses.BUILD_LINKED_ACCOUNTS_CARD(context, data)]
        ])]
   ]);

   // Constructor
    constructor() {
        super();
        this.register(new DictionaryRenderer(OnboardingResponses.responseTemplates));
    }

    // tslint:disable-next-line:no-any
    public static async BUILD_LINKED_ACCOUNTS_CARD(turnContext: TurnContext, data: any): Promise<Activity> {
        const title: string = i18n.__('onBoarding.linkedAccountsInfoTitle');
        const text: string = i18n.__('onBoarding.linkedAccountsInfoBody');
        const images: (CardImage | string)[] = [
            {
                url: i18n.__('onBoarding.linkedAccountsInfoUrl'),
                alt: i18n.__('onBoarding.linkedAccountsInfoAlt')
            }
        ];
        const attachment: Attachment = CardFactory.heroCard(title, text, images);
        const response: Partial<Activity> = MessageFactory.attachment(attachment, title, InputHints.AcceptingInput);

        response.suggestedActions = {
            actions: [
            {
                title: i18n.__('main.helpBtnText1'),
                type: ActionTypes.ImBack,
                value: i18n.__('main.helpBtnValue1')
            },
            {
                title: i18n.__('main.helpBtnText2'),
                type: ActionTypes.ImBack,
                value: i18n.__('main.helpBtnValue2')
            },
            {
                title: i18n.__('main.helpBtnText3'),
                type: ActionTypes.OpenUrl,
                value: i18n.__('main.helpBtnValue3')
            }
            ],
            to: []
        };

        return Promise.resolve(<Activity> response);
    }

    private static fromResources(name: string): TemplateFunction {
        return (): Promise<string> => Promise.resolve(i18n.__(name));
    }

}
