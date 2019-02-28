import { TextPrompt } from 'botbuilder-dialogs';

export class BazDialog extends TextPrompt {
    constructor() {
        super(BazDialog.name);
    }
}
