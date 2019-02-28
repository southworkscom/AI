import { TextPrompt } from 'botbuilder-dialogs';

export class FooDialog extends TextPrompt {
    constructor() {
        super(FooDialog.name);
    }
}
