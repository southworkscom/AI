import { BazDialog } from "bot-solution";
import { DialogContext } from "botbuilder-dialogs";

export class BarDialog extends BazDialog {
    protected route(innerDc: DialogContext): Promise<void> {
        return Promise.resolve();
    };
}