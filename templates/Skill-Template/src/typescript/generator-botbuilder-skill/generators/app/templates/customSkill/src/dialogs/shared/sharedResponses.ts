// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License

import { IResponseIdCollection } from 'bot-solution';

/**
 * Contains bot responses.
 */
// tslint:disable-next-line:no-unnecessary-class
export class SharedResponses implements IResponseIdCollection {
    // Generated accessors
    public static responseIds: {
        didntUnderstandMessage : string;
        cancellingMessage : string;
        noAuth : string;
        authFailed : string;
        actionEnded : string;
        errorMessage : string;
    } = {
        didntUnderstandMessage : 'DidntUnderstandMessage',
        cancellingMessage : 'CancellingMessage',
        noAuth : 'NoAuth',
        authFailed : 'AuthFailed',
        actionEnded : 'ActionEnded',
        errorMessage : 'ErrorMessage'
    };
}
