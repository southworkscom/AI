/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { 
    ComponentDialog,
    WaterfallDialog,
    ConfirmPrompt,
    WaterfallStep,
    DialogContext,
    DialogTurnResult,
    WaterfallStepContext } from "botbuilder-dialogs";
import { 
    StatePropertyAccessor,
    ConversationState,
    Activity } from 'botbuilder';
import { SwitchSkillDialogOptions } from "./switchSkillDialogOptions";

export class SwitchSkillDialog extends ComponentDialog {
    private static confirmPromptId: string = "ConfirmSkillSwitch";
    private skillIdAccessor: StatePropertyAccessor<string>;
    private lastActivityAccessor: StatePropertyAccessor<Activity>;

    public constructor(conversationState: ConversationState) {
        super(SwitchSkillDialog.name);
        this.skillIdAccessor = conversationState.createProperty(Properties.skillId);
        this.lastActivityAccessor = conversationState.createProperty(Properties.lastActivity);
        
        const intentSwitch: WaterfallStep[] = [
            this.promptToSwitch.bind(this),
            this.end.bind(this)
        ];

        this.addDialog(new WaterfallDialog(SwitchSkillDialog.name, intentSwitch));
        this.addDialog(new ConfirmPrompt(SwitchSkillDialog.confirmPromptId));
    }


    // Runs when this dialog ends. Handles result of prompt to switch skills or resume waiting dialog.
    protected async endComponent(outerDc: DialogContext, result: object): Promise<DialogTurnResult> {
        const skillId: string | undefined = await this.skillIdAccessor.get(outerDc.context);
        const lastActivity: Activity | undefined = await this.lastActivityAccessor.get(outerDc.context);
        if (lastActivity !== undefined) {
            outerDc.context.activity.text = lastActivity.text;
        }

        // Ends this dialog.
        await outerDc.endDialog();

        if (!!result && skillId !== undefined) {
            // If user decided to switch, replace current skill dialog with new skill dialog.
            return await outerDc.replaceDialog(skillId);
        }
        else {
            // Otherwise, continue the waiting skill dialog with the user's previous utterance.
            return await outerDc.continueDialog();
        }
    }

    // Prompts user to switch to a new skill.
    private async promptToSwitch(stepContext: WaterfallStepContext): Promise<DialogTurnResult>
    {
        const options: SwitchSkillDialogOptions = <SwitchSkillDialogOptions> stepContext.options;
        if (options === undefined) {
            throw new Error (`You must provide options of type ${typeof(SwitchSkillDialogOptions).toString()}`) 
        }

        if (options.skill !== undefined) {
            await this.skillIdAccessor.set(stepContext.context, options.skill.id);
        }
        await this.lastActivityAccessor.set(stepContext.context, stepContext.context.activity);

        return await stepContext.prompt(SwitchSkillDialog.confirmPromptId, options);
    }

    // Ends this dialog, returning the prompt result.
    private async end(stepContext: WaterfallStepContext): Promise<DialogTurnResult>
    {
        const result: boolean = <boolean> stepContext.result;
        return await stepContext.endDialog(result);
    }
}

export enum Properties
{
    skillId = 'skillSwitchValue',
    lastActivity = 'skillSwitchActivity'
}
