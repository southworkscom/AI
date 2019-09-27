/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { IReceiveRequest } from 'botframework-streaming-extensions';
import { IRouteAction } from './routerAction';

export interface IRouteContext {
    request: IReceiveRequest;
    routerData: Object;
    action: IRouteAction;
}
