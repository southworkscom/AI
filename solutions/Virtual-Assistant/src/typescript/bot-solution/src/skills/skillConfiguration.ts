import { CosmosDbStorageSettings } from 'botbuilder-azure';
import { BotConfiguration } from 'botframework-config';

import { LocaleConfiguration } from './localeConfiguration';
import { SkillConfigurationBase } from './skillConfigurationBase';

export class SkillConfiguration extends SkillConfigurationBase {
    public authenticationConnections: { [key: string]: string } = {};
    public cosmosDbOptions!: CosmosDbStorageSettings;
    public localeConfigurations: Map<string, LocaleConfiguration> = new Map();
    public properties: { [key: string]: Object } = {};

    constructor(
            botConfiguration?: BotConfiguration,
            languagesModels?: Map<string, { botFilePath: string; botFileSecret: string }>,
            supportedProviders?: string[],
            parameters?: string[],
            configuration?: Map<string, Object>) {
        super();
        throw new Error('not implemented');
    }
}
