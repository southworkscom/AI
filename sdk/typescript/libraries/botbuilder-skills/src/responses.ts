/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { IResponseIdCollection } from 'botbuilder-solutions';
import { join } from 'path';

export class Responses implements IResponseIdCollection {
    // Generated accessors
    public readonly name: string = Responses.name;
    public static readonly pathToResource: string = join(__dirname, 'resources');
    public static readonly confirmSkillSwitch: string = 'confirmSkillSwitch';
}
