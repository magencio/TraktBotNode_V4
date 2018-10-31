import { Activity, RecognizerResult, ActivityTypes } from "botbuilder";
import { TelemetryClient } from "applicationinsights";
import { EventTelemetry } from "applicationinsights/out/Declarations/Contracts";
import { BotTelemetry, INTENT_PROPERTY, SCORE_PROPERTY, ENTITIES_PROPERTY, INTENT_EVENT, CUSTOM_EVENT, GOAL_NAME_PROPERTY, GOAL_TRIGGERED_EVENT } from "./botTelemetry";
import { EXCEPTION_PROPERTY, EXCEPTION_EVENT, TIME_STAMP_PROPERTY, TYPE_PROPERTY, ACTIVITY_ID_PROPERTY, CHANNEL_ID_PROPERTY, CONVERSATION_ID_PROPERTY } from "./botTelemetry";
import { MESSAGE_RECEIVED_EVENT, USER_ID_PROPERTY, MESSAGE_SENT_EVENT, USER_NAME_PROPERTY, TEXT_PROPERTY, LOCALE_PROPERTY, CONVERSATION_UPDATE_EVENT } from "./botTelemetry";
import { END_OF_CONVERSATION_EVENT, OTHER_ACTIVITY_EVENT } from "./botTelemetry";

/**
 * Sends bot related events to Application Insights, so that they can be consumed with Ibex Dashboard.
 */
export class AppInsightsBotTelemetry implements BotTelemetry {
    private readonly telemetryClient: TelemetryClient;
    private readonly logOriginalMessage: boolean;
    private readonly logUserName: boolean;

    /**
     * Creates a new AppInsightsBotTelemetry instance.
     * @param instrumentationKey App Insights instrumentation key.
     * @param logOriginalMessage (Optional) Enable/Disable logging original message name within App Insights.
     * @param logUserName (Optional) Enable/Disable logging user name within App Insights.
     */
    constructor(instrumentationKey: string, logOriginalMessage: boolean, logUserName: boolean) {
        this.telemetryClient = new TelemetryClient(instrumentationKey);
        this.logOriginalMessage = logOriginalMessage;
        this.logUserName = logUserName;
    }

    /**
     * Sends Activity data to telemetry service.
     * @param activity Activity.
     * @param customProperties (Optional) Additional properties.
     */
    public trackActivity(activity: Partial<Activity>, customProperties?: {[key: string]: string}) : void {
        const et = this.buildEventTelemetry(activity, customProperties);
        this.telemetryClient.trackEvent(et);
    }

    /**
     * Sends Intent data to telemetry service.
     * @param activity Activity.
     * @param recognizerResult Recognizer results containing intent data.
     * @param customProperties (Optional) Additional properties.
     */
    public trackIntent(activity: Partial<Activity>, recognizerResult: RecognizerResult, customProperties?: {[key: string]: string}) : void {
        const intent = this.topIntent(recognizerResult);

        if (!customProperties) {
            customProperties = {};
        }
        customProperties[INTENT_PROPERTY] = intent[0];
        customProperties[SCORE_PROPERTY] = intent[1].toString();
        customProperties[ENTITIES_PROPERTY] = JSON.stringify(recognizerResult.entities);

        const et = this.buildEventTelemetry(activity, customProperties);
        et.name = INTENT_EVENT;
        this.telemetryClient.trackEvent(et);

        // TODO: Track sentiment if included in intent data.
    }

    /**
     * Sends a custom event to telemetry service.
     * @param activity Activity.
     * @param eventName (Optional) Name of the custom event. 'MBFEvent.CustomEvent' by default.
     * @param customProperties (Optional) Additional properties.
     */
    public trackCustomEvent(activity: Partial<Activity>, eventName: string = CUSTOM_EVENT, customProperties?: {[key: string]: string}) : void {
        const et = this.buildEventTelemetry(activity, customProperties);
        et.name = eventName ? eventName : CUSTOM_EVENT;
        this.telemetryClient.trackEvent(et);
    }

    /**
     * Sends a goal triggered event to telemetry service.
     * @param activity Activity.
     * @param goalName Goal name.
     * @param customProperties (Optional) Additional properties.
     */
    public trackGoalTriggeredEvent(activity: Partial<Activity>, goalName: string, customProperties?: {[key: string]: string}) : void {
        if (!customProperties) {
            customProperties = {};
        }
        customProperties[GOAL_NAME_PROPERTY] = goalName;

        const et = this.buildEventTelemetry(activity, customProperties);
        et.name = GOAL_TRIGGERED_EVENT;
        this.telemetryClient.trackEvent(et);
    }

    /**
     * Sends Error data to telemetry service.
     * @param activity Activity.
     * @param error Error.
     * @param customProperties (Optional) Additional properties.
     */
    public trackError(activity: Partial<Activity>, error: Error, customProperties?: {[key: string]: string}) : void {
        if (!customProperties) {
            customProperties = {};
        }
        customProperties[EXCEPTION_PROPERTY] = JSON.stringify(error);

        const et = this.buildEventTelemetry(activity, customProperties);
        et.name = EXCEPTION_EVENT;
        this.telemetryClient.trackEvent(et);
    }

    private buildEventTelemetry(activity: Partial<Activity>, customProperties?: {[key: string]: string}) : EventTelemetry {
        // Add generic activity properies.
        const et: EventTelemetry = { name: '', properties: {} };
        if (activity.timestamp) {
            et.properties[TIME_STAMP_PROPERTY] = activity.timestamp.toString();
        }

        et.properties[TYPE_PROPERTY] = activity.type;
        et.properties[ACTIVITY_ID_PROPERTY] = activity.id;
        et.properties[CHANNEL_ID_PROPERTY] = activity.channelId;
        et.properties[CONVERSATION_ID_PROPERTY] = activity.conversation.id;

        // Add properties depending on activity type.
        switch (activity.type) {
            case ActivityTypes.Message:
                let userName: string;
                if (!activity.replyToId) {
                    et.name = MESSAGE_RECEIVED_EVENT;
                    et.properties[USER_ID_PROPERTY] = activity.from.id;
                    userName = activity.from.name;
                } else {
                    et.name = MESSAGE_SENT_EVENT;
                    et.properties[USER_ID_PROPERTY] = activity.recipient.id;
                    userName = activity.recipient.name;
                }

                if (this.logUserName && userName) {
                    et.properties[USER_NAME_PROPERTY] = userName;
                }

                if (this.logOriginalMessage && activity.text) {
                    et.properties[TEXT_PROPERTY] = activity.text;
                }

                et.properties[LOCALE_PROPERTY] = activity.locale;
                break;
            case ActivityTypes.ConversationUpdate:
                et.name = CONVERSATION_UPDATE_EVENT;
                break;
            case ActivityTypes.EndOfConversation:
                et.name = END_OF_CONVERSATION_EVENT;
                break;
            default:
                et.name = OTHER_ACTIVITY_EVENT;
                break;
        }

        // Add additional properties.
        if (customProperties) {
            Object.keys(customProperties).forEach(key =>
                et.properties[key] = customProperties[key]);
        }

        return et;
    }

    // Code based on LuisRecognizer.topIntent
    private topIntent(results: RecognizerResult, defaultIntent: string = 'None', minScore: number = 0) : [string, number] {
        let topIntent;
        let topScore = -1;
        if (results && results.intents) {
            Object.keys(results.intents).forEach((name) => {
                const score = results.intents[name].score;
                if (typeof score === 'number' && score > topScore && score >= minScore) {
                    topIntent = name;
                    topScore = score;
                }
            });
        }
        return [topIntent || defaultIntent, topScore];
    }
}