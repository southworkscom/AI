import { Middleware, TurnContext } from 'botbuilder';

export class EventDebuggerMiddleware implements Middleware {
    public onTurn(context: TurnContext, next: () => Promise<void>): Promise<void> {
        throw new Error('Method not implemented.');
    }
}
