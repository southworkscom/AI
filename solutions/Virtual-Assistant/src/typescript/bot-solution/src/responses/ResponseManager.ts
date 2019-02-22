// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ResponseTemplate } from './responseTemplate'
import { Activity, MessageFactory, AttachmentLayoutTypes } from 'botbuilder-core';
import { ActivityTypes } from 'botbuilder';
import { Attachment, SuggestedActions } from 'botframework-schema';
import { IResponseIdCollection} from './iResponseldCollection'
import { Card } from './card';

export class ResponseManager{

    private defaultLocaleKey: string  = "default";
    private static readonly simpleTokensRegex: RegExp = new RegExp ("@\{(\w+)\}");
    private static readonly complexTokensRegex: RegExp = new RegExp ("@\{(\w+)\}");

    constructor (responseTemplates: IResponseIdCollection[], locales: string[]) {
        
        this.jsonResponses = new Map<string, Map <string, ResponseTemplate>>();
        
        responseTemplates.forEach((responseTemplate: IResponseIdCollection) => {
            const resourceName = responseTemplate.constructor.name;

            this.loadResponses(resourceName);

            locales.forEach((locale: string) => {
                try{
                    this.loadResponses(resourceName, locale);
                }
                catch{
                    // If satellite assembly doesn't exist, bot will fall back to default.
                }
            });
        });
    }

    public jsonResponses = new Map <string, Map <string, ResponseTemplate>>();

    public getResponse (templateId : string, tokens: string | undefined): Activity {

        let locale = "";
        let template = this.getResponseTemplate(templateId, tokens);

        // create the response the data items
        return this.parseResponse(template, tokens);
    }

    public getCardResponse1 (card: Card) : Activity {
        let locale = "";
        let json = this.loadCardJson(card.name, locale);
        let attachment = this.buildCardAttachment(json, card.data);

        return MessageFactory.attachment(attachment) as Activity;
    }
    
    public getCardResponse2 (cards: Card[], attachmentLayout: string = AttachmentLayoutTypes.Carousel): Activity {
        let locale = "";
        let attachments!: Attachment[];

        cards.forEach ((item: Card) => {
            let json = this.loadCardJson(item.name, locale);
            attachments.push(this.buildCardAttachment(json, item.data));
        });

        return MessageFactory.carousel (attachments) as Activity;
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
    let attachments!: Attachment[];

    cards.forEach ((item: Card ) => {
        let json = this.loadCardJson(item.name, locale);
        attachments.push(this.buildCardAttachment(json, item.data));
    });

    return MessageFactory.carousel(attachments, response.text, response.speak, response.inputHint) as Activity;
    }
    
    public getResponseTemplate (templateId: string, locale: string | undefined): ResponseTemplate {
        locale = "";
        // warm up the JsonResponses loading to see if it actually exist. If not, throw with the loading time exception that's actually helpful
        let key = getJsonResponseKeyForLocale(templateId, locale);
        // if no matching json file found for locale, try parent language
        if (key === undefined)
        {
            locale ="";
            key = getJsonResponseKeyForLocale(templateId, locale);

            // fall back to default
        if (key === undefined)
        {
            locale = this.defaultLocaleKey;
            key = getJsonResponseKeyForLocale(templateId, locale);
        }
    }

    // Get the bot response from the .json file
    const response = key ? throw new KeyNotFoundException($"Unable to find response {templateId}.");
    // return jsonConvert.DeserializeObject<ResponseTemplate>(JsonConvert.SerializeObject(response));
    }

    public format (messageTemplate: string, tokens: string): string {
        let result = messageTemplate;
        let matches = ComplexTokensRegex.Matches(messageTemplate);
        matches.forEach((match: ) =>
        {
            var bindingJson = match.ToString();

            var tokenKey = bindingJson
              .Replace("{", string.Empty)
              .Replace("}", string.Empty);

            result = tokens.ContainsKey(tokenKey)
                ? result.Replace(bindingJson, tokens[tokenKey])
                : result;
        });

        return result;
    }

    private getJsonResponseKeyForLocale (responseId: string, locale: string): string { 
       if (jsonResponses.ContainsKey(locale))
       {
           return locale.ContainsKey(responseId) ? ;
       }

    return undefined;
   }

   private parseResponse (template: ResponseTemplate, data: string): Activity {
       let reply = template.reply;

       if (reply.text != undefined)
       {
           reply.text = this.format(reply.text, data);
       }

       if (reply.speak != undefined)
       {
           reply.speak = this.format(reply.speak, data);
       }

       let activity = new Activity();
       {
           type = ActivityTypes.Message,
           text = reply.text,
           speak = reply.speak,
           InputHint = template.InputHint
       };

       if (template.suggestedActions != null && template.suggestedActions.Count() > 0)
       {
           activity.suggestedActions = new SuggestedActions();
           {
              // Actions = new List<CardAction>()
           };

           template.suggestedActions.forEach (( action: SuggestedActions)=>
           {
               //activity.SuggestedActions.Actions.Add(new CardAction(type: ActionTypes.ImBack, title: action, value: action));
           });
       }

       //activity.Attachments = new List<Attachment>();

       return activity;
   }

   private loadCardJson (cardName: string, locale: string): string{
       // get card json for locale
       let jsonFile = $"{cardName}.json";
       let json = '';
       let resource = '';

       if(exception ex)
       {
           throw new Exception($"Could not file Adaptive Card resource {jsonFile}");
       }

       /* 
       using (let sr = new StreamReader(assembly.GetManifestResourceStream(resource)))
       {
           json = sr.ReadToEnd();
       }
       */
       return json;
   }

   private BuildCardAttachment (json: string, data: IcardData | undefined): Attachment{
       // If cardData was provided
       if (data != undefined)
       {
           // get property names from cardData
           let properties = data.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance);

           // add all properties to the list
           let tokens = new StringDictionary();
           properties.foreach (let property: )
           {
               if (!tokens.ContainsKey(property.Name))
               {
                   //tokens.Add(property.Name, property.GetValue(data)?.ToString());
               }
           }

           // replace tokens in json
           if (tokens != null)
           {
              // json = SimpleTokensRegex.Replace(json, match => tokens[match.Groups[1].Value]);
           }
       }

       // Deserialize/Serialize logic is needed to prevent JSON exception in prompts
       
       const card = AdaptiveCard.FromJson(json).Card;
       const cardObj = jsonConvert.DeserializeObject(jsonConvert.SerializeObject(card));
       return new Attachment (AdaptiveCard.content.type, content: cardObj);
   }
}


