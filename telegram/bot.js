import { Bot } from "grammy";
import { autoChatAction } from "@grammyjs/auto-chat-action";
import { sequentialize } from "@grammyjs/runner";

const token = process.env.TELEGRAM_BOT_TOKEN;

const teleBot = new Bot(token, {
  botInfo: {
    can_join_groups: true,
    can_read_all_group_messages: true,
    username: process.env.TELEGRAM_BOT_USERNAME,
  },
});

teleBot.use(
  sequentialize((ctx) => {
    const chat = ctx.chat?.id.toString();
    const user = ctx.from?.id.toString();
    return [chat, user].filter((con) => con !== undefined);
  })
);

teleBot.use(autoChatAction());

let botProfile = null;
/**
 *
 * @returns {Promise<UserFromGetMe>}
 */
async function getMe() {
  try {
    if (botProfile) {
      return botProfile;
    } else {
      botProfile = await teleBot.api.getMe();
      return botProfile;
    }
  } catch (error) {
    console.error("Error getting bot profile: ", error);
  }
}

export { teleBot, getMe };
