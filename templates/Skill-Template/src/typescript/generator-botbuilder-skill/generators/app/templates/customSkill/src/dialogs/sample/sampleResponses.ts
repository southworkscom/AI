// https://docs.microsoft.com/en-us/visualstudio/modeling/t4-include-directive?view=vs-2017
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { IResponseIdCollection } from 'bot-solution';

/**
 * Contains bot responses.
 */
// tslint:disable-next-line:no-unnecessary-class
export class SampleResponses implements IResponseIdCollection {

    // Generated accessors
    public static responseIds: {
        namePrompt: string;
        haveNameMessage: string;
    } = {
        namePrompt: 'NamePrompt',
        haveNameMessage: 'HaveNameMessage'
    };
}
