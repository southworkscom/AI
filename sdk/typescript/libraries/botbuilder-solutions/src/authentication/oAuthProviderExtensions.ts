/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { OAuthProvider } from './oAuthProvider';

export class OAuthProviderExtensions {

    public getAuthenticationProvider(provider: string): OAuthProvider {
        switch (provider) {
            case 'Azure Active Directory':
            case 'Azure Active Directory v2':
            case OAuthProvider.AzureAD.toString():
                return OAuthProvider.AzureAD;
            case OAuthProvider.Google.toString():
                return OAuthProvider.Google;
            case OAuthProvider.Todoist.toString():
                return OAuthProvider.Todoist;
            case 'generic Oauth 2':
            case OAuthProvider.GenericOauth2.toString():
                return OAuthProvider.GenericOauth2;
            default:
                throw new Error(`The given provider '${provider}' could not be parsed.`);
        }
    }
}