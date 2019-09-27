/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { IReceiveRequest } from 'botframework-streaming-extensions';

export interface IRouteAction {
    action(receiveRequest: IReceiveRequest, data: Object): Promise<Object|undefined>;
}
