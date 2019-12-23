import { PromptOptions } from "botbuilder-dialogs";
import { Activity } from "botbuilder";
import { ISkillManifest } from '../models/manifest/skillManifest';

/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

export class SwitchSkillDialogOptions implements PromptOptions {
    
    public switchSkillDialogOptions(prompt: Activity, manifest: ISkillManifest) {
        prompt = prompt;
        this.skill = manifest;
    }

    public skill?: ISkillManifest; 
}
