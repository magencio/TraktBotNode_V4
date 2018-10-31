import { Storage } from 'botbuilder';
import { IEndpointService, ServiceTypes, ILuisService, IAppInsightsService, ICosmosDBService, BotConfiguration } from "botframework-config";
import { CosmosDbStorage } from "botbuilder-azure";
import { LuisApplication } from "botbuilder-ai";
import { AppInsightsBotTelemetry } from '../telemetry/appInsightsBotTelemetry';
import { TelemetryLuisRecognizer } from '../recognizers/telemetryLuisRecognizer';
import { BotTelemetry } from '../telemetry/botTelemetry';
import { IntentRecognizer } from '../recognizers/intentRecognizer';

/**
 * Represents references to external services.
 */
export class BotServices {
    protected readonly botConfig: BotConfiguration;

    /**
     * Creates a new BotServices instance.
     * @param botFilePath Path to the .bot configuration file.
     * @param botFileSecret Secret to decrypt the .bog configuration file.
     * @param environment Environment name to find the right bot endpoint.
     */
    constructor(botFilePath: string, botFileSecret: string, environment: string) {
        this.botConfig = BotConfiguration.loadSync(botFilePath, botFileSecret);

        const endpointName = (environment || 'development');

        this.botConfig.services.forEach(service => {
            switch (service.type) {
                case service.name === endpointName && ServiceTypes.Endpoint:
                    this.endpoint = <IEndpointService>service;
                    break;

                case service.name === 'botState' && ServiceTypes.CosmosDB:
                    const cosmosDbConfig = <ICosmosDBService>service;
                    this.storage = new CosmosDbStorage({
                        serviceEndpoint: cosmosDbConfig.endpoint,
                        authKey: cosmosDbConfig.key,
                        databaseId: cosmosDbConfig.database,
                        collectionId: cosmosDbConfig.collection
                    });
                    break;

                case ServiceTypes.Luis:
                    const luisConfig = <ILuisService>service;
                    const luisApplication = <LuisApplication>{
                        applicationId: luisConfig.appId,
                        endpointKey: luisConfig.subscriptionKey,
                        endpoint: `https://${luisConfig.region}.api.cognitive.microsoft.com`
                    };
                    this.recognizers[luisConfig.name] = new TelemetryLuisRecognizer(luisApplication);
                    break;

                case ServiceTypes.AppInsights:
                    const appInsightsConfig = <IAppInsightsService>service;
                    this.telemetry = new AppInsightsBotTelemetry(appInsightsConfig.instrumentationKey, true, false);
                    break;
            }
        });
    }

    /**
     * Endpoint configuration.
     */
    public endpoint: IEndpointService;

    /**
     * Persistent storage.
     */
    public storage: Storage;

    /**
     * Set of intent recognizers.
     */
    public recognizers: { [id: string] : IntentRecognizer; } = {};

    /**
     * Telemetry client.
     */
    public telemetry: BotTelemetry;
}