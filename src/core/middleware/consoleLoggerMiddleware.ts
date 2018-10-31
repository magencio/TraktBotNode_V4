import { Middleware, TurnContext, Activity, ResourceResponse } from 'botbuilder';

/**
 * Middleware that shows all text messages in and out of the bot in the console.
 */
export class ConsoleLoggerMiddleware implements Middleware {

    /**
     * Records incoming and outgoing text messages to the console.
     * @param context The context object for this turn.
     * @param next The delegate to call to continue the bot middleware pipeline.
     */
    public async onTurn(context: TurnContext, next: () => Promise<void>): Promise<void> {
        if (context.activity) {
            console.log(context.activity);
        }

        context.onSendActivities(async (ctx: TurnContext, activities: Partial<Activity>[], next: () => Promise<ResourceResponse[]>) => {
            const responses = await next();
            activities.forEach(a => console.log(a));
            return responses;
        });

        await next();
    }
}