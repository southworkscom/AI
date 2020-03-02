/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
import { IBotSettingsBase, IEnhancedBotFrameworkSkill } from 'botbuilder-solutions';

export interface IBotSettings extends IBotSettingsBase {
    skillHostEndpoint: string;
    skills: IEnhancedBotFrameworkSkill[];
}
