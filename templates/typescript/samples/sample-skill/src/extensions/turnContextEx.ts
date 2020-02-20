/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { TurnContext } from 'botbuilder';
import { SkillValidation } from 'botframework-connector';

export namespace TurnContextEx {

    export function isSkill(turnContext: TurnContext): boolean {
        return turnContext.turnState.get('BotIdentity') && SkillValidation.isSkillClaim(turnContext.turnState.get('BotIdentity').claims) ? true : false;
    }

}