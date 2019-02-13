import { CosmosDbStorageSettings } from 'botbuilder-azure';
import { LocaleConfiguration } from '.';

export abstract class SkillConfigurationBase {

    public isAuthenticatedSkill: boolean = false;

    public abstract authenticationConnections: { [key: string]: string };

    public abstract cosmosDbOptions: CosmosDbStorageSettings;

    public localeConfigurations: Map<string, LocaleConfiguration> = new Map();

    public abstract properties: { [key: string]: object };
}
