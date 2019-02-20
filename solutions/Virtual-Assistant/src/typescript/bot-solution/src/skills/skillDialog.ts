/* tslint:disable:no-any */
import { Activity, BotTelemetryClient, TurnContext } from 'botbuilder';
import { ComponentDialog, DialogContext, DialogTurnResult } from 'botbuilder-dialogs';
import { EndpointService } from 'botframework-config';
import { MultiProviderAuthDialog } from '../authentication';
import { SkillConfigurationBase } from './skillConfigurationBase';
import { SkillDefinition } from './skillDefinition';

export class SkillDialog extends ComponentDialog {
    // Fields
    private readonly skillDefinition: SkillDefinition;
    private readonly skillConfiguration: SkillConfigurationBase;
    private readonly responseManager: any; // ResponseManager;
    private readonly endpointService: EndpointService;
    // private readonly telemetryClient: BotTelemetryClient;
    private readonly useCachedTokens: boolean;
    private inProcAdapter: any; // InProcAdapter;
    private activatedSkill: any; // IBot;
    private skillInitialized: boolean;

    constructor(skillDefinition: SkillDefinition,
                skillConfiguration: SkillConfigurationBase,
                endpointService: EndpointService,
                telemetryClient: BotTelemetryClient,
                useCachedTokens: boolean = true) {
        super(skillDefinition.id);

        this.skillDefinition = skillDefinition;
        this.skillConfiguration = skillConfiguration;
        this.endpointService = endpointService;
        this.telemetryClient = telemetryClient;
        this.useCachedTokens = useCachedTokens;

        this.skillInitialized = false;

        // const supportedLanguages: string[] = Array.from(skillConfiguration.localeConfigurations.keys());

        // Init this.responseManager

        this.addDialog(new MultiProviderAuthDialog(skillConfiguration));
    }

    protected onBeginDialog(innerDC: DialogContext, options?: object): Promise<DialogTurnResult> {
        throw new Error('Not implemented');
    }

    protected onContinueDialog(innerDC: DialogContext): Promise<DialogTurnResult> {
        throw new Error('Not implemented');
    }

    protected endComponent(outerDC: DialogContext, result: any): Promise<DialogTurnResult> {
        throw new Error('Not implemented');
    }

    private initializeSkill(dc: DialogContext): Promise<void> {
        throw new Error('Not implemented');
    }

    private forwardToSkill(dc: DialogContext, activity: Activity): Promise<void> {
        throw new Error('Not implemented');
    }

    private createCallback(activities: Activity[]): (context: TurnContext) => Promise<void> {
        return async (turnContext: TurnContext): Promise<void> => {
            // Send back the activities in the proactive context
            await turnContext.sendActivities(activities);
        };
    }
}

namespace Events {
    export const skillBeginEventName: string = 'skillBegin';
    export const tokenRequestEventName: string = 'tokens/request';
    export const tokenResponseEventName: string = 'tokens/response';
}
