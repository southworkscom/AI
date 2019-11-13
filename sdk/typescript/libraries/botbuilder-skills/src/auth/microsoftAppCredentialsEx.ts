/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { WebRequest } from 'botbuilder';
import { MicrosoftAppCredentials } from 'botframework-connector';
import { IServiceClientCredentials } from './serviceClientCredentials';
import { WebResource } from '@azure/ms-rest-js';

export class MicrosoftAppCredentialsEx extends MicrosoftAppCredentials implements IServiceClientCredentials {
    // PENDING: we should check if this property exists in MicrosoftAppCredentials
    public microsoftAppId: string;
    // This method should return a Promise<void> once the WebSocket library is merged
    public processHttpRequest(request: WebRequest): Promise<WebResource> {
        throw new Error("Method not implemented.");
    }

    public constructor(appId: string, password: string, oauthScope?: string) {
        super(appId, password);
        if (oauthScope) {
            this.oAuthScope = oauthScope;
        }
        // PENDING: we should check if this property exists in MicrosoftAppCredentials
        this.microsoftAppId = appId;

        this.oAuthEndpoint = 'https://login.microsoftonline.com/microsoft.com';
    }
}
