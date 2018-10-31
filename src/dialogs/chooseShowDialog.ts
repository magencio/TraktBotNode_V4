import { RecognizerResult, CardAction, ActionTypes, MessageFactory, SuggestedActions, Attachment, CardFactory, ResourceResponse } from "botbuilder";
import { WaterfallStepContext, DialogTurnResult, Dialog } from "botbuilder-dialogs";
import { IntentDialog } from "../core/dialogs/intentDialog";
import { TraktTv } from "../model/traktTv";
import { Show } from "../model/model";
import { ENTITY_SHOW, INTENT_CANCEL, INTENT_HELP } from "../nlp/traktBotNLP";
import { IntentRecognizer } from "../core/recognizers/intentRecognizer";
import { BotTelemetry } from "../core/telemetry/botTelemetry";

/**
 * Configuration of ChooseShowDialog.
 */
export interface ChooseShowDialogOptions {
    question: string;
    recognizerResult: RecognizerResult;
    getSeasons?: boolean;
}

/**
 * Dialog to find the details of a show by name.
 */
export class ChooseShowDialog extends IntentDialog<ChooseShowDialogOptions> {

    public static getName() : string {
        return 'ChooseShowDialog';
    }

    private suggestedActions: CardAction[] = [
        { type: ActionTypes.ImBack, title: 'Cancel', value: 'Cancel' }
    ];

    private traktTv: TraktTv;

    public constructor(recognizer: IntentRecognizer, traktTv: TraktTv, telemetry: BotTelemetry) {
        super(ChooseShowDialog.getName(), recognizer);

        this.traktTv = traktTv;

        this.onBegin([this.onBeginDialog])
            .matches(INTENT_CANCEL, [this.onCancel])
            .matches(INTENT_HELP, [this.onHelp])
            .onDefault([this.onAnythingElse]);
    }

    private onBeginDialog = async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
        const options = <ChooseShowDialogOptions>stepContext.options;
        const showEntity = options.recognizerResult.entities[ENTITY_SHOW];
        const showName = showEntity && this.fixShowName(showEntity[0]);

        if (showName) {
            return await this.onFindShow(stepContext, showName);
        } else {
            await stepContext.context.sendActivity(MessageFactory.suggestedActions(
                this.suggestedActions, options.question));
                return Dialog.EndOfTurn;
        }
    }

    private onHelp = async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
        const options = <ChooseShowDialogOptions>stepContext.options;
        await stepContext.context.sendActivity(MessageFactory.suggestedActions(
            this.suggestedActions, options.question));
        return Dialog.EndOfTurn;
    }

    private onCancel = async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
        return await stepContext.endDialog();
    }

    private onAnythingElse = async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
        const options = <ChooseShowDialogOptions>stepContext.options;
        const showName = stepContext.context.activity.text;

        if (showName.startsWith('traktId:')) {
            const traktId = parseInt(showName.replace('traktId:', ''));
            if (traktId) {
                let show: Show;
                try {
                    show = await this.traktTv.getShowSummary(traktId);
                    if (options.getSeasons) {
                        show.seasons = await this.traktTv.getSeasons(traktId);
                    }

                    return await stepContext.endDialog(show);
                } catch (e) {
                    return await this.onTraktTvError(stepContext, e);
                }
            }
        }

        return await this.onFindShow(stepContext, showName);
    }

    private async onTraktTvError(stepContext: WaterfallStepContext, e: Error) : Promise<DialogTurnResult<any>> {
        return stepContext.endDialog(e);
    }

    private async onFindShow(stepContext: WaterfallStepContext, showName: string) : Promise<DialogTurnResult<any>> {
        const options = <ChooseShowDialogOptions>stepContext.options;
        showName = showName.toLowerCase();

        let shows: Show[];
        try {
            shows = await this.traktTv.searchShows(showName);
        } catch (e) {
            return await this.onTraktTvError(stepContext, e);
        }

        const show = shows.find(s => s.title.toLowerCase() === showName);
        if (show) {
            if (options.getSeasons) {
                show.seasons = await this.traktTv.getSeasons(show.ids.trakt);
            }
            return await stepContext.endDialog(show);
        } else if (shows.length > 0) {
            await this.sendShows(stepContext, "I couldn't find any show with that exact name, but I found shows with similar names. Please select one or enter a new show name:", shows);
        } else {
            await stepContext.context.sendActivity(MessageFactory.suggestedActions(
                this.suggestedActions, `I couldn't find a show with name '${showName}'. Please enter a new name`));
        }

        return Dialog.EndOfTurn;
    }

    private async sendShows(stepContext: WaterfallStepContext, text: string, shows: Show[]) : Promise<ResourceResponse> {
        const activity = MessageFactory.carousel(
            shows.map(show => this.toHeroCard(show)),
            text);
        activity.suggestedActions = <SuggestedActions>{ actions: this.suggestedActions };
        return await stepContext.context.sendActivity(activity);
    }

    private toHeroCard(show: Show) : Attachment {
        return CardFactory.heroCard(
            null, show.title, null,
            [{ type: ActionTypes.ImBack, title: 'Select', value: `traktId:${show.ids.trakt}` }]);
    }

    private fixShowName(showName: string) : string {
        return showName.replace(" '", "'").replace("' ", "'"); // LUIS messes up entity values containing apostrophes
    }
}