// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License

import { BotTelemetryClient } from 'botbuilder';
import {
    ComponentDialog,
    DialogTurnResult,
    WaterfallDialog,
    WaterfallStepContext } from 'botbuilder-dialogs';
import { BotServices } from '../../botServices';
import { EscalateResponses } from '../escalate/escalateResponses';

export class EnterpriseDialog extends ComponentDialog {
    // Fields
    private static readonly responder: EscalateResponses = new EscalateResponses();

    // Constructor
    constructor(botServices: BotServices, dialogId: string, telemetryClient: BotTelemetryClient) {
        super(EnterpriseDialog.name);
        this.initialDialogId = EnterpriseDialog.name;
        // tslint:disable-next-line:no-any
        const escalate: ((sc: WaterfallStepContext<{}>) => Promise<DialogTurnResult<any>>)[] = [
            this.sendEscalationMessage.bind(this)
        ];
        this.addDialog(new WaterfallDialog(this.initialDialogId, escalate));
    }

    private async sendEscalationMessage(sc: WaterfallStepContext): Promise<DialogTurnResult> {
        await EnterpriseDialog.responder.replyWith
        (
            sc.context,
            EscalateResponses.responseIds.SendEscalationMessage
        );

        return sc.endDialog(<boolean> sc.result);
    }
}
