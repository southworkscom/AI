// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License

import { IResponseIdCollection } from 'bot-solution';

/**
 * Contains bot responses.
 */
// tslint:disable-next-line:no-unnecessary-class
export class MainResponses implements IResponseIdCollection {
    // Generated accessors
    public static responseIds: {
        welcomeMessage: string;
        helpMessage: string;
        greetingMessage: string;
        goodbyeMessage: string;
        logOut: string;
        featureNotAvailable: string;
        cancelMessage: string;
    } = {
        welcomeMessage: 'WelcomeMessage',
        helpMessage: 'HelpMessage',
        greetingMessage: 'GreetingMessage',
        goodbyeMessage: 'GoodbyeMessage',
        logOut: 'LogOut',
        featureNotAvailable: 'FeatureNotAvailable',
        cancelMessage: 'CancelMessage'
    };
}
