/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { WebRequest } from 'botbuilder';

export interface IServiceClientCredentials {
    microsoftAppId: string;

    getToken(forceRefresh?: boolean): Promise<string>;

    processHttpRequestAsync(request: WebRequest): Promise<void>;
}
