/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import i18next from 'i18next';
import i18nextNodeFsBackend from 'i18next-node-fs-backend';
import * as path from 'path';
import {
    TurnContext } from 'botbuilder';
import { ApplicationInsightsWebserverMiddleware } from 'botbuilder-applicationinsights';
import * as restify from 'restify';
import { DefaultAdapter } from './adapters/defaultAdapter';
import container from './inversify.config';
import { TYPES } from './types/constants';
import { MainDialog } from './dialogs/mainDialog';
import { DefaultActivityHandler } from './bots/defaultActivityHandler';
import { Locales } from 'bot-solutions';

// Configure internationalization and default locale
i18next.use(i18nextNodeFsBackend)
    .init({
        fallbackLng: 'en-us',
        preload: ['de-de', 'en-us', 'es-es', 'fr-fr', 'it-it', 'zh-cn'],
        backend: {
            loadPath: join(__dirname, 'locales', '{{lng}}.json')
        }
    })
    .then(async (): Promise<void> => {
        await Locales.addResourcesFromPath(i18next, 'common');
    });

const adapter: DefaultAdapter = container.get<DefaultAdapter>(TYPES.DefaultAdapter);
const bot: DefaultActivityHandler<MainDialog> = container.get<DefaultActivityHandler<MainDialog>>(TYPES.DefaultActivityHandler);

// Create server
const server: restify.Server = restify.createServer();

// Enable the Application Insights middleware, which helps correlate all activity
// based on the incoming request.
server.use(restify.plugins.bodyParser());
server.use(restify.plugins.queryParser());
server.use(restify.plugins.authorizationParser());
server.use(ApplicationInsightsWebserverMiddleware);

server.listen(process.env.port || process.env.PORT || '3979', (): void => {
    console.log(` ${ server.name } listening to ${ server.url } `);
    console.log(`Get the Emulator: https://aka.ms/botframework-emulator`);
    console.log(`To talk to your bot, open your '.bot' file in the Emulator`);
});

// Listen for incoming requests
server.post('/api/messages', async (req: restify.Request, res: restify.Response): Promise<void> => {
    // Route received a request to adapter for processing
    await adapter.processActivity(req, res, async (turnContext: TurnContext): Promise<void> => {
        // route to bot activity handler.
        await bot.run(turnContext);
    });
});

// // Register the request handler.
// const handler: SkillHandler = new SkillHandler(adapter, bot, skillConversationIdFactory, credentialProvider, authenticationConfiguration);
// const skillEndpoint = new ChannelServiceRoutes(handler);
// skillEndpoint.register(server, '/api/skills');
