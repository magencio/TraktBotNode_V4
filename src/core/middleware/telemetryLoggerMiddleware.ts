import { Middleware, TurnContext, Activity, ResourceResponse } from 'botbuilder';
import { BotTelemetry } from '../telemetry/BotTelemetry';

/**
 * The name of the telemetry service in the Context TurnState collection.
 */
export const TELEMETRY_KEY = "TelemetryLoggerMiddleware.TelemetryContext";

/**
 * Middleware for logging incoming and outgoing Activity messages into telemetry service.
 * In addition, registers the telemetry client in the context so other telemetry
 * components like TelemetryLuisRecognizer can log telemetry.
 * If this Middleware is removed, all the other components don't log (but still operate).
 */
export class TelemetryLoggerMiddleware implements Middleware {

    private readonly telemetry: BotTelemetry;

    /**
     * Creates a new TelemetryLoggerMiddleware instance.
     * @param telemetry The telemetry client.
     */
    constructor(telemetry: BotTelemetry) {
        this.telemetry = telemetry;
    }

    /**
     * Records incoming and outgoing activities to the telemetry service.
     * @param context The context object for this turn.
     * @param next The delegate to call to continue the bot middleware pipeline.
     */
    public async onTurn(context: TurnContext, next: () => Promise<void>): Promise<void> {

        // Allow other components to log telemetry.
        context.turnState[TELEMETRY_KEY] = this.telemetry;

        // Log incoming activity at beginning of turn.
        if (context.activity) {
            this.telemetry.trackActivity(context.activity);
        }

        // Hook up onSend pipeline and log outgoing activities.
        context.onSendActivities(async (ctx: TurnContext, activities: Partial<Activity>[], next: () => Promise<ResourceResponse[]>) => {
            const responses = await next();
            activities.forEach(a => this.telemetry.trackActivity(a));
            return responses;
        });

        await next();
    }
}