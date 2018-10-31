import { CardAction, ActionTypes, MessageFactory, ResourceResponse, Attachment, CardFactory, BotFrameworkAdapter } from "botbuilder";
import { WaterfallStepContext, Dialog, DialogTurnResult, WaterfallStep } from "botbuilder-dialogs";
import { IntentDialog, RECOGNIZER_RESULT } from "../core/dialogs/intentDialog";
import { ConfirmationDialog, ConfirmationDialogOptions } from "./confirmationDialog";
import { TraktTv } from "../model/traktTv";
import { Show, Season, Episode } from "../model/model";
import { TraktTvLoginPrompt } from "./traktTvLoginPrompt";
import { ChooseShowDialog, ChooseShowDialogOptions } from "./chooseShowDialog";
import { ChooseSeasonDialog, ChooseSeasonDialogOptions } from "./chooseSeasonDialog";
import { ChooseEpisodeDialog, ChooseEpisodeDialogOptions } from "./chooseEpisodeDialog";
import { INTENT_HI, INTENT_THX, INTENT_BYE, INTENT_TRENDING, INTENT_POPULAR, INTENT_RECOMMENDATIONS, INTENT_SEARCH, INTENT_STATUS, INTENT_WATCHED, INTENT_HELP, INTENT_CANCEL, INTENT_LOGOUT } from "../nlp/traktBotNLP";
import { IntentRecognizer } from "../core/recognizers/intentRecognizer";
import { BotTelemetry } from "../core/telemetry/botTelemetry";

const TOKEN = 'token';
const SHOW_TITLE = 'showTitle';

/**
 * The root dialog of the bot.
 */
export class RootDialog extends IntentDialog {

    public static getName() : string {
        return 'RootDialog';
    }

    private suggestedActions: CardAction[] = [
        { type: ActionTypes.ImBack, title: 'Trending shows', value: 'Trending shows' },
        { type: ActionTypes.ImBack, title: 'Popular shows', value: 'Popular shows' },
        { type: ActionTypes.ImBack, title: 'Recommend shows', value: 'Recommend shows' },
        { type: ActionTypes.ImBack, title: 'Search show', value: 'Search show' },
        { type: ActionTypes.ImBack, title: 'Show status', value: 'Show status' },
        { type: ActionTypes.ImBack, title: 'Episode watched', value: 'Episode watched' }
    ];

    private traktTv: TraktTv;

    constructor(recognizer: IntentRecognizer, traktTv: TraktTv, telemetry: BotTelemetry) {
        super(RootDialog.getName(), recognizer);

        this.traktTv = traktTv;

        this.matches(INTENT_HI, [this.onHi])
            .matches(INTENT_THX, [this.onThx])
            .matches(INTENT_BYE, [this.onBye])
            .matches(INTENT_TRENDING, [this.onTrending])
            .matches(INTENT_POPULAR, [this.onPopular])
            .matches(INTENT_RECOMMENDATIONS, this.onRecommendations)
            .matches(INTENT_SEARCH, this.onSearch)
            .matches(INTENT_STATUS, this.onStatus)
            .matches(INTENT_WATCHED, this.onWatched)
            .matches(INTENT_HELP, [this.onHelp])
            .matches(INTENT_CANCEL, [this.onCancel])
            .matches(INTENT_LOGOUT, [this.onLogout])
            .onDefault([this.onUnknown]);
    }

    private onHi = async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
        await stepContext.context.sendActivity(MessageFactory.suggestedActions(
            this.suggestedActions, 'Hi there! What can I do for you today?|Hello! How can I help you?'));
        return Dialog.EndOfTurn;
    }

    private onThx = async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
        await stepContext.context.sendActivity(`You are welcome|Don't mention it`);
        return Dialog.EndOfTurn;
    }

    private onBye = async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
        await stepContext.context.sendActivity('Good bye!|Bye, bye!');
        return Dialog.EndOfTurn;
    }

    private onTrending = async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
        try {
            const shows = await this.traktTv.getTrendingShows();
            await this.sendShows(stepContext, 'These are the trending shows right now:', shows);
            await this.sendWhatNow(stepContext);
            return Dialog.EndOfTurn;
        } catch (e) {
            return await this.onTraktTvError(stepContext, e);
        }
    }

    private onPopular = async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
        try {
            const shows = await this.traktTv.getPopularShows();
            await this.sendShows(stepContext, 'These are the most popular shows at the moment:', shows);
            await this.sendWhatNow(stepContext);
            return Dialog.EndOfTurn;
        } catch (e) {
            return await this.onTraktTvError(stepContext, e);
        }
    }

    private onRecommendations: WaterfallStep[] = [
        async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
            return await stepContext.beginDialog(
                ConfirmationDialog.getName(),
                <ConfirmationDialogOptions>{ question: 'Do you want personalized recommendations?' });
        },
        async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
            switch (stepContext.result) {
                case stepContext.result !== undefined && true:
                    return await stepContext.beginDialog(TraktTvLoginPrompt.getName());
                case stepContext.result !== undefined && false:
                    return await this.onPopular(stepContext);
                default:
                    return await this.onChildCancel(stepContext);
            }
        },
        async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
            if (!stepContext.result || !stepContext.result.token) {
                return await this.onAuthenticationError(stepContext);
            }

            try {
                const token = stepContext.result.token;
                const userName = await this.traktTv.getUserName(token);
                const shows = await this.traktTv.getRecommendedShows(token);
                await this.sendShows(stepContext, `These are the top recommendations for you ${userName}:`, shows);
                await this.sendWhatNow(stepContext);
                return Dialog.EndOfTurn;
            } catch (e) {
                return await this.onTraktTvError(stepContext, e);
            }
        }
    ];

    private onSearch: WaterfallStep[] = [
        async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
            return stepContext.beginDialog(
                ChooseShowDialog.getName(),
                <ChooseShowDialogOptions>{
                    question: 'Please, tell me the name of the show you are looking for',
                    recognizerResult: stepContext.values[RECOGNIZER_RESULT]
                });
        },
        async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
            if (!stepContext.result) {
                return await this.onChildCancel(stepContext);
            } else if (!stepContext.result.ids) {
                return await this.onTraktTvError(stepContext, stepContext.result);
            } else {
                await this.sendShows(stepContext, 'Here you have it:', [stepContext.result]);
                await this.sendWhatNow(stepContext);
                return Dialog.EndOfTurn;
            }
        }
    ];

    private onStatus: WaterfallStep[] = [
        async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
            return stepContext.beginDialog(
                ChooseShowDialog.getName(),
                <ChooseShowDialogOptions>{
                    question: 'Please, tell me the name of the show which status you are looking for',
                    recognizerResult: stepContext.values[RECOGNIZER_RESULT]
                });
        },
        async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
            if (!stepContext.result) {
                return await this.onChildCancel(stepContext);
            } else if (!stepContext.result.ids) {
                return await this.onTraktTvError(stepContext, stepContext.result);
            } else {
                await this.sendStatus(stepContext, stepContext.result);
                await this.sendWhatNow(stepContext);
                return Dialog.EndOfTurn;
            }
        }
    ];

    private onWatched: WaterfallStep[] = [
        async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
            return await stepContext.beginDialog(TraktTvLoginPrompt.getName());
        },
        async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
            if (!stepContext.result || !stepContext.result.token) {
                return await this.onAuthenticationError(stepContext);
            }

            stepContext.values[TOKEN] = stepContext.result.token;

            return stepContext.beginDialog(
                ChooseShowDialog.getName(),
                <ChooseShowDialogOptions>{
                    question: 'Please, tell me the name of the show which episode you watched',
                    recognizerResult: stepContext.values[RECOGNIZER_RESULT],
                    getSeasons: true
                });
        },
        async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
            if (!stepContext.result) {
                return await this.onChildCancel(stepContext);
            } else if (!stepContext.result.ids) {
                return await this.onTraktTvError(stepContext, stepContext.result);
            } else {
                const show = <Show>stepContext.result;
                stepContext.values[SHOW_TITLE] = show.title;

                return stepContext.beginDialog(
                    ChooseSeasonDialog.getName(),
                    <ChooseSeasonDialogOptions>{
                        question: 'Please, tell me the season of the episode you watched',
                        recognizerResult: stepContext.values[RECOGNIZER_RESULT],
                        show: show
                    });
            }
        },
        async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
            if (!stepContext.result) {
                return await this.onChildCancel(stepContext);
            } else if (!stepContext.result.ids) {
                return await this.onTraktTvError(stepContext, stepContext.result);
            } else {
                const season = <Season>stepContext.result;

                return stepContext.beginDialog(
                    ChooseEpisodeDialog.getName(),
                    <ChooseEpisodeDialogOptions>{
                        question: 'Please, tell me the episode you watched',
                        recognizerResult: stepContext.values[RECOGNIZER_RESULT],
                        season: season
                    });
            }
        },
        async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
            if (!stepContext.result) {
                return await this.onChildCancel(stepContext);
            } else if (!stepContext.result.ids) {
                return await this.onTraktTvError(stepContext, stepContext.result);
            } else {
                const episode = <Episode>stepContext.result;
                const token = stepContext.values[TOKEN];
                const showTitle = stepContext.values[SHOW_TITLE];
                try {
                    const userName = await this.traktTv.getUserName(token);
                    const success = await this.traktTv.addWatchedEpisode(token, episode.ids.trakt);
                    if (success) {
                        await stepContext.context.sendActivity(`Ok ${userName}, I marked this episode as watched: ${showTitle} ${episode.season}x${episode.number}`);
                    } else {
                        await stepContext.context.sendActivity(`Sorry ${userName}, I couldn't mark this episode as watched: ${showTitle} ${episode.season}x${episode.number}`);
                    }

                    await this.sendWhatNow(stepContext);
                    return Dialog.EndOfTurn;
                } catch (e) {
                    return await this.onTraktTvError(stepContext, e);
                }
            }
        }
    ];

    private onHelp = async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
        await stepContext.context.sendActivity(MessageFactory.suggestedActions(
            this.suggestedActions, 'I can answer different questions about tv shows'));
        return Dialog.EndOfTurn;
    }

    private onCancel = async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
        await stepContext.context.sendActivity('There is nothing for me to cancel here');
        await this.sendWhatNow(stepContext);
        return Dialog.EndOfTurn;
    }

    private onLogout = async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
        const botAdapter = <BotFrameworkAdapter>stepContext.context.adapter;
        await botAdapter.signOutUser(stepContext.context, 'TraktTv');
        await stepContext.context.sendActivity('Your wish is my command. You are logged out now');
        await this.sendWhatNow(stepContext);
        return Dialog.EndOfTurn;
    }

    private onUnknown = async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
        await stepContext.context.sendActivity(MessageFactory.suggestedActions(
            this.suggestedActions, `Sorry, I didn't understand that. How can I help you?`));
        return Dialog.EndOfTurn;
    }

    private async onTraktTvError(stepContext: WaterfallStepContext, e: Error) : Promise<DialogTurnResult<any>> {
        await stepContext.context.sendActivity(`Oops! Something went wrong while connecting to trakt.tv service: *${e.message}*`);
        await this.sendWhatNow(stepContext);
        return Dialog.EndOfTurn;
    }

    private async onAuthenticationError(stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> {
        await stepContext.context.sendActivity('You failed to authenticate');
        await this.sendWhatNow(stepContext);
        return Dialog.EndOfTurn;
    }

    private async onChildCancel(stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> {
        await stepContext.context.sendActivity('Sure thing!|If you say so...|Of course');
        await this.sendWhatNow(stepContext);
        return Dialog.EndOfTurn;
    }

    private async sendWhatNow(stepContext: WaterfallStepContext) : Promise<ResourceResponse> {
        return await stepContext.context.sendActivity(MessageFactory.suggestedActions(
            this.suggestedActions, 'What else can I do for you?'));
    }

    private async sendShows(stepContext: WaterfallStepContext, text: string, shows: Show[]) : Promise<ResourceResponse> {
        return await stepContext.context.sendActivity(MessageFactory.carousel(
            shows.map(show => this.toHeroCard(show)),
            text));
    }

    private async sendStatus(stepContext: WaterfallStepContext, show: Show) : Promise<ResourceResponse> {
        switch (show.status) {
            case 'ended': return await stepContext.context.sendActivity('This show has ended');
            case 'returning series': return await stepContext.context.sendActivity('This show is returning');
            case 'canceled': return await stepContext.context.sendActivity('This show has been canceled');
            case 'in production': return await stepContext.context.sendActivity('This show is in production');
            default: return await stepContext.context.sendActivity(`The status of this show is: ${show.status}`);
        }
    }

    private toHeroCard(show: Show) : Attachment {
        return CardFactory.heroCard(
            show.title, show.overview, null,
            [{ type: ActionTypes.OpenUrl, title: 'Trakt.tv', value: `https://trakt.tv/shows/${show.ids.trakt}` }],
            { subtitle: show.status } );
    }
}
