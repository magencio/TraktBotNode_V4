import { RecognizerResult, CardAction, ActionTypes, MessageFactory } from "botbuilder";
import { WaterfallStepContext, DialogTurnResult, Dialog } from "botbuilder-dialogs";
import { IntentDialog } from "../core/dialogs/intentDialog";
import { Show, Season } from "../model/model";
import { INTENT_CANCEL, INTENT_HELP } from "../nlp/traktBotNLP";
import { IntentRecognizer } from "../core/recognizers/intentRecognizer";
import { BotTelemetry } from "../core/telemetry/botTelemetry";

/**
 * Configuration of ChooseSeasonDialog.
 */
export interface ChooseSeasonDialogOptions {
    question: string;
    show: Show;
    recognizerResult: RecognizerResult;
}

/**
 * Dialog to choose a season number of a show.
 */
export class ChooseSeasonDialog extends IntentDialog<ChooseSeasonDialogOptions> {

    public static getName() : string {
        return 'ChooseSeasonDialog';
    }

    private suggestedActions: CardAction[] = [
        { type: ActionTypes.ImBack, title: 'Cancel', value: 'Cancel' }
    ];

    public constructor(recognizer: IntentRecognizer, telemetry: BotTelemetry) {
        super(ChooseSeasonDialog.getName(), recognizer);

        this.onBegin([this.onBeginDialog])
            .matches(INTENT_CANCEL, [this.onCancel])
            .matches(INTENT_HELP, [this.onHelp])
            .onDefault([this.onAnythingElse]);
    }

    private onBeginDialog = async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
        const options = <ChooseSeasonDialogOptions>stepContext.options;

        const episodeEntity = options.recognizerResult.entities[`Episode`];
        let seasonNumber = episodeEntity && this.extractSeason(episodeEntity[0]);
        if (seasonNumber === undefined) {
            const seasonNumberEntity = options.recognizerResult.entities[`SeasonNumber`];
            seasonNumber = seasonNumberEntity && seasonNumberEntity[0];
        }

        if (seasonNumber === undefined) {
            await stepContext.context.sendActivity(MessageFactory.suggestedActions(
                this.suggestedActions, options.question));
        } else {
            return await this.onSeasonNumber(stepContext, seasonNumber);
        }
    }

    private onHelp = async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
        const options = <ChooseSeasonDialogOptions>stepContext.options;
        const maxSeason = this.getMaxSeasonNumber(options.show);
        await stepContext.context.sendActivity(MessageFactory.suggestedActions(
            this.suggestedActions, `Enter a season number between 1 and ${maxSeason}`));
        return Dialog.EndOfTurn;
    }

    private onCancel = async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
        return await stepContext.endDialog();
    }

    private onAnythingElse = async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
        const options = <ChooseSeasonDialogOptions>stepContext.options;

        const seasonNumber = parseInt(stepContext.context.activity.text);
        if (isNaN(seasonNumber)) {
            const maxSeason = this.getMaxSeasonNumber(options.show);
            await stepContext.context.sendActivity(MessageFactory.suggestedActions(
                this.suggestedActions,
                `Sorry, '${stepContext.context.activity.text}' is not a valid number. Please, enter a season number between 1 and ${maxSeason}`));
            return Dialog.EndOfTurn;
        } else {
            return await this.onSeasonNumber(stepContext, seasonNumber);
        }
    }

    private async onSeasonNumber(stepContext: WaterfallStepContext, seasonNumber: number) : Promise<DialogTurnResult<any>> {
        const options = <ChooseSeasonDialogOptions>stepContext.options;
        const maxSeason = this.getMaxSeasonNumber(options.show);

        if (seasonNumber > 0 && seasonNumber <= maxSeason) {
            const season = this.getSeason(options.show, seasonNumber);
            return await stepContext.endDialog(season);
        } else {
            await stepContext.context.sendActivity(MessageFactory.suggestedActions(
                this.suggestedActions,
                `Sorry, season ${seasonNumber} doesn't exist for that show. Please, enter a season number between 1 and ${maxSeason}`));
            return Dialog.EndOfTurn;
        }
    }

    private getMaxSeasonNumber(show: Show): number {
        return show.seasons[show.seasons.length - 1].number;
    }

    private getSeason(show: Show, seasonNumber: number): Season {
        return show.seasons.find(s => s.number === seasonNumber);
    }

    private extractSeason(seasonAndEpisode: string) : number {
        if (/^s\d+e\d+$/i.test(seasonAndEpisode) || /^\d+x\d+$/i.test(seasonAndEpisode)) {
            const regex = /\d+/g;
            return +regex.exec(seasonAndEpisode);
        }
    }
}
