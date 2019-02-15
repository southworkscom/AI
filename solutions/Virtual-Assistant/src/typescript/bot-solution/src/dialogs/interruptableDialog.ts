// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { BotTelemetryClient } from 'botbuilder-core';
import {
    ComponentDialog,
    DialogContext,
    DialogTurnResult } from 'botbuilder-dialogs';

export abstract class InterruptableDialog extends ComponentDialog {
    // Fields
    public primaryDialogName: string;

    // Constructor
    constructor(dialogId: string, telemetryClient: BotTelemetryClient) {
        super(dialogId);
        this.primaryDialogName = dialogId;
    }

    protected async onBeginDialog(dc: DialogContext, options: object): Promise<DialogTurnResult> {
        if (dc.dialogs.find(this.primaryDialogName) !== undefined) {
            // Overrides default behavior which starts the first dialog added to the stack (i.e. Cancel waterfall)
            return dc.beginDialog(this.primaryDialogName, options);
        } else {
            // If we don't have a matching dialog, start the initial dialog
            return dc.beginDialog(this.initialDialogId, options);
        }
    }
}
