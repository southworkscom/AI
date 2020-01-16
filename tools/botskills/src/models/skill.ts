/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
// import { IEndpoint } from './manifestV2/skillManifestV2';

export interface ISkill {
    id: string;
    endpoint: string;
    skillAppId: string;
}
