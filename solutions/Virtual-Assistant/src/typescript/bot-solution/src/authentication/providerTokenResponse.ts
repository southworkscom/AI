import { TokenResponse } from 'botframework-schema';

export interface IProviderTokenResponse {
    authenticationProvider: OAuthProvider;
    tokenResponse: TokenResponse;
}

export function isProviderTokenResponse(value: Object): boolean {
    return (<IProviderTokenResponse>value).authenticationProvider !== undefined;
}

export enum OAuthProvider {
    AzureAD,
    Google,
    Todoist
}
