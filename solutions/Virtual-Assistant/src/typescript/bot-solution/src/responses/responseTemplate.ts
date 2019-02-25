// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { InputHints } from 'botframework-schema';
import { Reply } from './reply';

export class ResponseTemplate {

    constructor(text: string, speak: string, inputHint: string = InputHints.AcceptingInput) {

        this.replies[0] = {
            text: text,
            speak: speak,
            cardText: ''
        };
        this.inputHint = inputHint;
    }
    public replies: Reply[] = [];

    public suggestedActions: string[] = [];

    public inputHint: string = InputHints.AcceptingInput;

    public reply?: Reply = this.replies.length > 0 ? this.replies [ this.getRandom (this.replies.length) ] : undefined;

    private getRandom (upper: number): number {

       return crypto.randomBytes(upper);
    }
}
