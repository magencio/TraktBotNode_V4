import { OAuthPrompt, OAuthPromptSettings } from "botbuilder-dialogs";

/**
 * The connection name here must match the one from
 * Bot Channels Registration on the settings blade in Azure.
 */
const CONNECTION_NAME = 'TraktTv';

/**
 * Prompts the user to login on Trakt.tv's via OAuth.
 */
export class TraktTvLoginPrompt extends OAuthPrompt {

    public static getName() : string {
        return 'TraktTvLoginPrompt';
    }

    constructor() {
        super(TraktTvLoginPrompt.getName(), <OAuthPromptSettings>{
            connectionName: CONNECTION_NAME,
            text: 'First I need to know who you are in Trakt.tv. Please sign in',
            title: 'Sign in',
            timeout: 300000 // User has 5 minutes to login (1000 * 60 * 5)
        });
    }
}