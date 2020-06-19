/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { IBotSettingsBase } from 'bot-solutions';
import { TokenExchangeConfig } from '../tokenExchange/';

export interface IBotSettings extends IBotSettingsBase {
    tokenExchangeConfig: TokenExchangeConfig;
}
