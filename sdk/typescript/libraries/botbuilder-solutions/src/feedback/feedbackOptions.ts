/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
import { ActionTypes, CardAction } from 'botframework-schema';
import { ResponseManager } from '../responses/responseManager';
import { FeedbackResponses } from './feedbackResponses';

export class FeedbackOptions {
    // tslint:disable:variable-name
    private _feedbackActions: CardAction[] = [{ type: '', title: '', value: '' }];
    private _dismissAction: CardAction = { type: '', title: '', value: '' };
    private _feedbackReceivedMessage: string = '';
    private _commentsEnabled: boolean = false;
    private _commentPrompt: string = '';
    private _commentReceivedMessage: string = '';
    // tslint:enable:variable-name
    private readonly responseManager: ResponseManager;

    constructor() {
        this.responseManager = new ResponseManager(
            ['en', 'de', 'es', 'fr', 'it', 'zh'],
            [FeedbackResponses]
        );
    }

    /**
     * Gets custom feedback choices for the user.
     * Default values are "👍" and "👎".
     * @returns A `CardAction[]`.
     */
    public get feedbackActions(): CardAction[] {
        if (this.feedbackActions === undefined) {
            return [
                { type: ActionTypes.PostBack, title: '👍', value: 'positive' },
                { type: ActionTypes.PostBack, title: '👎', value: 'negative' }
            ];
        }

        return this._feedbackActions;
    }

    /**
     * Sets custom feedback choices for the user.
     * @param value Custom feedback choices for the user.
     */
    public set feedbackActions(value: CardAction[]) {
        this._feedbackActions = value;
    }

    /**
     * Gets text to show on button that allows user to hide/ignore the feedback request.
     * @returns A `CardAction`.
     */
    public get dismissAction(): CardAction {
        if (this.dismissAction === undefined) {
            return {
                type: ActionTypes.PostBack,
                title: this.responseManager.getResponseText(FeedbackResponses.dismissTitle),
                value: 'dismiss' };
        }

        return this._dismissAction;
    }

    /**
     * Sets custom feedback choices for the user.
     * @param value Text to show on button that allows user to hide/ignore the feedback request.
     */
    public set dismissAction(value: CardAction) {
        this._dismissAction = value;
    }

    /**
     * Gets message to show when a user provides some feedback.
     * Default value is "Thanks for your feedback!".
     * @returns A `string`.
     */
    public get feedbackReceivedMessage(): string {
        if (this._feedbackReceivedMessage === '') {
            return this.responseManager.getResponseText(FeedbackResponses.feedbackReceivedMessage);
        }

        return this._feedbackReceivedMessage;
    }

    /**
     * Sets message to show when a user provides some feedback.
     * @param value Message to show when a user provides some feedback.
     */
    public set feedbackReceivedMessage(value: string) {
        this._feedbackReceivedMessage = value;
    }

    /**
     * Gets a value indicating whether gets or sets flag to prompt for free-form
     * comments for all or select feedback choices (comment prompt is shown after user selects a preset choice).
     * Default value is `false`.
     * @returns A `boolean`.
     */
    public get commentsEnabled(): boolean {
        return this._commentsEnabled;
    }

    /**
     * Sets a value indicating whether gets or sets flag to prompt for free-form
     * comments for all or select feedback choices (comment prompt is shown after user selects a preset choice).
     * @param value A value indicating whether gets or sets flag to prompt for free-form comments for all or select feedback choices.
     */
    public set commentsEnabled(value: boolean) {
        this._commentsEnabled = value;
    }

    /**
     * Gets the message to show when `CommentsEnabled` is `true`.
     * Default value is "Please add any additional comments in the chat.".
     * @returns A `string`.
     */
    public get commentPrompt(): string {
        if (this._commentPrompt === '') {
            return this.responseManager.getResponseText(FeedbackResponses.commentPrompt);
        }

        return this._commentPrompt;
    }

    /**
     * Sets the message to show when `CommentsEnabled` is `true`.
     * @param value The message to show when `CommentsEnabled` is `true`.
     */
    public set commentPrompt(value: string) {
        this._commentPrompt = value;
    }

    /**
     * Gets the message to show when a user's comment has been received.
     * Default value is "Your comment has been received.".
     * @returns A `string`.
     */
    public get commentReceivedMessage(): string {
        if (this._commentReceivedMessage === '') {
            return this.responseManager.getResponseText(FeedbackResponses.commentReceivedMessage);
        }

        return this._commentReceivedMessage;
    }

    /**
     * Sets the message to show when a user's comment has been received.
     * @param value The message to show when a user's comment has been received.
     */
    public set commentReceivedMessage(value: string) {
        this._commentReceivedMessage = value;
    }
}
