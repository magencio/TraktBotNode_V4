import { ServiceTypes, IGenericService } from 'botframework-config';
import { TraktTv } from './model/traktTv';
import { BotServices } from './core/services/botServices';

const TRAKTTV_SERVICE = 'traktTv';
const CLIENT_ID = 'clientId';
const CLIENT_SECRET = 'clientSecret';

/**
 * Represents references to external services.
 */
export class MyBotServices extends BotServices {

    /**
     * Creates a new MyBotServices instance.
     * @param botFilePath Path to the .bot configuration file.
     * @param botFileSecret Secret to decrypt the .bog configuration file.
     * @param environment Environment name to find the right bot endpoint.
     */
    constructor(botFilePath: string, botFileSecret: string, environment: string) {
        super(botFilePath, botFileSecret, environment);

        this.botConfig.services.forEach(service => {
            switch (service.type) {
                case service.name === TRAKTTV_SERVICE && ServiceTypes.Generic:
                    const traktTvConfig = <IGenericService>service;
                    const clientId = traktTvConfig.configuration[CLIENT_ID];
                    const clientSecret = traktTvConfig.configuration[CLIENT_SECRET];
                    this.traktTv = new TraktTv(clientId, clientSecret);
                    break;
            }
        });
    }

    /**
     * Trakt.tv client.
     */
    public traktTv: TraktTv;
}