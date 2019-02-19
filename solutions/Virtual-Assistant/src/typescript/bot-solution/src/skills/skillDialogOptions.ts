// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { SkillDefinition } from "./skillDefinition";

export interface SkillDialogOptions{
   
    skillDefinition: SkillDefinition;

    parameters: Map<string, object>;
}