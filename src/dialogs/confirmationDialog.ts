import { CardAction, ActionTypes, MessageFactory } from "botbuilder";
import { WaterfallStepContext, DialogTurnResult, Dialog } from "botbuilder-dialogs";
import { IntentDialog } from "../core/dialogs/intentDialog";
import { INTENT_YES, INTENT_NO, INTENT_CANCEL, INTENT_HELP } from "../nlp/traktBotNLP";
import { IntentRecognizer } from "../core/recognizers/intentRecognizer";
import { BotTelemetry } from "../core/telemetry/botTelemetry";

/**
 * Configuration for ConfirmationDialog.
 */
export interface ConfirmationDialogOptions {
    question: string;
}

/**
 * A dialog to ask questions with Yes/No answers using NLP.
 */
export class ConfirmationDialog extends IntentDialog<ConfirmationDialogOptions> {

    public static getName() : string {
        return 'ConfirmationDialog';
    }

    private suggestedActions: CardAction[] = [
        { type: ActionTypes.ImBack, title: 'Yes', value: 'Yes' },
        { type: ActionTypes.ImBack, title: 'No', value: 'No' },
        { type: ActionTypes.ImBack, title: 'Cancel', value: 'Cancel' }
    ];

    constructor(recognizer: IntentRecognizer, telemetry: BotTelemetry) {
        super(ConfirmationDialog.getName(), recognizer);

        this.onBegin([this.onBeginDialog])
            .matches(INTENT_YES, [this.onYes])
            .matches(INTENT_NO, [this.onNo])
            .matches(INTENT_CANCEL, [this.onCancel])
            .matches(INTENT_HELP, [this.onHelp])
            .onDefault([this.onUnknown]);
    }

    private onBeginDialog = async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
        const options = <ConfirmationDialogOptions>stepContext.options;
        await stepContext.context.sendActivity(MessageFactory.suggestedActions(
            this.suggestedActions, options.question));
        return Dialog.EndOfTurn;
    }

    private onYes = async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
        return await stepContext.endDialog(true);
    }

    private onNo = async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
        return await stepContext.endDialog(false);
    }

    private onHelp = async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
        const options = <ConfirmationDialogOptions>stepContext.options;
        await stepContext.context.sendActivity(MessageFactory.suggestedActions(
            this.suggestedActions, `Answer Yes or No to the question: ${options.question}`));
        return Dialog.EndOfTurn;
    }

    private onCancel = async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
        return await stepContext.endDialog();
    }

    private onUnknown = async (stepContext: WaterfallStepContext) : Promise<DialogTurnResult<any>> => {
        await stepContext.context.sendActivity(MessageFactory.suggestedActions(
            this.suggestedActions, "Sorry, I didn't understand that. Please, just answer the question"));
        return Dialog.EndOfTurn;
    }
}