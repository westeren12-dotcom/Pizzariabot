import { BotContext } from "../types";
import { mainMenuKeyboard, inlineMainMenu } from "../keyboards";
import * as db from "../database";

export async function handleAboutText(ctx: BotContext) {
  const address = await db.getSetting("about_address");
  const phone = await db.getSetting("about_phone");
  const instagram = await db.getSetting("about_instagram");
  const hours = await db.getSetting("about_work_hours");
  const name = await db.getSetting("about_name");

  const text = `🏪 *${name || "Pizza Ria"}*

🕐 Ish vaqti: ${hours || "09:00 - 23:00"}
📍 Manzil: ${address || "Toshkent shahri"}
☎️ Telefon: ${phone || "+998943941919"}
📸 Instagram: @${instagram || "pizza_ria_1"}

Bizning menyudan o'z yoqtirgan taomingizni tanlab, buyurtma berishingiz mumkin!`;

  await ctx.reply(text, {
    parse_mode: "Markdown",
    ...mainMenuKeyboard(),
  });
}

export async function handleAboutCallback(ctx: BotContext) {
  const address = await db.getSetting("about_address");
  const phone = await db.getSetting("about_phone");
  const instagram = await db.getSetting("about_instagram");
  const hours = await db.getSetting("about_work_hours");
  const name = await db.getSetting("about_name");

  const text = `🏪 *${name || "Pizza Ria"}*

🕐 Ish vaqti: ${hours || "09:00 - 23:00"}
📍 Manzil: ${address || "Toshkent shahri"}
☎️ Telefon: ${phone || "+998943941919"}
📸 Instagram: @${instagram || "pizza_ria_1"}

Bizning menyudan o'z yoqtirgan taomingizni tanlab, buyurtma berishingiz mumkin!`;

  try {
    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
      ...inlineMainMenu(),
    });
  } catch {
    await ctx.reply(text, {
      parse_mode: "Markdown",
      ...mainMenuKeyboard(),
    });
  }
}
