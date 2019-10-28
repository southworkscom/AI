/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
import { RouterDialogTurnStatus } from './routerDialogTurnStatus';

/**
 * Define router dialog turn result
 */
export class RouterDialogTurnResult {

    public constructor(status: RouterDialogTurnStatus) {
        this.status = status;
    }

    public status: RouterDialogTurnStatus;
}
