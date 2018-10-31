import { ConversationState, TurnContext, ActivityTypes, Activity } from "botbuilder";
import { DialogSet, DialogContext, DialogTurnStatus } from "botbuilder-dialogs";

const DIALOG_STATE_PROPERTY = 'dialogStateProperty';

/**
 * Base class for a bot that provides default handling of activities.
 */
export class Bot {
    protected readonly conversationState: ConversationState;
    protected readonly dialogs: DialogSet;
    protected readonly rootDialogName: string;

    /**
     * Creates a new Bot instance.
     * @param conversationState Conversation state for the bot.
     * @param rootDialogName Name of the root dialog of the bot.
     */
    constructor(conversationState: ConversationState, rootDialogName: string) {
        this.conversationState = conversationState;
        this.rootDialogName = rootDialogName;

        const dialogState = conversationState.createProperty(DIALOG_STATE_PROPERTY);
        this.dialogs = new DialogSet(dialogState);
    }

    /**
     * Runs every turn of the conversation. Handles orchestration of messages.
     * @param {TurnContext} on turn context object.
     */
    public async onTurn(turnContext: TurnContext) {
        // Create a dialog context object.
        const dc = await this.dialogs.createContext(turnContext);

        // Handle activities
        switch (turnContext.activity.type) {
        case ActivityTypes.Message:
            await this.onMessage(dc);
            break;
        case ActivityTypes.Event:
        case ActivityTypes.Invoke:
            await this.onEvent(dc);
            break;
        case ActivityTypes.ConversationUpdate:
            await this.onConversationUpdate(dc);
            break;
        }

        // Persist any changes to storage
        await this.conversationState.saveChanges(turnContext);
    }

    /**
     * Runs when the bot gets an activity of type Message.
     * @param dc Dialog context.
     */
    protected async onMessage(dc: DialogContext) : Promise<void> {
        // Continue the current dialog.
        const dialogResult = await dc.continueDialog();

        // if no one has responded,
        if (!dc.context.responded) {
            // examine results from active dialog.
            switch (dialogResult.status) {
                case DialogTurnStatus.empty:
                    await dc.beginDialog(this.rootDialogName);
                    break;

                case DialogTurnStatus.waiting:
                    // The active dialog is waiting for a response from the user, so do nothing.
                    break;

                case DialogTurnStatus.complete:
                    await dc.endDialog();
                    break;

                default:
                    await dc.cancelAllDialogs();
                    break;
            }
        }
    }

    /**
     * Runs when the bot gets an activity of type Event.
     * @param dc Dialog context.
     */
    protected async onEvent(dc: DialogContext) : Promise<void> {
        // This handles the MS Teams Invoke Activity sent when magic code is not used during authentication.
        // It also handles the Event Activity sent from the emulator when the magic code is not used during authentication.
        await dc.continueDialog();
        if (!dc.context.responded) {
            await dc.beginDialog(this.rootDialogName);
        }
    }

    private async onConversationUpdate(dc: DialogContext) : Promise<void> {
        const activity = dc.context.activity;
        if (activity.membersAdded && activity.membersAdded[0].id !== activity.recipient.id) {
            await this.onMemberAddedToConversation(dc);
        }
    }

    /**
     * Runs when a user gets added to the conversation.
     * @param dc Dialog context.
     */
    protected async onMemberAddedToConversation(dc: DialogContext) : Promise<void> {
    }
}