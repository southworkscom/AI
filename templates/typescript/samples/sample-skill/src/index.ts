/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import {
    BotFrameworkAdapter,
    TurnContext } from 'botbuilder';
import { ApplicationInsightsWebserverMiddleware } from 'botbuilder-applicationinsights';
import { manifestGenerator } from 'bot-solutions';
import { join } from 'path';
import * as restify from 'restify';
import { DefaultAdapter } from './adapters';
import { DefaultActivityHandler } from './bots/defaultActivityHandler';
import { MainDialog } from './dialogs/mainDialog';
import { IBotSettings } from './services/botSettings';
import container from './inversify.config';
import { TYPES } from './types/constants';
const defaultAdapter: DefaultAdapter = container.get<DefaultAdapter>(TYPES.DefaultAdapter);
const adapter: BotFrameworkAdapter = container.get<BotFrameworkAdapter>(TYPES.BotFrameworkAdapter);

// Create server
const server: restify.Server = restify.createServer();

// Enable the Application Insights middleware, which helps correlate all activity
// based on the incoming request.
server.use(restify.plugins.bodyParser());
server.use(ApplicationInsightsWebserverMiddleware);

server.listen(process.env.port || process.env.PORT || '3980', (): void => {
    console.log(`${ server.name } listening to ${ server.url }`);
    console.log(`Get the Emulator: https://aka.ms/botframework-emulator`);
    console.log(`To talk to your bot, open your '.bot' file in the Emulator`);
});

// Listen for incoming requests
server.post('/api/messages', async (req: restify.Request, res: restify.Response): Promise<void> => {
    const bot: DefaultActivityHandler<MainDialog> = container.get<DefaultActivityHandler<MainDialog>>(TYPES.DefaultActivityHandler);
    // Route received a request to adapter for processing
    await defaultAdapter.processActivity(req, res, async (turnContext: TurnContext): Promise<void> => {
        // route to bot activity handler.
        await bot.run(turnContext);
    });
});

server.get('/api/messages', async (req: restify.Request, res: restify.Response): Promise<void> => {
    const bot: DefaultActivityHandler<MainDialog> = container.get<DefaultActivityHandler<MainDialog>>(TYPES.DefaultActivityHandler);
    // Route received a request to adapter for processing
    await defaultAdapter.processActivity(req, res, async (turnContext: TurnContext): Promise<void> => {
        // route to bot activity handler.
        await bot.run(turnContext);
    });
});

// Listen for incoming assistant requests
server.post('/api/skill/messages', async (req: restify.Request, res: restify.Response): Promise<void> => {
    const bot: DefaultActivityHandler<MainDialog> = container.get<DefaultActivityHandler<MainDialog>>(TYPES.DefaultActivityHandler);
    // Route received a request to adapter for processing
    await adapter.processActivity(req, res, async (turnContext: TurnContext): Promise<void> => {
        // route to bot activity handler.
        await bot.run(turnContext);
    });
});

const manifestPath: string = join(__dirname, 'manifestTemplate.json');
const botSettings: IBotSettings = container.get<IBotSettings>(TYPES.BotSettings);
server.use(restify.plugins.queryParser());
server.get('/api/skill/manifest', manifestGenerator(manifestPath, botSettings));
// PENDING
server.get('/api/skill/ping', async (req: restify.Request, res: restify.Response): Promise<void> => {
    // await authentication.authenticate(req, res);
});
