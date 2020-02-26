/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { ISlot, ITriggers } from './';

/**
 * Definition of a Manifest Action. Describes how an action is trigger and any slots (parameters) it accepts.
 */
export interface IActionDefinition {
    description: string;
    slots: ISlot[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    response: any;
    triggers: ITriggers;
}
