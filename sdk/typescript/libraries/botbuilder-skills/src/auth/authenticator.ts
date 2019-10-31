/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import {WebRequest, WebResponse } from 'botbuilder';
import { ClaimsIdentity } from 'botframework-connector';
import { Response } from 'microsoft-bot-protocol';
import { IAuthenticationProvider } from './authenticationProvider';
import { AuthHelpers } from './authHelpers';
import { IWhitelistAuthenticationProvider } from './whitelistAuthenticationProvider';

export interface IAuthenticator {
    authenticate(webRequest: WebRequest, webResponse: WebResponse): Promise<ClaimsIdentity>;
}

export class Authenticator implements IAuthenticator {

    private readonly authenticationProvider: IAuthenticationProvider;
    private readonly whiteListAuthenticationProvider: IWhitelistAuthenticationProvider;

    public constructor (
        authenticationProvider: IAuthenticationProvider,
        whitelistAuthenticationProvider: IWhitelistAuthenticationProvider
        ) {
            if (authenticationProvider === undefined) throw new Error('autheticationProvider is undefined');
            if (whitelistAuthenticationProvider === undefined) throw new Error('whitelistAuthenticationProvider is undefined');
            this.authenticationProvider = authenticationProvider;
            this.whiteListAuthenticationProvider = whitelistAuthenticationProvider;
        }

    public async authenticate(webRequest: WebRequest, webResponse: WebResponse): Promise<ClaimsIdentity> {
        if (webRequest === undefined) throw new Error('webRequest is undefined');
        if (webResponse === undefined) throw new Error('webResponse is undefined');

        const response: Response = new Response();
        const authorizationHeader: string = webRequest.headers('Authorization');
        if (authorizationHeader === '') {
            response.statusCode = 401;
        }

        const claimsIdentity: ClaimsIdentity = this.authenticationProvider.authenticate(authorizationHeader);

        if (claimsIdentity === undefined) {
            response.statusCode = 401;
        }

        const appIdClaimName: string = AuthHelpers.getAppIdClaimName(claimsIdentity);
        const appId: string | null = claimsIdentity.getClaimValue(appIdClaimName);
        if (appId !== null && this.whiteListAuthenticationProvider.appsWhitelist !== undefined &&
        this.whiteListAuthenticationProvider.appsWhitelist.size > 0 &&
        !this.whiteListAuthenticationProvider.appsWhitelist.has(appId)) {
            response.statusCode = 401;
            await webResponse.send('Skill could not allow access from calling bot.');
        }

        return claimsIdentity;
    }
}
