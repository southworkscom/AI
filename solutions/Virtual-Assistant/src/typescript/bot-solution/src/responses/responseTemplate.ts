// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { InputHints } from 'botframework-schema';
import { Reply } from './Reply';

export class ResponseTemplate {

    constructor (text: string, speak: string, inputHint: string = InputHints.AcceptingInput){
        
        this.replies = new Reply[1];
        this.replies[0] = new Reply; {

            text = text,
            speak = speak
        }
        this.inputHint = inputHint;
    }

    public replies: Reply[] = [];

    public SuggestedActions: string[] = [];

    public inputHint: string = InputHints.AcceptingInput;    

    public reply : Reply = this.replies.length > 0 ? this.replies[this.GetRandom(this.replies.length)] : undefined;

    private GetRandom ( upper: any) {
        return Math.random();
    }
}
