import { RecognizerResult, TurnContext } from "botbuilder";

export interface IntentRecognizer {
    /**
     * Returns the name of the top scoring intent from a set of results.
     * @param results Result set to be searched.
     * @param defaultIntent (Optional) intent name to return if no top intent can be found.
     * @param minScore (Optional) minimum score needed for an intent to be considered as a top intent. If all intents in the set are below this threshold then the `defaultIntent` will be returned.
     */
    topIntent(results: RecognizerResult | undefined, defaultIntent?: string, minScore?: number): string;

    /**
     * Calls recognizer to recognize intents and entities in a users utterance.
     * @param context Context for the current turn of conversation with the use.
     */
    recognize(context: TurnContext) : Promise<RecognizerResult>;
}