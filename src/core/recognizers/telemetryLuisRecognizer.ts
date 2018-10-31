import { LuisRecognizer, LuisApplication, LuisPredictionOptions } from "botbuilder-ai";
import { TurnContext, RecognizerResult } from "botbuilder";
import { TELEMETRY_KEY } from "../middleware/telemetryLoggerMiddleware";
import { BotTelemetry } from "../telemetry/BotTelemetry";
import { IntentRecognizer } from "./intentRecognizer";

/**
 * Invokes the Luis Recognizer and logs results into the telemetry service.
 * Results are logged if TelemetryLoggerMiddleware has been added to the bot.
 */
export class TelemetryLuisRecognizer implements IntentRecognizer {
    private readonly recognizer: LuisRecognizer;

    /**
     * Creates a new TelemetryLuisRecognizer instance.
     * @param application LUIS application to use.
     * @param options Options used to control predictions.
     */
    constructor(application: LuisApplication, predictionOptions?: LuisPredictionOptions, includeApiResults?: boolean) {
        this.recognizer = new LuisRecognizer(application, predictionOptions, includeApiResults);
    }

    /**
     * Returns the name of the top scoring intent from a set of LUIS results.
     * @param results Result set to be searched.
     * @param defaultIntent (Optional) intent name to return should a top intent be found. Defaults to a value of `None`.
     * @param minScore (Optional) minimum score needed for an intent to be considered as a top intent. If all intents in the set are below this threshold then the `defaultIntent` will be returned.  Defaults to a value of `0.0`.
     * @returns The top intent.
     */
    public topIntent(results: RecognizerResult | undefined, defaultIntent: string = 'None', minScore: number = 0): string {
        return LuisRecognizer.topIntent(results, defaultIntent, minScore);
    }

    /**
     * Calls LUIS to recognize intents and entities in a users utterance, and logs results into telemetry service.
     * @param context Context for the current turn of conversation with the use.
     * @returns The results of the operation.
     */
    public async recognize(context: TurnContext) : Promise<RecognizerResult> {
        const recognizerResult = await this.recognizer.recognize(context);

        const telemetry = <BotTelemetry>context.turnState[TELEMETRY_KEY];
        if (telemetry) {
            telemetry.trackIntent(context.activity, recognizerResult);
        }

        return recognizerResult;
    }
}