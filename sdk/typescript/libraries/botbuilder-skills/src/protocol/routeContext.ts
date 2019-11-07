/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { ReceiveRequest } from 'microsoft-bot-protocol';
// PENDING: the next line should be uncommented when the ws library is merged
// import { IReceiveRequest } from 'botframework-streaming-extensions';
import { IRouteAction } from './routeAction';

export interface IRouteContext {
    // PENDING: ReceiveRequest should be IReceiveRequest when the ws library is stable
    request: ReceiveRequest;
    routerData: Object;
    action: IRouteAction;
}
