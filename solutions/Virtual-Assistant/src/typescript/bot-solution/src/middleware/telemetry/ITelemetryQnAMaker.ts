import { TurnContext } from 'botbuilder';
import { QnAMakerResult } from 'botbuilder-ai';

export interface ITelemetryQnAMaker {

    readonly logOriginalMessage: boolean;

    readonly logUserName: boolean;

    recognize(context: TurnContext): Promise<QnAMakerResult[]>;
}
