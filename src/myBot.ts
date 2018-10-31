import { ConversationState, CardFactory } from 'botbuilder';
import { DialogContext } from 'botbuilder-dialogs';
import { Bot } from './core/bot';
import { RootDialog } from './dialogs/rootDialog';
import { MyBotServices } from './myBotServices';
import { ConfirmationDialog } from './dialogs/confirmationDialog';
import { TraktTvLoginPrompt } from './dialogs/traktTvLoginPrompt';
import { ChooseShowDialog } from './dialogs/chooseShowDialog';
import { ChooseSeasonDialog } from './dialogs/chooseSeasonDialog';
import { ChooseEpisodeDialog } from './dialogs/chooseEpisodeDialog';
import { NLP_MODEL_NAME } from './nlp/traktBotNLP';

/**
 * TraktBot
 */
export class MyBot extends Bot {

  /**
   * Creates a new MyBot instance.
   * @param botServices External services used by the bot.
   * @param conversationState Conversation state for the bot.
   */
  constructor(botServices: MyBotServices, conversationState: ConversationState) {
    super(conversationState, RootDialog.getName());

    const recognizer = botServices.recognizers[NLP_MODEL_NAME];
    const traktTv = botServices.traktTv;
    const telemetry = botServices.telemetry;

    this.dialogs.add(new RootDialog(recognizer, traktTv, telemetry));
    this.dialogs.add(new ConfirmationDialog(recognizer, telemetry));
    this.dialogs.add(new ChooseShowDialog(recognizer, traktTv, telemetry));
    this.dialogs.add(new ChooseSeasonDialog(recognizer, telemetry));
    this.dialogs.add(new ChooseEpisodeDialog(recognizer, telemetry));
    this.dialogs.add(new TraktTvLoginPrompt());
  }

  protected async onMemberAddedToConversation(dc: DialogContext) : Promise<void> {
    // tslint:disable-next-line:no-require-imports
    const welcomeCard = require('./dialogs/adaptiveCards/WelcomeCard.json');
    await dc.context.sendActivity({ attachments: [CardFactory.adaptiveCard(welcomeCard)] });
  }
}
