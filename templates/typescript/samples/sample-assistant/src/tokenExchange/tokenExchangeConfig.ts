/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
import {ITokenExchangeConfig} from './ITokenExchangeConfig';

export class TokenExchangeConfig implements ITokenExchangeConfig {
    public provider: string = '';
    public connectionName: string = '';
}