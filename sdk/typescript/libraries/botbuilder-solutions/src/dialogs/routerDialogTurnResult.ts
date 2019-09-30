/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Define router dialog turn result.
 */

import { RouterDialogTurnStatus } from './routerDialogTurnStatus';

export class RouterDialogTurnResult {

    public status: RouterDialogTurnStatus;

    public constructor (status: RouterDialogTurnStatus) {
        this.status = status;
    }
}
