/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { BotTelemetryClient } from 'botbuilder';
import {
    LuisApplication,
    LuisRecognizer,
    LuisRecognizerOptionsV3,
    QnAMakerEndpoint
} from 'botbuilder-ai';
import { ICognitiveModelConfiguration, ICognitiveModelSet } from 'bot-solutions';
import { DispatchService, LuisService, QnaMakerService } from 'botframework-config';
import i18next from 'i18next';
import { IBotSettings } from './botSettings';

export class BotServices {

    public constructor(settings: IBotSettings, client: BotTelemetryClient) {
        settings.cognitiveModels.forEach((value: ICognitiveModelConfiguration, key: string): void => {
            const language: string = key;
            const config: ICognitiveModelConfiguration = value;

            const telemetryClient: BotTelemetryClient = client;

            const luisOptions: LuisRecognizerOptionsV3 = {
                telemetryClient: telemetryClient,
                logPersonalInformation: true,
                apiVersion: 'v3'
            };

            const cognitiveModelSet: Partial<ICognitiveModelSet> = {};

            if (config.dispatchModel !== undefined) {
                const dispatchModel: DispatchService = new DispatchService(config.dispatchModel);
                const dispatchApp: LuisApplication = {
                    applicationId: dispatchModel.appId,
                    endpointKey: dispatchModel.subscriptionKey,
                    endpoint: dispatchModel.getEndpoint()
                };
                cognitiveModelSet.dispatchService = new LuisRecognizer(dispatchApp, luisOptions);
            }

            if (config.languageModels !== undefined) {
                config.languageModels.forEach((model: LuisService): void => {
                    const luisService: LuisService = new LuisService(model);
                    const luisApp: LuisApplication  = {
                        applicationId: luisService.appId,
                        endpointKey: luisService.subscriptionKey,
                        endpoint: luisService.getEndpoint()
                    };

                    cognitiveModelSet.luisServices = new Map();
                    cognitiveModelSet.luisServices.set(luisService.id, new LuisRecognizer(luisApp, luisOptions));
                });
            }

            if (config.knowledgeBases !== undefined) {

                config.knowledgeBases.forEach((kb: QnaMakerService): void => {
                    const qnaEndpoint: QnAMakerEndpoint = {
                        knowledgeBaseId: kb.kbId,
                        endpointKey: kb.endpointKey,
                        host: kb.hostname
                    };
                    cognitiveModelSet.qnaConfiguration = new Map();
                    cognitiveModelSet.qnaConfiguration.set(kb.id, qnaEndpoint);
                });
            }

            this.cognitiveModelSets.set(language, cognitiveModelSet as ICognitiveModelSet);
        });
    }

    public cognitiveModelSets: Map<string, ICognitiveModelSet> = new Map();

    public getCognitiveModels(): ICognitiveModelSet {
        // Get cognitive models for locale
        const locale: string = i18next.language;
        let cognitiveModels: ICognitiveModelSet | undefined = this.cognitiveModelSets.get(locale);

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
