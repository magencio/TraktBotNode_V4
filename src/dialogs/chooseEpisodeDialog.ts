import { RecognizerResult, CardAction, ActionTypes, MessageFactory } from "botbuilder";
import { WaterfallStepContext, DialogTurnResult, Dialog } from "botbuilder-dialogs";
import { IntentDialog } from "../core/dialogs/intentDialog";
import { Season, Episode } from "../model/model";
import { INTENT_CANCEL, INTENT_HELP } from "../nlp/traktBotNLP";
import { IntentRecognizer } from "../core/recognizers/intentRecognizer";
import { BotTelemetry } from "../core/telemetry/botTelemetry";

/**
 * Configuration of ChooseEpisodeDialog.
 */
export interface ChooseEpisodeDialogOptions {
    question: string;
    recognizerResult: RecognizerResult;
    season: Season;
}

/**
 * Dialog to choose an episode number within a specific season of a show.
 */
export class ChooseEpisodeDialog extends IntentDialog<ChooseEpisodeDialogOptions> {

    public static getName() : string {
        return 'ChooseEpisodeDialog';
    }

    private suggestedActions: CardAction[] = [
        { type: ActionTypes.ImBack, title: 'Cancel', value: 'Cancel' }
    ];

    public constructor(recognizer: IntentRecognizer, telemetry: BotTelemetry) {
        super(ChooseEpisodeDialog.getName(), recognizer);

        this.onBegin([this.onBeginDialog])
            .matches(INTENT_CANCEL, [this.onCancel])
            .matches(INTENT_HELP, [this.onHelp])
            .onDefault([this.onAnythingElse]);
    }

    private onBeginDialog = async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
        const options = <ChooseEpisodeDialogOptions>stepContext.options;

        const episodeEntity = options.recognizerResult.entities[`Episode`];
        let episodeNumber = episodeEntity && this.extractEpisode(episodeEntity[0]);
        if (episodeNumber === undefined) {
            const episodeNumberEntity = options.recognizerResult.entities[`EpisodeNumber`];
            episodeNumber = episodeNumberEntity && episodeNumberEntity[0];
        }

        if (episodeNumber === undefined) {
            await stepContext.context.sendActivity(MessageFactory.suggestedActions(
                this.suggestedActions, options.question));
        } else {
            return await this.onEpisodeNumber(stepContext, episodeNumber);
        }
    }

    private onHelp = async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
        const options = <ChooseEpisodeDialogOptions>stepContext.options;
        const maxEpisode = this.getMaxEpisodeNumber(options.season);
        await stepContext.context.sendActivity(MessageFactory.suggestedActions(
            this.suggestedActions, `Enter an episode number between 1 and ${maxEpisode}`));
        return Dialog.EndOfTurn;
    }

    private onCancel = async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
        return await stepContext.endDialog();
    }

    private onAnythingElse = async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
        const options = <ChooseEpisodeDialogOptions>stepContext.options;

        const episodeNumber = parseInt(stepContext.context.activity.text);
        if (isNaN(episodeNumber)) {
            const maxEpisode = this.getMaxEpisodeNumber(options.season);
            await stepContext.context.sendActivity(MessageFactory.suggestedActions(
                this.suggestedActions,
                `Sorry, '${stepContext.context.activity.text}' is not a valid number. Please, enter an episode number between 1 and ${episodeNumber}`));
            return Dialog.EndOfTurn;
        } else {
            return await this.onEpisodeNumber(stepContext, episodeNumber);
        }
    }

    private async onEpisodeNumber(stepContext: WaterfallStepContext, episodeNumber: number) : Promise<DialogTurnResult<any>> {
        const options = <ChooseEpisodeDialogOptions>stepContext.options;
        const maxEpisode = this.getMaxEpisodeNumber(options.season);

        if (episodeNumber > 0 && episodeNumber <= maxEpisode) {
            const episode = this.getEpisode(options.season, episodeNumber);
            return await stepContext.endDialog(episode);
        } else {
            await stepContext.context.sendActivity(MessageFactory.suggestedActions(
                this.suggestedActions,
                `Sorry, episode ${episodeNumber} doesn't exist for that season. Please, enter an episode number between 1 and ${maxEpisode}`));
            return Dialog.EndOfTurn;
        }
    }

    private getMaxEpisodeNumber(season: Season): number {
        return season.episodes[season.episodes.length - 1].number;
    }

    private getEpisode(season: Season, episodeNumber: number): Episode {
        return season.episodes.find(e => e.number === episodeNumber);
    }

    private extractEpisode(seasonAndEpisode: string) : number {
        if (/^s\d+e\d+$/i.test(seasonAndEpisode) || /^\d+x\d+$/i.test(seasonAndEpisode)) {
            const regex = /\d+/g;
            const season = regex.exec(seasonAndEpisode);
            return +regex.exec(seasonAndEpisode);
        }
    }
}
