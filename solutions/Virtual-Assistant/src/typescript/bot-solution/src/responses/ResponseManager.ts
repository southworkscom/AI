// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ResponseTemplate } from './responseTemplate'
import { Reply } from './reply';
import { Activity, MessageFactory, AttachmentLayoutTypes } from 'botbuilder-core';
import { ActivityTypes } from 'botbuilder';
import { Attachment, SuggestedActions, ActionTypes } from 'botframework-schema';
import { IResponseIdCollection} from './iResponseldCollection'
import { Card } from './card';
import * as path from 'path';
import * as fs from 'fs';

export class ResponseManager{

    private defaultLocaleKey: string  = "default";
    private static readonly simpleTokensRegex: RegExp = new RegExp ("@\{(\w+)\}");
    private static readonly complexTokensRegex: RegExp = new RegExp ("@\{(\w+)\}");

    constructor (responseTemplates: IResponseIdCollection[], locales: string[]) {
        
        this.jsonResponses = new Map<string, Map <string, ResponseTemplate>>();
        
        responseTemplates.forEach((responseTemplate: IResponseIdCollection) => {
            const resourceName = responseTemplate.constructor.name;
            const resource = '../resources';
            this.loadResponses(resourceName, resource, undefined);
            locales.forEach((locale: string) => {
                try {
                    this.loadResponses(resourceName,resource, locale);
                }
                catch {
                    // If satellite assembly doesn't exist, bot will fall back to default.
                }
            });
        });
    }

    public jsonResponses = new Map <string, Map <string, ResponseTemplate>>();

    public getResponse (templateId : string, tokens: Map <string, string> | undefined): Activity {

        // PENDING use i18n for locale
        let locale = "";
        let template = this.getResponseTemplate(templateId, locale);

        // create the response the data items
        return this.parseResponse(template, tokens);
    }

    public getResponseTemplate(templateId: string, locale: string | undefined): ResponseTemplate{
        // PENDING use i18n for locale
        locale = "";

        // warm up the JsonResponses loading to see if it actually exist. If not, throw with the loading time exception that's actually helpful
        let key = this.getJsonResponseKeyForLocale(templateId, locale);

        // if no matching json file found for locale, try parent language
        if(key === undefined){
            locale = locale.split("-")[0].toLocaleLowerCase();
            key = this.getJsonResponseKeyForLocale(templateId, locale);

            // fall back to default
            if(key === undefined){
                locale = this.defaultLocaleKey;
                key = this.getJsonResponseKeyForLocale(templateId, locale);
            }
        }

        if(key){
            // Get the bot response from the .json file
            let responseLocale = this.jsonResponses.get(locale);
            if(responseLocale && responseLocale.has(key)){
                let responseKey = responseLocale.get(key);
                if(responseKey){
                    // PENDING analyze how to return a jsonConvert.DeserializeObject 
                } 
            }
            else{
                throw new Error("Unable to find response" + templateId);
            }
        }
    }

    public format(messageTemplate: string, tokens: Map<string,string> | undefined): string{
        let result = messageTemplate;
        let matches = ResponseManager.complexTokensRegex.exec(messageTemplate);
        if(matches){
            matches.forEach((match: string) => {
                let bindingJson = match.toString();
    
                let tokenKey = bindingJson;
                    tokenKey.replace('{', '')
                    tokenKey.replace('}', '');
                result = (tokens && tokens.has(tokenKey))
                    ? result.replace(bindingJson, tokens.get(tokenKey) || "")
                    : result;    
            });
        }
        return result;
    }

    private loadResponses(resourceName: string, resourcePath: string, locale: string | undefined){
        let resources: string[] = [];
        // if locale is not set, add resources under the default key.
        let localeKey = this.defaultLocaleKey;
        if (locale !== undefined)
        {
            //PENDING use i18n for locale
            localeKey = "";
        }

        // PENDING check how to serialize to object 
        let jsonFile = path.join(resourcePath, resourceName + ".json");
        const content: Map<string, Object> = require(jsonFile);
    }

    private getJsonResponseKeyForLocale(responseId: string, locale: string): string | undefined {        
        if (this.jsonResponses.has(locale))
        {
            let localeJSON = this.jsonResponses.get(locale);
            if(localeJSON){
                return localeJSON.has(responseId) ? responseId : undefined;
            }
        }
        return undefined;
    }

    private parseResponse(template: ResponseTemplate, data: Map<string,string> | undefined): Activity{
        let reply: Reply | undefined = template.reply;
        if(!reply){
            throw new Error("There is no reply in the ResponseTemplate");
        }
        else{
            if(reply.text){
                reply.text = this.format(reply.text, data);
            }
            if(reply.speak){
                reply.speak = this.format(reply.speak, data);
            }
            let activity : Partial <Activity> = {
                type: ActivityTypes.Message,
                text: reply.text,
                speak: reply.speak,
                inputHint: template.inputHint
            };

            if(template.suggestedActions && template.suggestedActions.length > 0){
                activity.suggestedActions = {
                    actions: [],
                    to: []
                }
                template.suggestedActions.forEach((action: string) => {
                    if(activity.suggestedActions){
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

    private loadCardJson(cardName: string, locale: string, resourcePath: string){
        let jsonFile = path.join(resourcePath, cardName + ".json");
        let json = "";
        let resource = "";

        try{
            // try to get the localized json
            resource = require(jsonFile);
        }
        // PENDING check how to get filenotfoundexception in ts
        catch(err: Error){

        }
        catch(err: Error){
            throw new Error("Could not file Adaptive Card resource " + jsonFile);
        }
    }

    public getCardResponse1 (card: Card) : Activity {
        let locale = "";
        let json = this.loadCardJson(card.name, locale);
        let attachment = this.buildCardAttachment(json, card.data);

        return MessageFactory.attachment(attachment) as Activity;
    }
    
    public getCardResponse2 (cards: Card[], attachmentLayout: string = AttachmentLayoutTypes.Carousel): Activity {
        let locale = "";
        let attachment!: Attachment[];

        cards.forEach ((item: Card) => {
            let json = this.loadCardJson(item.name, locale);
            attachment.push(this.buildCardAttachment(json, item.data));
        });

        return MessageFactory.carousel (attachment) as Activity;
    }

   public getCardResponse3 (templateId: string , card: Card, tokens: string): Activity {
        let response = this.getResponse(templateId, tokens);
        let locale = "";
        let json = this.loadCardJson(card.name, locale);
        let attachment = this.buildCardAttachment(json, card.data);

        return MessageFactory.attachment(attachment, response.text, response.speak, response.InputHint) as Activity;
   }
   
   public getCardResponse4 (templateId: string, cards: Card[], tokens: string | undefined, attachmentLayout: string = AttachmentLayoutTypes.Carousel): Activity{
        let response = this.getResponse(templateId, tokens);
        let locale = "";
        let attachment!: Attachment[];

        cards.forEach ((item: Card ) => {
            let json = this.loadCardJson(item.name, locale);
            attachment.push(this.buildCardAttachment(json, item.data));
        });

        return MessageFactory.carousel(attachment, response.text, response.speak, response.inputHint) as Activity;
    }


//    private BuildCardAttachment (json: string, data: IcardData | undefined): Attachment{
//        // If cardData was provided
//        if (data != undefined)
//        {
//            // get property names from cardData
//            let properties = data.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance);

//            // add all properties to the list
//            let tokens = new StringDictionary();
//            properties.foreach (let property: )
//            {
//                if (!tokens.ContainsKey(property.Name))
//                {
//                    //tokens.Add(property.Name, property.GetValue(data)?.ToString());
//                }
//            }

//            // replace tokens in json
//            if (tokens != null)
//            {
//               // json = SimpleTokensRegex.Replace(json, match => tokens[match.Groups[1].Value]);
//            }
//        }

//        // Deserialize/Serialize logic is needed to prevent JSON exception in prompts
       
//        const card = AdaptiveCard.FromJson(json).Card;
//        const cardObj = jsonConvert.DeserializeObject(jsonConvert.SerializeObject(card));
//        return new Attachment (AdaptiveCard.content.type, content: cardObj);
//    }
}


