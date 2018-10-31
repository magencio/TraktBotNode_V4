import { Activity, RecognizerResult } from "botbuilder";

// Telemetry event types
export const MESSAGE_RECEIVED_EVENT: string = "MBFEvent.UserMessage";
export const MESSAGE_SENT_EVENT: string = "MBFEvent.BotMessage";
export const INTENT_EVENT: string = "MBFEvent.Intent";
export const SENTIMENT_EVENT: string = "MBFEvent.Sentiment";
export const CONVERSATION_UPDATE_EVENT: string = "MBFEvent.StartConversation";
export const END_OF_CONVERSATION_EVENT: string = "MBFEvent.EndConversation";
export const OTHER_ACTIVITY_EVENT: string = "MBFEvent.Other";
export const CUSTOM_EVENT: string = "MBFEvent.CustomEvent";
export const GOAL_TRIGGERED_EVENT: string = "MBFEvent.GoalEvent";
export const EXCEPTION_EVENT: string = "MBFEvent.Exception";

// Telemetry event properties
export const TIME_STAMP_PROPERTY: string = "timestamp";
export const TYPE_PROPERTY: string = "type";
export const ACTIVITY_ID_PROPERTY: string = "id";
export const CHANNEL_ID_PROPERTY: string = "channel";
export const CONVERSATION_ID_PROPERTY: string = "conversationId";
export const USER_ID_PROPERTY: string = "userId";
export const USER_NAME_PROPERTY: string = "userName";
export const TEXT_PROPERTY: string = "text";
export const LOCALE_PROPERTY: string = "locale";
export const INTENT_PROPERTY: string = "intent";
export const SCORE_PROPERTY: string = "score";
export const ENTITIES_PROPERTY: string = "entities";
export const GOAL_NAME_PROPERTY: string = "goalName";
export const EXCEPTION_PROPERTY: string = "exception";

/**
 * Sends bot related events to telemetry service (e.g. Application Insights).
 */
export interface BotTelemetry {

    /**
     * Sends Activity data to telemetry service.
     * @param activity Activity.
     * @param customProperties (Optional) Additional properties.
     */
    trackActivity(activity: Partial<Activity>, customProperties?: {[key: string]: string}) : void;

    /**
     * Sends Intent data to telemetry service.
     * @param activity Activity.
     * @param recognizerResult Recognizer results containing intent data.
     * @param customProperties (Optional) Additional properties.
     */
    trackIntent(activity: Partial<Activity>, recognizerResult: RecognizerResult, customProperties?: {[key: string]: string}) : void;

    /**
     * Sends a custom event to telemetry service.
     * @param activity Activity.
     * @param eventName (Optional) Name of the custom event.
     * @param customProperties (Optional) Additional properties.
     */
    trackCustomEvent(activity: Partial<Activity>, eventName?: string, customProperties?: {[key: string]: string}) : void;

    /**
     * Sends a goal triggered event to telemetry service.
     * @param activity Activity.
     * @param goalName Goal name.
     * @param customProperties (Optional) Additional properties.
     */
    trackGoalTriggeredEvent(activity: Partial<Activity>, goalName: string, customProperties?: {[key: string]: string}) : void;

    /**
     * Sends Error data to telemetry service.
     * @param activity Activity.
     * @param error Error.
     * @param customProperties (Optional) Additional properties.
     */
    trackError(activity: Partial<Activity>, error: Error, customProperties?: {[key: string]: string}) : void;
}