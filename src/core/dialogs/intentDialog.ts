import { ActivityTypes } from "botbuilder";
import { Dialog, WaterfallStep, DialogTurnResult, DialogContext, DialogReason, WaterfallStepContext } from "botbuilder-dialogs";
import { IntentRecognizer } from "../recognizers/intentRecognizer";

/**
 * The index to access the last recognizer result from the Values collection in WaterfallStepContext.
 */
export const RECOGNIZER_RESULT = 'recognizerResult';

const BEGIN_STEPS = 'begin';
const INTENT_STEPS_PREFIX = 'intent:';
const DEFAULT_STEPS = 'default';

/**
 * Dialog to handle intents.
 * Code based on https://github.com/Microsoft/botbuilder-js/blob/master/libraries/botbuilder-dialogs/src/waterfallDialog.ts.
 */
export class IntentDialog<O extends object = {}> extends Dialog<O> {

    private readonly recognizer: IntentRecognizer;
    private readonly steps: { [id: string] : WaterfallStep<O>[]; } = {};

    /**
     * Creates a new IntentDialog instance.
     * @param dialogId The id of the dialog.
     * @param recognizer The intent recognizer.
     */
    constructor(dialogId: string, recognizer: IntentRecognizer) {
        super(dialogId);
        this.recognizer = recognizer;
    }

    /**
     * Sets the waterfall to execute when the dialog begins.
     * If this waterfall doesn't exists, the dialog will run the recognizer against the current activity text
     * to find a suitable intent handler.
     * @param steps The steps to execute.
     * @returns This dialog.
     */
    public onBegin(steps: WaterfallStep<O>[]) : IntentDialog<O> {
        this.steps[BEGIN_STEPS] = steps.slice(0);
        return this;
    }

    /**
     * Sets the waterfall to execute when an intent is matched.
     * @param intent The intent name.
     * @param steps The steps to execute.
     * @returns This dialog.
     */
    public matches(intent: string, steps: WaterfallStep<O>[]) : IntentDialog<O> {
        this.steps[`${INTENT_STEPS_PREFIX}${intent}`] = steps.slice(0);
        return this;
    }

    /**
     * Sets the default waterfall to execute when no intent is matched.
     * @param steps The steps to execute.
     * @returns This dialog.
     */
    public onDefault(steps: WaterfallStep<O>[]) : IntentDialog<O> {
        this.steps[DEFAULT_STEPS] = steps.slice(0);
        return this;
    }

    /**
     * Method called when a new dialog has been pushed onto the stack and is being activated.
     * @param dc The dialog context for the current turn of conversation.
     * @param options (Optional) arguments that were passed to the dialog during `begin()` call that started the instance.
     * @returns The result of the operation.
     */
    public async beginDialog(dc: DialogContext, options?: O): Promise<DialogTurnResult> {
        // Initialize dialog state
        const state = dc.activeDialog.state as IntentDialogState;
        state.options = options || {};
        state.steps = BEGIN_STEPS;
        state.stepIndex = 0;
        state.values = {};

        // Run first step
        return await this.runStep(dc, state.steps, state.stepIndex, DialogReason.beginCalled, dc.context.activity.text);
    }

    /**
     * Method called when an instance of the dialog is the "current" dialog and the
     * user replies with a new activity. The dialog will generally continue to receive the users
     * replies until it calls either endDialog or beginDialog.
     * @param dc The dialog context for the current turn of conversation.
     * @return The result of the operation.
     */
    public async continueDialog(dc: DialogContext): Promise<DialogTurnResult> {
        // Don't do anything for non-message activities
        if (dc.context.activity.type !== ActivityTypes.Message) {
            return Dialog.EndOfTurn;
        }

        // Ensure we are done with previous waterfall. Then run next step with the message text as the result.
        const state = dc.activeDialog.state as IntentDialogState;
        state.stepIndex = this.steps[state.steps].length;
        return this.runStep(dc, state.steps, state.stepIndex, DialogReason.continueCalled, dc.context.activity.text);
    }

    /**
     * Method called when an instance of the dialog is being returned to from another
     * dialog that was started by the current instance using beginDialog.
     * Any result passed from the called dialog will be passed to the current dialogs parent.
     * @param dc The dialog context for the current turn of conversation.
     * @param reason Reason why the dialog resumed.
     * @param result (Optional) value returned from the dialog that was called. The type of the value returned is dependant on the dialog that was called.
     * @returns The result of the operation.
     */
    public async resumeDialog(dc: DialogContext, reason: DialogReason, result?: any): Promise<DialogTurnResult> {
        const state = dc.activeDialog.state as IntentDialogState;
        state.stepIndex += 1;
        return this.runStep(dc, state.steps, state.stepIndex, reason, result);
    }

    /**
     * Executes one step in a waterfall.
     * @param currentSteps Current waterfall being executed.
     * @param stepContext Context of the step.
     * @returns The result of the operation.
     */
    protected async onStep(currentSteps: string, stepContext: WaterfallStepContext<O>): Promise<DialogTurnResult> {

        return await this.steps[currentSteps][stepContext.index](stepContext);
    }

    private async runStep(dc: DialogContext, currentSteps: string, currentStepIndex: number, reason: DialogReason, result?: any): Promise<DialogTurnResult> {

        let recognizerResult;

        // Do we know which waterfall to execute? Did we already finish executing current waterfall?
        if (!this.steps[currentSteps] || currentStepIndex >= this.steps[currentSteps].length) {
            // If so, decide on the next waterfall to execute.
            recognizerResult = await this.recognizer.recognize(dc.context);
            const topIntent = this.recognizer.topIntent(recognizerResult, 'None', 0.5);
            currentSteps = `${INTENT_STEPS_PREFIX}${topIntent}`;
            if (!this.steps[currentSteps]) {
                if (this.steps[DEFAULT_STEPS]) {
                    currentSteps = DEFAULT_STEPS;
                } else {
                    // There is no suitable waterfall, so just return any result to parent.
                    return await dc.endDialog(result);
                }
            }

            currentStepIndex = 0;
        }

        // Update persisted step info.
        const state = dc.activeDialog.state as IntentDialogState;
        state.steps = currentSteps;
        state.stepIndex = currentStepIndex;

        // Create step context.
        if (recognizerResult) {
            state.values[RECOGNIZER_RESULT] = recognizerResult;
        }
        let nextCalled: boolean = false;
        const stepContext: WaterfallStepContext<O> = new WaterfallStepContext<O>(dc, {
            index: state.stepIndex,
            options: <O>state.options,
            reason: reason,
            result: result,
            values: state.values,
            onNext: async (stepResult?: any): Promise<DialogTurnResult<any>> => {
                if (nextCalled) {
                    throw new Error(`WaterfallStepContext.next(): method already called for dialog and step '${this.id}[${state.steps}][${state.stepIndex}]'.`);
                }
                nextCalled = true;
                return await this.resumeDialog(dc, DialogReason.nextCalled, stepResult);
            }
        });

        // Execute step.
        return await this.onStep(state.steps, stepContext);
    }
}

interface IntentDialogState {
    options: object;
    steps: string;
    stepIndex: number;
    values: object;
}
