import { Middleware, TurnContext } from 'botbuilder';

export class SetLocaleMiddleware implements Middleware {
    private readonly defaultLocale: string;

    constructor(defaultLocale: string) {
        this.defaultLocale = defaultLocale;
    }

    public onTurn(context: TurnContext, next: () => Promise<void>): Promise<void> {
        throw new Error('Method not implemented.');
    }
}
