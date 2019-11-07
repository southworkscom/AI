/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { IRouteAction } from './routeAction';

export interface IRouteTemplate {
    method: string;
    path: string;
    action: IRouteAction;
}
