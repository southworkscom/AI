/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
import {
    Activity,
    BotTelemetryClient,
    CardFactory,
    ConversationState,
    MessageFactory,
    Middleware,
    StatePropertyAccessor,
    TurnContext } from 'botbuilder';
import { supportsSuggestedActions } from 'botbuilder-dialogs';
import { CardAction, HeroCard } from 'botframework-schema';
import { FeedbackOptions } from './feedbackOptions';
import { FeedbackRecord } from './feedbackRecord';
export class FeedbackMiddleware implements Middleware {
    private readonly options: FeedbackOptions;
    private readonly feedbackAccessor: StatePropertyAccessor<FeedbackRecord>;
    private readonly conversationState: ConversationState;
    private readonly telemetryClient: BotTelemetryClient;
    private readonly traceName: string = 'Feedback';

    constructor(
        conversationState: ConversationState,
        telemetryClient: BotTelemetryClient,
        options?: FeedbackOptions
    ) {
        if (conversationState === undefined) {
            throw new Error('');
        }

        if (telemetryClient === undefined) {
            throw new Error('');
        }

        this.conversationState = conversationState;
        this.telemetryClient = telemetryClient;
        this.options = options ? options : new FeedbackOptions();

        // Create FeedbackRecord state accessor
        this.feedbackAccessor = conversationState.createProperty<FeedbackRecord>('');
    }

    public async requestFeedback(context: TurnContext, tag: string): Promise<void>
    {
        // clear state
        await this.feedbackAccessor.delete(context);

        // create feedbackRecord with original activity and tag

        const record : FeedbackRecord = {
            request: context.activity,
            tag: tag,
            comment: '',
            feedback: ''
        };

        // store in state. No need to save changes, because its handled in IBot
        await this.feedbackAccessor.set(context, record);

        // If channel supports suggested actions
        if (supportsSuggestedActions(context.activity.channelId)) {
            // prompt for feedback
            // if activity already had suggested actions, add the feedback actions
            if (context.activity.suggestedActions !== undefined) {
                const actions: CardAction[] = [
                    ...context.activity.suggestedActions.actions,
                    ...this.getFeedbackActions()
                ];

                await context.sendActivity(MessageFactory.suggestedActions(actions));
            } else {
                const actions: CardAction[] = this.getFeedbackActions();
                await context.sendActivity(MessageFactory.suggestedActions(actions));
            }
        } else {
            // else channel doesn't support suggested actions, so use hero card.
            await context.sendActivity(MessageFactory.attachment(CardFactory.heroCard('', undefined, this.getFeedbackActions())));
        }
    }

    public async onTurn(context: TurnContext, next: () => Promise<void>) {
        // get feedback record from state. If we don't find anything, set to null.
        const record: FeedbackRecord | undefined = await this.feedbackAccessor.get(context);

        // if we have requested feedback
        if (record !== undefined) {
            if (this.options.feedbacActions) {
                // if activity text matches a feedback action
                // save feedback in state
                const feedback: CardAction = this.options.feedbackActions

                // Set the feedback to the action value for consistency
                record.feedback = feedback.value;
                await this.feedbackAccessor.set(context, record);

                if (this.options.commentsEnabled) {
                    // if comments are enabled
                    // create comment prompt with dismiss action
                    if (supportsSuggestedActions(context.activity.channelId)) {
                        const commentPrompt: Partial<Activity> = MessageFactory.suggestedActions(
                            [this.options.dismissAction],
                            `${ this.options.feedbackReceivedMessage } ${this.options.dismissAction}`
                        );

                        // prompt for comment
                        await context.sendActivity(commentPrompt);
                    } else {
                        // channel doesn't support suggestedActions, so use hero card.

                        // prompt for comment
                        await context.sendActivity(
                            MessageFactory.attachment(CardFactory.heroCard('', undefined, this.getFeedbackActions()))
                        );
                    }
                } else {
                    // comments not enabled, respond and cleanup
                    // send feedback response
                    await context.sendActivity(this.options.feedbackReceivedMessage);

                    // log feedback in appInsights
                    this.logFeedback(record);

                    // clear state
                    await this.feedbackAccessor.delete(context);
                }
            } else if (context.activity.text === this.options.dismissAction.value
                    || context.activity.text === this.options.dismissAction.title) {
                // if user dismissed
                // log existing feedback
                if (record.feedback !== '' || record.feedback !== undefined) {
                    this.logFeedback(record);
                }

                // clear state
                await this.feedbackAccessor.delete(context);
            } else if ((record.feedback !== '' || record.feedback !== undefined) && this.options.commentsEnabled) {
                // if we received a comment and user didn't dismiss
                // store comment in state
                record.comment = context.activity.text;
                await this.feedbackAccessor.set(context, record);

                // Respond to comment
                await context.sendActivity(this.options.commentReceivedMessage);

                // log feedback in appInsights
                this.logFeedback(record);

                // clear state
                await this.feedbackAccessor.delete(context);
            } else {
                // we requested feedback, but the user responded with something else
                // clear state and continue (so message can be handled by dialog stack)
                await this.feedbackAccessor.delete(context);
                await next();
            }

            await this.conversationState.saveChanges(context);
        } else {
            // We are not requesting feedback. Go to next.
            await next();
        }
    }

    private getFeedbackActions(): CardAction[] {
        return [
            ...this.options.feedbackActions,
            this.options.dismissAction
        ];
    }

    private logFeedback(record: FeedbackRecord): void {
        const properties: { [id: string] : string } = {
             tag: record.tag,
             feedback: record.feedback,
             comment: record.comment,
             text: record.request !== undefined ? record.request.text : '',
             id: record.request !== undefined ? record.request.id !== undefined ? record.request.id : '' : '',
             channelId: record.request !== undefined ? record.request.channelId : ''
        };
        this.telemetryClient.trackEvent({
            name: this.traceName,
            properties: [
                properties
            ]
        });
    }
}
