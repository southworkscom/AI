import { RecognizerResult, TurnContext } from 'botbuilder';
import { DialogContext } from 'botbuilder-dialogs';

export interface ITelemetryLuisRecognizer {

    readonly logOriginalMessage: boolean;

    readonly logUserName: boolean;

    recognize(context: TurnContext | DialogContext, logOriginalMessage?: boolean): Promise<RecognizerResult>;
}
