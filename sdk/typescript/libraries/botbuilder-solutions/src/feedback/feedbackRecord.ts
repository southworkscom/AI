import { Activity } from 'botframework-schema';

/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
export class FeedbackRecord {
    /** 
    * Gets or sets the activity for which feedback was requested.
    * <value>
    * The activity for which feedback was requested.
    * </value>
    */
    public request?: Activity;

    /**
    * Gets or sets feedback value submitted by user.
    * <value>
    * Feedback value submitted by user.
    * </value>
    */
    public feedback: string = '';

    /**
    * Gets or sets free-form comment submitted by user.
    * <value>
    * Free-form comment submitted by user.
    * </value>
    */
    public comment: string = '';

    /** 
    * Gets or sets tag for categorizing feedback.
    * <value>
    * Tag for categorizing feedback.
    * </value>
    */
    public tag: string = '';
}
