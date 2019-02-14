// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License

import * as i18n from 'i18n';
import {
    DictionaryRenderer,
    LanguageTemplateDictionary,
    TemplateFunction,
    TemplateIdMap } from '../templateManager/dictionaryRenderer';
import { TemplateManager } from '../templateManager/templateManager';

export class EscalateResponses extends TemplateManager {
    // Declare here the type of properties and the prompts
    public static responseIds: {
        SendEscalationMessage: string;
    } = {
        SendEscalationMessage: 'sendPhone'
    };

    // Declare the responses map prompts
    private static readonly responseTemplates: LanguageTemplateDictionary = new Map([
        ['default', <TemplateIdMap> new Map([
            [EscalateResponses.responseIds.SendEscalationMessage, EscalateResponses.fromResources('escalate.phoneInfo')]
        ])]
   ]);

   // Initialize the responses class properties
    constructor() {
        super();
        this.register(new DictionaryRenderer(EscalateResponses.responseTemplates));
    }

    private static fromResources(name: string): TemplateFunction {
        return (): Promise<string> => Promise.resolve(i18n.__(name));
    }
}
