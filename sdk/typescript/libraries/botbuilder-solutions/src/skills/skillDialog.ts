/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import {
    Activity,
    ActivityTypes,
    TurnContext, 
    ConversationState,
    SkillHttpClient} from 'botbuilder';
import {
    DialogContext,
    DialogInstance,
    DialogReason,
    DialogTurnResult, 
    Dialog} from 'botbuilder-dialogs';

/**
 * A sample dialog that can wrap remote calls to a skill.
 * @remarks The options parameter in BeginDialogAsync must be a SkillDialogArgs instance with the initial parameters for the dialog.
 */
export class SkillDialog extends Dialog {
    private readonly botId: string; 
    private readonly conversationState: ConversationState;
    private readonly skillClient: SkillHttpClient;
    private readonly skill: EnhancedBotFrameworkSkill;
    private readonly skillHostEndpoint: Uri;

    public constructor(
        botId: string,
        conversationState: ConversationState,
        skillClient: SkillHttpClient,
        enhancedBotFrameworkSkill: EnhancedBotFrameworkSkill,
        configuration: IConfiguration;
        skillHostEndpoint: Uri;

    ) {
        super(SkillDialog);
        if (this.configuration === null) { throw new Error ('configuration has no value') }

        if (botId === null) { throw new Error ('configuration has no value') }

        this.id = skill.id;
        this.skillHostEndpoint  = skillHostEndpoint;
        if (this.skillClient === null) { throw new Error ('skillClient has no value') }
        if (this.skill === null) { throw new Error ('skill has no value') }
        if (this.conversationState === null) { throw new Error ('conversationState has no value') }
    }

    /**
     * When a SkillDialog is started, a skillBegin event is sent which firstly indicates the Skill is being invoked in Skill mode,
     * also slots are also provided where the information exists in the parent Bot.
     * @param innerDC inner dialog context.
     * @param options options
     * @returns dialog turn result.
     */
    protected async onBeginDialog(innerDC: DialogContext, options?: object): Promise<DialogTurnResult> {
        /*
        if (!(options is SkillDialogArgs dialogArgs)) {
            throw new Error("Unable to cast ${options} to ${SkillDialogArgs}");
        }
        */

        let skillId = dialogArgs.SkillId;
        //await dc.Context.TraceActivityAsync($"{GetType().name}.BeginDialogAsync()", label: $"Using activity of type: {dialogArgs.ActivityType}", cancellationToken: cancellationToken).ConfigureAwait(false);
        let  skillActivity: Activity;

        switch (dialogArgs.ActivityType) {
            case ActivityTypes.Event:
                let eventActivity = Activity.CreateEventActivity();
                eventActivity.name = dialogArgs.name;
                eventActivity.ApplyConversationReference(innerDC.context.activity.getConversationReference(), true);
                skillActivity = <Activity> eventActivity;
                break;

            case ActivityTypes.Message:
                var messageActivity = Activity.CreateMessageActivity();
                messageActivity.Text = dc.Context.Activity.Text;
                skillActivity = (Activity)messageActivity;
                break;

            default:
                throw new Error ("Invalid activity type in ${dialogArgs.ActivityType} in ${SkillDialogArgs}");
        }

        this.applyParentActivityProperties(innerDC.context, skillActivity, dialogArgs);
        return await this.sendToSkill(innerDC, skillActivity);
    }

    /**
     * All subsequent messages are forwarded on to the skill.
     * @param innerDC Inner Dialog Context.
     * @returns DialogTurnResult.
     */
    protected async onContinueDialog(innerDC: DialogContext): Promise<DialogTurnResult> {
        /*
        await dc.Context.TraceActivityAsync($"{GetType().Name}.ContinueDialogAsync()", label: $"ActivityType: {dc.Context.Activity.Type}", cancellationToken: cancellationToken).ConfigureAwait(false);

        if (dc.Context.Activity.Type == ActivityTypes.EndOfConversation)
        {
            await dc.Context.TraceActivityAsync($"{GetType().Name}.ContinueDialogAsync()", label: $"Got EndOfConversation", cancellationToken: cancellationToken).ConfigureAwait(false);
            return await dc.EndDialogAsync(dc.Context.Activity.Value, cancellationToken).ConfigureAwait(false);
        }
        */

        // Just forward to the remote skill
        await this.sendToSkill(innerDC, innerDC.context.activity)
    }

    public async endDialog(turnContext: TurnContext, instance: DialogInstance, reason: DialogReason): Promise<void> {
        if (reason === DialogReason.cancelCalled || reason === DialogReason.replaceCalled) {
            //await turnContext.sendTraceActivity($"{GetType().Name}.EndDialogAsync()", label: $"ActivityType: {turnContext.Activity.Type}", cancellationToken: cancellationToken).ConfigureAwait(false);

            const activity: Activity = activity.CreateEndOfConversationActivity();
            this.applyParentActivityProperties(turnContext, activity, null);

            await this.sendToSkill( null, activity);
        }

        await super.endDialog(turnContext, instance, reason);
    }


    public async  ResumeDialog (dc: DialogContext, reason: DialogReason, result: Object): Promise<DialogTurnResult> {
        return SkillDialog.EndOfTurn;
    }

    private applyParentActivityProperties(turnContext: TurnContext, skillActivity: Activity, dialogArgs: SkillDialogArgs) {
        // Apply conversation reference and common properties from incoming activity before sending.

        // skillActivity.applyConversationReference(turnContext.activity.getConversationReference(), true);
        skillActivity.channelData = turnContext.activity.channelData;
        // skillActivity.properties = turnContext.activity.Properties;

        if (dialogArgs !== null)
        {
            skillActivity.value = dialogArgs?.value
        }
    }

    private async sendToSkill(dc: DialogContext, activity: Activity): Promise<DialogTurnResult> {
        if (dc !== null)
        {
            /**
             * Always save state before forwarding
             * (the dialog stack won't get updated with the skillDialog and things won't work if you don't)
             */
            await this.conversationState.saveChanges(dc.context, true);
        }

        // const response = await this.skillClient.postActivity(this.botId, this.skill, this.skillHostEndpoint, activity);
        if (!(response.status >= 200 && response.status <= 299))
        {
            // throw new Error ("Error invoking the skill id: `\${this.botId}\` at \`${this.skillHostEndpoint}\` (status is `${response.status}`). \r\n `${response.Body}`");
        }

        return SkillDialog.EndOfTurn;
    }
}
