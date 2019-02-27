// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ActivityTypes } from 'botbuilder';
import { Activity, AttachmentLayoutTypes, CardFactory, MessageFactory } from 'botbuilder-core';
import { ActionTypes, Attachment, SuggestedActions } from 'botframework-schema';
import * as fs from 'fs';
import { getLocale } from 'i18n';
import * as path from 'path';
import { Card } from './card';
import { IcardData } from './cardDataBase';
import { IResponseIdCollection} from './iResponseldCollection';
import { Reply } from './reply';
import { ResponseTemplate } from './responseTemplate';
import { strictEqual } from 'assert';

export class ResponseManager {

    private readonly defaultLocaleKey: string  = 'default';
    private static readonly simpleTokensRegex: RegExp = /\{(\w+)\}/g.compile();
    private static readonly complexTokensRegex: RegExp = /\{[^{\}]+(?=})\}/g.compile();

    constructor(responseTemplates: IResponseIdCollection[], locales: string[]) {

        this.jsonResponses = new Map();

        responseTemplates.forEach((responseTemplate: IResponseIdCollection) => {
            const resourceName: string = responseTemplate.constructor.name;
            const resource: string = '../resources';
            this.loadResponses(resourceName, resource);
            locales.forEach((locale: string) => {
                try {
                    this.loadResponses(resourceName, resource, locale);
                } catch {
                    // If satellite assembly doesn't exist, bot will fall back to default.
                }
            });
        });
    }

    public jsonResponses: Map<string, Map<string, ResponseTemplate>>;

    public getResponse(templateId: string, tokens?: Map<string, string>): Partial<Activity> {
        const locale: string = getLocale();
        const template: ResponseTemplate = this.getResponseTemplate(templateId, locale);

        // create the response the data items
        return this.parseResponse(template, tokens);
    }

    public getCardResponse(cards: Card|Card[]): Partial<Activity> {
        const locale: string = getLocale();
        const resourcePath: string = '../resources/cards';

        if (cards instanceof Card) {
            const json: string  = this.loadCardJson(cards.name, locale, resourcePath);
            const attachment: Attachment = this.buildCardAttachment(json, cards.data);

            return MessageFactory.attachment(attachment);
        } else {
            const attachments: Attachment[] = [];

            cards.forEach((card: Card) => {
                const json: string = this.loadCardJson(card.name, locale, resourcePath);
                attachments.push(this.buildCardAttachment(json, card.data));
            });

            return MessageFactory.carousel(attachments);
        }
    }

    public getCardResponseWithTemplateId(templateId: string, cards: Card|Card[], tokens?: Map<string, string>): Partial<Activity> {
        const response: Partial<Activity> = this.getResponse(templateId, tokens);
        const locale: string = getLocale();
        const resourcePath: string = '../resources/cards';

        if (cards instanceof Card) {
            const json: string = this.loadCardJson(cards.name, locale, resourcePath);
            const attachment: Attachment = this.buildCardAttachment(json, cards.data);

            return MessageFactory.attachment(attachment, response.text, response.speak, response.inputHint);
        } else {
            const attachments: Attachment[] = [];

            cards.forEach((card: Card) => {
                const json: string  = this.loadCardJson(card.name, locale, resourcePath);
                attachments.push(this.buildCardAttachment(json, card.data));
            });

            return MessageFactory.carousel(attachments, response.text, response.speak, response.inputHint);
        }
    }

    public getResponseTemplate(templateId: string, locale?: string): ResponseTemplate {
        locale = locale !== undefined ? locale : getLocale();

        // warm up the JsonResponses loading to see if it actually exist.
        // If not, throw with the loading time exception that's actually helpful
        let key: string|undefined = this.getJsonResponseKeyForLocale(templateId, locale);

        // if no matching json file found for locale, try parent language
        if (key === undefined) {
            locale = locale.split('-')[0].toLowerCase();
            key = this.getJsonResponseKeyForLocale(templateId, locale);

            // fall back to default
            if (key === undefined) {
                locale = this.defaultLocaleKey;
                key = this.getJsonResponseKeyForLocale(templateId, locale);
            }
        }

        if (key === undefined) {
            throw new Error();
        }

        // Get the bot response from the .json file
        const responseLocale: Map<string, ResponseTemplate>|undefined = this.jsonResponses.get(locale);
        if (!responseLocale || !responseLocale.has(key)) {
            throw new Error('Unable to find response' + templateId);
        }

        const response: ResponseTemplate|undefined = responseLocale.get(key);
        if (response === undefined) {
            throw new Error();
        }

        return response;
    }

    public format(messageTemplate: string, tokens?: Map<string, string>): string {
        let result: string  = messageTemplate;

        ResponseManager.complexTokensRegex.lastIndex = 0;
        let match: RegExpExecArray|null = ResponseManager.complexTokensRegex.exec(result);
        while (match) {
            const bindingJson: string = match[0];

            const tokenKey: string = bindingJson
                .replace('{', '')
                .replace('}', '');

            if (tokens && tokens.has(tokenKey)) {
                result = result.replace(bindingJson, tokens.get(tokenKey) || '');
            }

            match = ResponseManager.complexTokensRegex.exec(result);
        }

        return result;
    }

    private loadResponses(resourceName: string, resourcePath: string, locale?: string): void {
        // if locale is not set, add resources under the default key.
        const localeKey: string = (locale !== undefined) ? locale : this.defaultLocaleKey;

        let jsonPath: string = path.join(resourcePath, `${resourceName}.${localeKey}.json`);

        try {
            require.resolve(jsonPath);
        } catch (errLocale) {
            jsonPath = path.join(resourcePath, `${resourceName}.json`);

            // Search for the common resource
            try {
                require.resolve(jsonPath);
            } catch (err) {
                throw new Error(`Unable to find '${resourceName}' in '${resourcePath}'`);
            }
        }

        try {
            const content: Map<string, { replies: Reply[], suggestedActions: string[], inputHint: string }> = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

            const localeResponses: Map<string, ResponseTemplate> = this.jsonResponses.get(localeKey) || new Map<string, ResponseTemplate>();

            content.forEach((value: { replies: Reply[], suggestedActions: string[], inputHint: string }, key: string) => {
                const template: ResponseTemplate = Object.assign(new ResponseTemplate(), value);
                localeResponses.set(key, template);
            });

            this.jsonResponses.set(localeKey, localeResponses);
        } catch (err) {
            throw new Error(`Error deserializing ${jsonPath}`);
        }
    }

    private getJsonResponseKeyForLocale(responseId: string, locale: string): string|undefined {
        if (this.jsonResponses.has(locale)) {
            const localeResponses: Map<string, ResponseTemplate>|undefined = this.jsonResponses.get(locale);
            if (localeResponses) {
                return localeResponses.has(responseId) ? responseId : undefined;
            }
        }

        return undefined;
    }

    private parseResponse(template: ResponseTemplate, data?: Map<string, string>): Partial<Activity> {
        const reply: Reply|undefined = template.reply;
        if (!reply) {
            throw new Error('There is no reply in the ResponseTemplate');
        }

        if (reply.text) {
            reply.text = this.format(reply.text, data);
        }

        if (reply.speak) {
            reply.speak = this.format(reply.speak, data);
        }

        const activity: Partial<Activity> = {
            type: ActivityTypes.Message,
            text: reply.text,
            speak: reply.speak,
            inputHint: template.inputHint
        };

        if (template.suggestedActions && template.suggestedActions.length > 0) {
            activity.suggestedActions = {
                actions: [],
                to: []
            };

            template.suggestedActions.forEach((action: string) => {
                if (activity.suggestedActions) {
                    activity.suggestedActions.actions.push({
                        type: ActionTypes.ImBack,
                        title: action,
                        value: action
                    });
                }
            });
        }

        activity.attachments = [];

        return activity;
    }

    private loadCardJson(cardName: string, locale: string, resourcePath: string): string {
        let jsonFile: string = path.join(resourcePath, `${cardName}.${locale}.json`);

        try {
            require.resolve(jsonFile);
        } catch (errLocale) {
            try {
                jsonFile = path.join(resourcePath, `${cardName}.json`);
                require.resolve(jsonFile);
            } catch (error) {
                throw new Error(`Could not file Adaptive Card resource ${jsonFile}`);
            }
        }

        return fs.readFileSync(jsonFile, 'utf8');
    }

    private buildCardAttachment(json: string, data?: IcardData): Attachment {
        // If cardData was provided
        if (data !== undefined) {
            // add all properties to the list
            const tokens: Map<string, string> = new Map<string, string>();
            // get property names from cardData
            Object.entries(data).forEach((entry: [string, string]) => {
                if (!tokens.has(entry[0])) {
                    tokens.set(entry[0], entry[1]);
                }
            });

            // replace tokens in json
            ResponseManager.simpleTokensRegex.lastIndex = 0;
            let match: RegExpExecArray|null = ResponseManager.simpleTokensRegex.exec(json);
            while (match) {
                if (tokens.has(match[0])) {
                    json = json.replace(match[0], tokens.get(match[0]) || '');
                }

                match = ResponseManager.simpleTokensRegex.exec(json);
            }
        }

        // Deserialize/Serialize logic is needed to prevent JSON exception in prompts
        const cardObj: Object = JSON.parse(json);
        const card: Attachment = CardFactory.adaptiveCard(cardObj);

        return card;
    }
}
