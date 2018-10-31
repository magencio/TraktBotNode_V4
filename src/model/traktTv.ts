import axios from 'axios'; // Docs: https://github.com/axios/axios
import { Show, Season } from './model';

enum ExtendedInfo { Min = "min", Full = "full", Episodes = "episodes", FullWithEpisodes = "fullwithepisodes"}

/**
 * Access to Trakt.tv services.
 *
 * Trakt.tv API apps settings: https://trakt.tv/oauth/applications.
 */
export class TraktTv {
    private clientId: string;
    private clientSecret: string;

    constructor(clientId: string, clientSecret?: string) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    public async getUserName(authToken: string) : Promise<string> {
        const results = await this.get('users/settings', {}, authToken);
        return results.user.username;
    }

    public async getTrendingShows() : Promise<Show[]> {
        const results = await this.get('shows/trending', {extended: ExtendedInfo.Full});
        return results.map(result => result.show);
    }

    public async getPopularShows() : Promise<Show[]> {
        return await this.get('shows/popular', { extended: ExtendedInfo.Full });
    }

    public async getRecommendedShows(authToken: string) : Promise<Show[]> {
        return await this.get('recommendations/shows', { extended: ExtendedInfo.Full }, authToken);
    }

    public async searchShows(query: string) : Promise<Show[]> {
        const results = await this.get('search', { query: query, type: 'show', extended: ExtendedInfo.Min});
        return results.map(result => result.show);
    }

    public async getShowSummary(traktId: number) : Promise<Show> {
        return await this.get(`shows/${traktId}`, { extended: ExtendedInfo.Full });
    }

    public async getSeasons(traktId: number) : Promise<Season[]> {
        return await this.get(`shows/${traktId}/seasons`, { extended: ExtendedInfo.Episodes });
    }

    public async addWatchedEpisode(authToken: string, traktId: number) : Promise<boolean> {
        const results = await this.post('sync/history', { episodes: [ { ids: { trakt: traktId } } ] }, authToken);
        return results.added.episodes === 1;
    }

    private async get(api: string, params: any, authToken?: string) : Promise<any> {
        const result = await axios({
            method: 'get',
            baseURL: 'https://api-v2launch.trakt.tv',
            url: api,
            params: params,
            headers: {
                'trakt-api-key' : this.clientId,
                'trakt-api-version' : '2',
                'authorization': authToken ? `Bearer ${authToken}` : ''
            }
        });
        return result.data;
    }

    private async post(api: string, data: any, authToken?: string) : Promise<any> {
        const result = await axios({
            method: 'post',
            baseURL: 'https://api-v2launch.trakt.tv',
            url: api,
            data: data,
            headers: {
                'trakt-api-key' : this.clientId,
                'trakt-api-version' : '2',
                'authorization': authToken ? `Bearer ${authToken}` : ''
            }
        });
        return result.data;
    }
}
