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
import { DialogIds } from "../skillDialog";

/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

export enum properties
{
    skillId = 'skillSwitchValue',
    lastActivity = 'skillSwitchActivity'
}

export class SwitchSkillDialog extends ComponentDialog {

    private static confirmPromptId: string = "ConfirmSkillSwitch";
    private readonly skillIdAccessor: StatePropertyAccessor<string>;
    private readonly lastActivityAccessor: StatePropertyAccessor<Activity>;
    private readonly conversationState: ConversationState;

    public constructor(
        conversationState: ConversationState,
        skillIdAccessor: StatePropertyAccessor<string>,
        lastActivityAccessor: StatePropertyAccessor<Activity>

    ){ super(SwitchSkillDialog.name);
        this.conversationState = conversationState;
        this.skillIdAccessor = skillIdAccessor;
        this.lastActivityAccessor = lastActivityAccessor;
        skillIdAccessor = this.conversationState.createProperty(properties.skillId);
        lastActivityAccessor = this.conversationState.createProperty(properties.lastActivity);
        
        const intentSwitch: WaterfallStep[] = [
            this.promptToSwitch.bind(this),
            this.end.bind(this)
        ];

        this.addDialog(new WaterfallDialog(DialogIds.confirmSkillSwitchFlow, intentSwitch));
        this.addDialog(new ConfirmPrompt(SwitchSkillDialog.confirmPromptId));
    }


    // Runs when this dialog ends. Handles result of prompt to switch skills or resume waiting dialog.

    protected async endComponent(dc: DialogContext, result: object): Promise<DialogTurnResult> {

        let skillId = await this.skillIdAccessor.get(dc.context, new());
        let lastActivity = await this.lastActivityAccessor.get(dc.context, new());
        dc.context.activity.text = lastActivity.text;

        // Ends this dialog.
        await dc.endDialog();

        if (result !== undefined) {
            // If user decided to switch, replace current skill dialog with new skill dialog.
            return await dc.replaceDialog(skillId);
        }
        else {
            // Otherwise, continue the waiting skill dialog with the user's previous utterance.
            return await dc.continueDialog();
        }
    }

    // Prompts user to switch to a new skill.
    private async promptToSwitch(stepContext: WaterfallStepContext): Promise<DialogTurnResult>
    {

        if (stepContext.context === undefined) {
            throw new Error ("You must provide options of type.");
        }
        let options = stepContext.options;
        await this.skillIdAccessor.set(stepContext.context, options);
        await this.lastActivityAccessor.set(stepContext.context, stepContext.context.activity);

        return await stepContext.prompt(SwitchSkillDialog.confirmPromptId, options);
    }

    // Ends this dialog, returning the prompt result.
    private async end(stepContext: WaterfallStepContext): Promise<DialogTurnResult>
    {
        let result: Boolean = stepContext.result;
        return await stepContext.endDialog(result);
    }
}
