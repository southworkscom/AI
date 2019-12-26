/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { PromptOptions } from "botbuilder-dialogs";
import { Activity } from "botbuilder";
import { ISkillManifest } from '../models/manifest/skillManifest';

export class SwitchSkillDialogOptions implements PromptOptions {

    public skill?: ISkillManifest; 
    public prompt: string | Partial<Activity>;
    
    public constructor(
        prompt: string | Partial<Activity>,
    ) {
        this.prompt = prompt;
    }

    public switchSkillDialogOptions(prompt: Activity, manifest: ISkillManifest) {
        prompt = prompt;
        this.skill = manifest;
    }
}
