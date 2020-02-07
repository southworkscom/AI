/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

 /**
 * Enhanced version of BotFrameworkSkill that adds additional properties commonly needed by a Skills VA
 */
export interface EnhancedBotFrameworkSkill {
    
    /**
     * Gets or sets the Name of the skill.
     */    
    name: string;

    /**
     * Gets or sets the Description of the skill.
     */    
    description: string;
}
