import { Middleware, TurnContext, Activity, ResourceResponse, ActivityTypes } from 'botbuilder';

/**
 * Middleware that randomly selects a reply from a string containing a list of replies separated by '|'.
 */
export class RandomizeReplyMiddleware implements Middleware {

    public async onTurn(context: TurnContext, next: () => Promise<void>): Promise<void> {

        context.onSendActivities(async (ctx: TurnContext, activities: Partial<Activity>[], next: () => Promise<ResourceResponse[]>) => {
            activities
                .filter(a => a.type === ActivityTypes.Message && a.text !== undefined)
                .forEach(a => a.text = this.pickOneReplyRandomly(a.text));
            return await next();
        });

        return await next();
    }

    private pickOneReplyRandomly(text: string) {
        const replies = text.split('|');
        return replies[Math.floor(Math.random() * replies.length)];
    }
}