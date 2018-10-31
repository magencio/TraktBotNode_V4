import * as restify from 'restify';
import * as path from 'path';
import { config } from 'dotenv';
import { BotFrameworkAdapter, ConversationState } from 'botbuilder';
import { MyBot } from './myBot';
import { MyBotServices } from './myBotServices';
import { ConsoleLoggerMiddleware } from './core/middleware/consoleLoggerMiddleware';
import { RandomizeReplyMiddleware } from './core/middleware/randomizeReplyMiddleware';
import { TelemetryLoggerMiddleware } from './core/middleware/telemetryLoggerMiddleware';

// Read botFilePath and botFileSecret from .env file.
const envFile = path.join(__dirname, '..', '.env');
const env = config({ path: envFile });

// Load bot services from .bot file.
let botServices;
try {
    const botFile = path.join(__dirname, '..', (process.env.botFilePath || ''));
    botServices = new MyBotServices(botFile, process.env.botFileSecret, process.env.NODE_ENV);
} catch (err) {
    console.error(`\nError reading bot file. Please ensure you have valid botFilePath and botFileSecret set for your environment.`);
    console.error(`\n - The botFileSecret is available under appsettings for your Azure Bot Service bot.`);
    console.error(`\n - If you are running this bot locally, consider adding a .env file with botFilePath and botFileSecret.\n\n`);
    process.exit();
}

// Create adapter.
const adapter = new BotFrameworkAdapter({
    appId: botServices.endpoint.appId || process.env.microsoftAppID,
    appPassword: botServices.endpoint.appPassword || process.env.microsoftAppPassword
});

// Create conversation state.
const conversationState = new ConversationState(botServices.storage);

// Create the bot.
const myBot = new MyBot(botServices, conversationState);

// Catch-all for errors.
adapter.onTurnError = async (context, error) => {
    console.error(`\n [onTurnError]: ${error}`);
    context.sendActivity(`Oops. Something went wrong!`);

    await conversationState.load(context);
    await conversationState.clear(context);
    await conversationState.saveChanges(context);
};

// Configure middleware.
adapter.use(new ConsoleLoggerMiddleware());
adapter.use(new RandomizeReplyMiddleware());
adapter.use(new TelemetryLoggerMiddleware(botServices.telemetry));

// Create HTTP server and listen for incoming requests.
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log(`\n${server.name} listening to ${server.url}`);
});

server.post('/api/messages', (req, res) => {
    adapter.processActivity(req, res, async (context) => {
        // Route activities to bot.
        await myBot.onTurn(context);
    });
});