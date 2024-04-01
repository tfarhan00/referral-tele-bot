import { nanoid } from "nanoid";
import { TELEGRAM_BOT_USERNAME } from "../config.js";

export function generateReferralLink(username) {
  const identifier = nanoid().replace("_", "");
  return {
    identifier: identifier,
    link: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${username}`,
  };
}

export function getChatType(type) {
  if (type === "supergroup" || type === "group") return "group";
  if (type === "channel") return "channel";
  else return "private";
}
