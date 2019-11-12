/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { WebRequest } from 'botbuilder';
import { WebResource } from '@azure/ms-rest-js';

export interface IServiceClientCredentials {
    microsoftAppId: string;

    getToken(forceRefresh?: boolean): Promise<string>;
    // This method should return a Promise<void> once the WebSocket library is merged
    processHttpRequest(request: WebRequest): Promise<WebResource>;
}
