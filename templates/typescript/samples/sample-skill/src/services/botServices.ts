/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { BotTelemetryClient } from 'botbuilder';
import {
    LuisApplication,
    LuisRecognizer,
    LuisRecognizerOptionsV3,
    QnAMaker,
    QnAMakerEndpoint
} from 'botbuilder-ai';
import { ICognitiveModelConfiguration, ICognitiveModelSet } from 'bot-solutions';
import { LuisService, QnaMakerService } from 'botframework-config';
import { IBotSettings } from './botSettings';

export class BotServices {

    public cognitiveModelSets: Map<string, Partial<ICognitiveModelSet>> = new Map();

    public constructor(settings: Partial<IBotSettings>, client: BotTelemetryClient) {
        if (settings.cognitiveModels !== undefined) {
            settings.cognitiveModels.forEach((value: ICognitiveModelConfiguration, key: string): void => {

                const set: Partial<ICognitiveModelSet> = {
                    luisServices: new Map()
                };
                const language: string = key;
                const config: ICognitiveModelConfiguration = value;

                const telemetryClient: BotTelemetryClient = client;

                const luisOptions: LuisRecognizerOptionsV3 = {
                    telemetryClient: client,
                    logPersonalInformation: true,
                    apiVersion: 'v3'
                };

                if (config.dispatchModel !== undefined) {
                    const dispatchApp: LuisApplication = {
                        applicationId: config.dispatchModel.appId,
                        endpointKey: config.dispatchModel.subscriptionKey,
                        endpoint: config.dispatchModel.getEndpoint()
                    };

                    set.dispatchService = new LuisRecognizer(dispatchApp, luisOptions);
                }

                if (config.languageModels !== undefined) {
                    config.languageModels.forEach((model: LuisService): void => {
                        const luisApp: LuisApplication  = {
                            applicationId: model.appId,
                            endpointKey: model.subscriptionKey,
                            endpoint: model.getEndpoint()
                        };

                        if (set.luisServices !== undefined) {
                            set.luisServices.set(model.id, new LuisRecognizer(luisApp, luisOptions));
                        }
                    });
                }

                if (config.knowledgeBases !== undefined) {
                    config.knowledgeBases.forEach((kb: QnaMakerService): void => {
                        const qnaEndpoint: QnAMakerEndpoint = {
                            knowledgeBaseId: kb.kbId,
                            endpointKey: kb.endpointKey,
                            host: kb.hostname
                        };
                        const qnaMaker: QnAMaker = new QnAMaker(qnaEndpoint, undefined, client, true);

                        if (set.qnaServices !== undefined) {
                            set.qnaServices.set(kb.id, qnaMaker);
                        }
                    });
                }
                this.cognitiveModelSets.set(language, set);
            });
        }
    }

    public getCognitiveModels(locale: string): Partial<ICognitiveModelSet> {
        // Get cognitive models for locale
        let cognitiveModels: Partial<ICognitiveModelSet> | undefined = this.cognitiveModelSets.get(locale);

        if (cognitiveModels === undefined) {
            const keyFound: string | undefined = Array.from(this.cognitiveModelSets.keys())
            // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
                .find((key: string) => {
                    if (key.substring(0, 2) === locale.substring(0, 2)) {
                        return key;
                    }
                });
            if (keyFound !== undefined) {
                cognitiveModels = this.cognitiveModelSets.get(keyFound);
            }
        }
        if (cognitiveModels === undefined) {
            throw new Error(`There's no matching locale for '${ locale }' or its root language '${ locale.substring(0, 2) }'.
            Please review your available locales in your cognitivemodels.json file.`);
        }

        return cognitiveModels;
    }
}
