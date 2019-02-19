// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { BotTelemetryClient, Activity, TurnContext } from 'botbuilder-core';
import { ActivityTypes } from 'botbuilder';
import {
    Dialog,
    DialogInstance,
    DialogContext,
    DialogReason,
    DialogTurnStatus,
    DialogTurnResult } from 'botbuilder-dialogs';
import { ActivityExtensions } from './../../../assistant/src/extensions/activityExtensions';
import { InterruptableDialog } from './interruptableDialog';    
import { InterruptionAction } from './interruptionAction';

export abstract class routerDialog extends InterruptableDialog {

    public TelemetryClient: BotTelemetryClient;

    // Constructor
    constructor(dialogId: string, telemetryClient: BotTelemetryClient) {
        super(dialogId, telemetryClient);
        this.TelemetryClient = telemetryClient;
    }
   
    protected onBeginDialog(innerDc: DialogContext, options: object): Promise<DialogTurnResult> {
        return this.onContinueDialog(innerDc);
    }

    protected async onContinueDialog(innerDc: DialogContext): Promise<DialogTurnResult> {  
        const status = await this.onInterruptDialog(innerDc);

        if(status == InterruptionAction.MessageSentToUser){

            // Resume the waiting dialog after interruption
            await innerDc.repromptDialog()
            return Dialog.EndOfTurn;
        }
        else if(status == InterruptionAction.StartedDialog)
        {
            // Stack is already waiting for a response, shelve inner stack
            return Dialog.EndOfTurn;
        }
        else{
            const activity: Activity = innerDc.context.activity;
            
            if (ActivityExtensions.isStartActivity(activity)){
                await this.onStart(innerDc);
            }

            switch (activity.type) {
                 case ActivityTypes.Message: {

                    const result = await innerDc.continueDialog();

                    switch (result.status) {
                        case DialogTurnStatus.empty: {
                            await this.route(innerDc);                 
                        }
                        case DialogTurnStatus.complete: 
                        case DialogTurnStatus.cancelled:{ 
                            await this.complete(innerDc, result);
                        }       
                        default:
                    }
                break;
            }    

            case ActivityTypes.Event: {
                await this.onEvent(innerDc);
                break;
            }
            default: {
                await this.onSystemMessage(innerDc);
            }
        }

        return Dialog.EndOfTurn;
        }
    } 

    protected async onEndDialog(context: TurnContext, instance: DialogInstance, reason: DialogReason): Promise<void> {
        await super.onEndDialog(context, instance, reason);
    }

    protected async onRepromptDialog(context: TurnContext, instance: DialogInstance): Promise<void> {
        await super.onRepromptDialog(context, instance);
    }
     
     /**
     * Called when the inner dialog stack is empty.
     * @param innerDC - The dialog context for the component.
     * @returns A Promise representing the asynchronous operation.
     */
    protected abstract route(innerDc: DialogContext): Promise<void>;
    
    /**
     * Called when the inner dialog stack is complete.
     * @param innerDC - The dialog context for the component.
     * @param result - The dialog result when inner dialog completed.
     * @returns A Promise representing the asynchronous operation.
     */
    protected async complete(innerDc: DialogContext, result: DialogTurnResult): Promise<void> {
        await innerDc.endDialog(result);
        return Promise.resolve();
    }
     
    /**
     * Called when an event activity is received.
     * @param innerDC - The dialog context for the component.
     * @returns A Promise representing the asynchronous operation.
     */
    protected onEvent(innerDc: DialogContext): Promise<void> {
        return Promise.resolve();
    }

     /**
     * Called when a system activity is received.
     * @param innerDC - The dialog context for the component.
     * @returns A Promise representing the asynchronous operation.
     */
    protected onSystemMessage(innerDc: DialogContext): Promise<void> {
        return Promise.resolve();
    } 

     /**
     * Called when a conversation update activity is received.
     * @param innerDC - The dialog context for the component.
     * @returns A Promise representing the asynchronous operation.
     */
    protected onStart(innerDc: DialogContext): Promise<void> {
        return Promise.resolve();
    }    
         
    protected onInterruptDialog(dc: DialogContext): Promise<InterruptionAction> {
        return Promise.resolve(InterruptionAction.NoAction);
    }
}