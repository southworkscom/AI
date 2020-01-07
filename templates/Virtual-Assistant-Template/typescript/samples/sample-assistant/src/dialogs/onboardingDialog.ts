/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
import {
    BotTelemetryClient,
    StatePropertyAccessor,
    TurnContext, 
    UserState} from 'botbuilder';
import {
    ComponentDialog,
    DialogTurnResult,
    TextPrompt,
    WaterfallDialog,
    WaterfallStepContext } from 'botbuilder-dialogs';
import { IOnboardingState } from '../models/onboardingState';
import { OnboardingResponses } from '../responses/onboardingResponses';
import { BotServices } from '../services/botServices';

enum DialogIds {
    namePrompt = 'namePrompt',
}

enum stateProperties {
    generalResult = "generalResult",
}

// Example onboarding dialog to initial user profile information.
export class OnboardingDialog extends ComponentDialog {

    // Fields
    private services: BotServices;
    private accessor: StatePropertyAccessor<UserProfileState>;
    private templateEngine: LocaleTemplateEngine;

    // Constructor
    public constructor(serviceProvider: IServiceProvider, telemetryClient: BotTelemetryClient) {
        super(OnboardingDialog.name);
        this.templateEngine = serviceProvider.GetService<LocaleTemplateEngineManager>();

        let userState = serviceProvider.GetService<UserState>();
        this.accessor = userState.CreateProperty<UserProfileState>(UserProfileState.name);
        this.services = serviceProvider.GetService<BotServices>();

        let onboarding = new WaterfallStep[]{
            AskForName,
            FinishOnboardingDialog,
        };

         // To capture built-in waterfall dialog telemetry, set the telemetry client
         // to the new waterfall dialog and add it to the component dialog
         this.telemetryClient = telemetryClient
         this.addDialog(new WaterfallDialog(onboarding.name, onboarding){ TelemetryClient = telemetryClient});
         this.addDialog(new TextPrompt(DialogIds.namePrompt));
    }

    public async askForName(sc: WaterfallStepContext): Promise<DialogTurnResult> {
        let state = await this.accessor.get(sc.context, () => new UserProfileState());

        if (state && state.name !== undefined && state.name.trim().length > 0) {
            return await sc.next(state.name);
        }
        else {
            return await sc.prompt(DialogIds.namePrompt, new PromptOptions(){
                Prompt = this.templateEngine.generateActivityForLocale('NamePrompt'),
            });
        }
    }

    public async finishOnboardingDialog(sc: WaterfallStepContext<IOnboardingState>): Promise<DialogTurnResult> {
        
        let userProfile = await this.accessor.get(sc.context, () => new UserProfileState());
        let name = <string>sc.result;

        let generalResult = sc.context.turnState.get(stateProperties.generalResult);

        if (generalResult){
            let localizedServices = this.services.getCognitiveModel();
            generalResult = await localizedServices.luisServices.get('General')?.recognize(sc.context);
        }

        let general = generalResult.topIntent();
        let generalIntent = general[0];
        let generalScore = general[1];

        if (generalIntent == GeneralLuis.Intent.ExtractName && generalScore > 0.5){
            
            if (generalResult.entities.personName_Any){
                name = generalResult.entities.personName_Any[0];
            }
            else if (generalResult.entities.personName){
                name = generalResult.entities.personName[0];
            }
        }

        // Captialize name
        userProfile.name = cultureInfo.currentCulture.textInfo.toTitleCase(name.toLowerCase());

        await this.accessor.set(sc.context, userProfile);

        await sc.context.sendActivity(this.templateEngine.generateActivityForLocale('HaveNameMessage', userProfile));
        await sc.context.sendActivity(this.templateEngine.generateActivityForLocale('FirstPromptMessage', userProfile));

        sc.SuppressCompletionMessage(true);

        return await sc.endDialog();
    }
}
