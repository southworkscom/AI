import { TelemetryClient } from 'applicationinsights';
import { LocaleConfiguration, SkillConfigurationBase, SkillDefinition } from 'bot-solution';
import { CosmosDbStorageSettings } from 'botbuilder-azure';
import { AppInsightsService, BotConfiguration, CosmosDbService, DispatchService,
    GenericService, IConnectedService, ServiceTypes } from 'botframework-config';
import { existsSync } from 'fs';

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License

/**
 * Represents references to external services.
 * For example, LUIS services are kept here as a singleton. This external service is configured
 * using the BotConfiguration class.
 */
export class BotServices {

    public readonly telemetryClient!: TelemetryClient;

    public readonly cosmosDbStorageSettings!: CosmosDbStorageSettings;

    public authenticationConnections: { [key: string]: string } = {};

    public localeConfigurations: Map<string, LocaleConfiguration> = new Map();

    public skillDefinitions: SkillDefinition[] = [];

    public skillConfigurations: Map<string, SkillConfigurationBase> = new Map();

    constructor(
        botConfiguration: BotConfiguration,
        languageModels: Map<string, { botFilePath: string; botFileSecret: string }>,
        skills: SkillDefinition[]) {
        // Create service clients for each service in the .bot file.
        let telemetryClient: TelemetryClient|undefined;
        let cosmosDbStorageSettings: CosmosDbStorageSettings|undefined;

        botConfiguration.services.forEach((service: IConnectedService) => {
            switch (service.type) {
                case ServiceTypes.AppInsights: {
                    const appInsights: AppInsightsService = <AppInsightsService> service;
                    if (!appInsights) {
                        throw new Error('The Application Insights is not configured correctly in your \'.bot\' file.');
                    }

                    if (!appInsights.instrumentationKey) {
                        throw new Error('The Application Insights Instrumentation Key (\'instrumentationKey\')' +
                        ' is required to run this sample.  Please update your \'.bot\' file.');
                    }

                    telemetryClient = new TelemetryClient(appInsights.instrumentationKey);
                    break;
                }
                case ServiceTypes.CosmosDB: {
                    const cosmos: CosmosDbService = <CosmosDbService> service;

                    cosmosDbStorageSettings = {
                        authKey: cosmos.key,
                        collectionId: cosmos.collection,
                        databaseId: cosmos.database,
                        serviceEndpoint: cosmos.endpoint,
                        databaseCreationRequestOptions: {},
                        documentCollectionRequestOptions: {}
                    };

                    break;
                }
                case ServiceTypes.Generic: {
                    if (service.name === 'Authentication') {
                        const authentication: GenericService = <GenericService> service;

                        this.authenticationConnections = authentication.configuration;
                    }

                    break;
                }
                default: {
                    throw new Error('Configuration not expected in your \'.bot\' file.');
                }
            }
        });

        if (!telemetryClient) {
            throw new Error('The Application Insights is not configured correctly in your \'.bot\' file.');
        }

        if (!cosmosDbStorageSettings) {
            throw new Error('The CosmosDB endpoint is not configured correctly in your \'.bot\' file.');
        }

        this.telemetryClient = telemetryClient;
        this.cosmosDbStorageSettings = cosmosDbStorageSettings;

        // Create locale configuration object for each language config in appsettings.json
        languageModels.forEach((value: { botFilePath: string; botFileSecret: string }, key: string) => {
            if (value.botFilePath && existsSync(value.botFilePath)) {
                const config: BotConfiguration = BotConfiguration.loadSync(value.botFilePath, value.botFileSecret);

                const localeConfig: LocaleConfiguration = new LocaleConfiguration();
                localeConfig.locale = key;

                config.services.forEach((service: IConnectedService) => {
                    switch (service.type) {
                        case ServiceTypes.Dispatch: {
                            break;
                        }
                        case ServiceTypes.Luis: {
                            break;
                        }
                        case ServiceTypes.QnA: {
                            break;
                        }
                        default: {
                            throw new Error('Configuration not expected in your \'.bot\' file.');
                        }
                    }
                });
            }
        });
    }
}
