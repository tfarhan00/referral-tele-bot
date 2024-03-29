import { nanoid } from "nanoid";
import { TELEGRAM_BOT_USERNAME } from "../config.js";

export function generateReferralLink(userId) {
  const identifier = nanoid().replace("_", "");
  const referralCode = `ref_${userId}_${identifier}`;
  return {
    identifier: identifier,
    link: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${referralCode}`,
  };
}

export function parseReferralCode(referralCode) {
  const parts = referralCode.split("_");
  if (parts.length !== 3) {
    return null; // Invalid referral code format
  }

  const [prefix, userId, identifier] = parts;
  if (prefix !== "ref") {
    return null; // Invalid referral code prefix
  }

  return {
    userId: userId,
    identifier,
  };
}

export function getChatType(type) {
  if (type === "supergroup" || type === "group") return "group";
  if (type === "channel") return "channel";
  else return "private";
}
