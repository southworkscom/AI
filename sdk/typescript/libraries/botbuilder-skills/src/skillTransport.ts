/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { TurnContext } from 'botbuilder';
import { Activity } from 'botframework-schema';
import { IServiceClientCredentials } from './auth';
import { ISkillManifest } from './models';

export type TokenRequestHandler = (activity: Activity) => Promise<void>;
export type FallbackHandler = (activity: Activity) => Promise<void>;

export interface ISkillTransport {
    forwardToSkill(
        skillManifest: ISkillManifest,
        serviceClientCredentials: IServiceClientCredentials,
        turnContext: TurnContext,
        activity: Partial<Activity>,
        tokenRequestHandler?: TokenRequestHandler,
        fallbackHandler?: FallbackHandler
    ): Promise<Partial<Activity>>;
    cancelRemoteDialogs(skillManifest: ISkillManifest, appCredentials: IServiceClientCredentials, turnContext: TurnContext): Promise<void>;
    disconnect(): void;
}
