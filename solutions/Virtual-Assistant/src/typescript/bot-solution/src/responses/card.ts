// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { IcardData } from './cardDataBase';

export class Card {

    constructor (name: string, data : IcardData) {
        this.name = name;
        this.data = data;
    }

    public name: string = '';

    public data : IcardData = '';
}
