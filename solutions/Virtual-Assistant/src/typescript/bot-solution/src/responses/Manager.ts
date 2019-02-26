// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ActivityTypes } from 'botbuilder';
import { Activity, AttachmentLayoutTypes, CardFactory, MessageFactory } from 'botbuilder-core';
import { ActionTypes, Attachment, SuggestedActions } from 'botframework-schema';
import * as fs from 'fs';
import * as i18n from 'i18n';
import * as path from 'path';
import { Card } from './card';
import { IcardData } from './cardDataBase';
import { IResponseIdCollection} from './iResponseldCollection';
import { Reply } from './reply';
import { ResponseTemplate } from './responseTemplate';

export class ResponseManager {

    private defaultLocaleKey: string  = 'default';
    private static readonly simpleTokensRegex: RegExp = new RegExp ('@\{(\w+)\}');
    private static readonly complexTokensRegex: RegExp = new RegExp ('@\{(\w+)\}');

    constructor (responseTemplates: IResponseIdCollection[], locales: string[]) {

        this.jsonResponses = new Map<string, Map <string, ResponseTemplate>>();

        responseTemplates.forEach((responseTemplate: IResponseIdCollection) => {
            const resourceName: string = responseTemplate.constructor.name;
            const resource: string = '../resources';
            this.loadResponses(resourceName, resource, undefined);
            locales.forEach((locale: string) => {
                try {
                    this.loadResponses(resourceName, resource, locale);
                } catch {
                    // If satellite assembly doesn't exist, bot will fall back to default.
                }
            });
        });
    }

    public jsonResponses: Map <string, Map <string, ResponseTemplate>> = new Map <string, Map <string, ResponseTemplate>>();

    public getResponse (templateId : string, tokens: Map <string, string> | undefined): Activity {
        const locale: string = i18n.getLocale();
        const template: ResponseTemplate = this.getResponseTemplate(templateId, locale);

        // create the response the data items
        return this.parseResponse(template, tokens);
    }

    public getCardResponse(cards: Card | Card[]): Activity {
        const locale: string  = i18n.getLocale();
        const resourcePath: string = '../resources/cards';
        if (cards instanceof Card) {
            const json: string  = this.loadCardJson(cards.name, locale, resourcePath);
            const attachment: Attachment  = this.buildCardAttachment(json, cards.data);

            return <Activity>MessageFactory.attachment(attachment);
        } else {
            const attachments: Attachment[] = [];
            cards.forEach((card: Card) => {
                const json: string = this.loadCardJson(card.name, locale, resourcePath);
                attachments.push(this.buildCardAttachment(json, card.data));
            });

            return <Activity>MessageFactory.carousel(attachments);
        }
    }

    public getCardResponseWithTemplateId(cards: Card | Card[], templateId: string, tokens: Map<string, string> | undefined): Activity {
        const response: Activity = this.getResponse(templateId, tokens);
        const locale: string  = i18n.getLocale();
        const resourcePath: string = '../resources/cards';
        if (cards instanceof Card) {
            const json: string  = this.loadCardJson(cards.name, locale, resourcePath);
            const attachment: Attachment = this.buildCardAttachment(json, cards.data);

            return <Activity>MessageFactory.attachment(attachment, response.text, response.speak, response.inputHint);
        } else {
            const attachments: Attachment[] = [];
            cards.forEach((card: Card) => {
                const json: string  = this.loadCardJson(card.name, locale, resourcePath);
                attachments.push(this.buildCardAttachment(json, card.data));
            });

            return <Activity>MessageFactory.carousel(attachments, response.text, response.speak, response.inputHint);
        }
    }

    public getResponseTemplate(templateId: string, locale: string | undefined): ResponseTemplate {
        locale = locale !== undefined ? locale : i18n.getLocale();
        // warm up the JsonResponses loading to see if it actually exist.
        // If not, throw with the loading time exception that's actually helpful
        let key: string | undefined = this.getJsonResponseKeyForLocale(templateId, locale);

        // if no matching json file found for locale, try parent language
        if (key === undefined) {
            locale = locale.split('-')[0]
                           .toLocaleLowerCase();
            key = this.getJsonResponseKeyForLocale(templateId, locale);

            // fall back to default
            if (key === undefined) {
                locale = this.defaultLocaleKey;
                key = this.getJsonResponseKeyForLocale(templateId, locale);
            }
        }

        // Get the bot response from the .json file
        const responseLocale: Map<string, ResponseTemplate> | undefined = this.jsonResponses.get(locale);
        let responseKey: ResponseTemplate = new ResponseTemplate('', '');
        if (responseLocale !== undefined && responseLocale.has(key || '')) {
            responseKey = <ResponseTemplate>responseLocale.get(key || '');
        } else {
            throw new Error('Unable to find response' + templateId);
        }

        return <ResponseTemplate>JSON.parse(JSON.stringify(responseKey));
    }

    public format(messageTemplate: string, tokens: Map<string, string> | undefined): string {
        let result: string  = messageTemplate;
        const matches: RegExpExecArray  = <RegExpExecArray>ResponseManager.complexTokensRegex.exec(messageTemplate);
        matches.forEach((match: string) => {
            const bindingJson: string  = match.toString();

            const tokenKey: string = bindingJson;
            tokenKey.replace('{', '');
            tokenKey.replace('}', '');
            result = (tokens !== undefined && tokens.has(tokenKey))
                ? result.replace(bindingJson, tokens.get(tokenKey) || '')
                : result;
        });

        return result;
    }

    private loadResponses(resourceName: string, resourcePath: string, locale: string | undefined): void {
        const resources: string[] = [];
        // if locale is not set, add resources under the default key.
        let localeKey: string = this.defaultLocaleKey;
        if (locale !== undefined) {
            localeKey = i18n.getLocale();
        }

        const jsonFile: string  = path.join(resourcePath, resourceName + '.json');
        const content: Map<string, Object> = require(jsonFile);
        try {
            const localeResponses: Map<string, ResponseTemplate> = new Map<string, ResponseTemplate>();
            content.forEach((value: Object, key: string) => {
                localeResponses.set(key, <ResponseTemplate>value);
            });

            this.jsonResponses.set(localeKey, localeResponses);
        } catch (err) {
            throw new Error('Error');
        }
    }

    private getJsonResponseKeyForLocale(responseId: string, locale: string): string | undefined {
        if (this.jsonResponses.has(locale)) {
            const localeJSON: Map<string, ResponseTemplate> | undefined = this.jsonResponses.get(locale);
            if (localeJSON !== undefined) {

                return localeJSON.has(responseId) ? responseId : undefined;
            }
        }

        return undefined;
    }

    private parseResponse(template: ResponseTemplate, data: Map<string, string> | undefined): Activity {
        const reply: Reply | undefined = template.reply;
        if (!reply) {
            throw new Error('There is no reply in the ResponseTemplate');
        } else {
            if (reply.text) {
                reply.text = this.format(reply.text, data);
            }
            if (reply.speak) {
                reply.speak = this.format(reply.speak, data);
            }
            const activity : Partial <Activity> = {
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

            return <Activity>activity;
        }
    }

    private loadCardJson(cardName: string, locale: string, resourcePath: string): string {
        let jsonFile: string  = path.join(resourcePath, cardName + '.' + locale + '.json');
        let json: string  = '';
        try {
            if (fs.existsSync(jsonFile)) {
                // try to get the localized json
                json = require.resolve(jsonFile);
            } else {
                jsonFile = path.join(resourcePath, cardName + '.json');
                // If the localized file is missing, try falling back to the default language.
                json = require.resolve(jsonFile);
            }
        } catch (err) {
            throw new Error('Could not file Adaptive Card resource ' + jsonFile);
        }

        return json;
    }

    private buildCardAttachment(json: string, data: IcardData | undefined): Attachment {
        // If cardData was provided
        if (data !== undefined) {
            // add all properties to the list
            const tokens: Map<string, string> = new Map<string, string>();
            // get property names from cardData
            Object.entries(data)
            .forEach((entry: [string, string]) => {
                if (!tokens.has(entry[0])) {
                    tokens.set(entry[0], entry[1]);
                }
            });

            // replace tokens in json
            const matches: RegExpExecArray  =  <RegExpExecArray>ResponseManager.simpleTokensRegex.exec(json);
            if (matches) {
                    matches.forEach((match: string) => {
                        json.replace(match, tokens.get(match) || '');
                });
            }
        }
        // Deserialize/Serialize logic is needed to prevent JSON exception in prompts
        const cardJson = require(json);
        const card: Attachment = CardFactory.adaptiveCard(cardJson);
        const cardObj = JSON.parse(JSON.stringify(card));

        return CardFactory.adaptiveCard({

            contentType: 'application/vnd.microsoft.card.adaptive',
            content: cardObj
        });
    }
}
