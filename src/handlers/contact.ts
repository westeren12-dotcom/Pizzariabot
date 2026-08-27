import { Markup } from "telegraf";
import { BotContext } from "../types";
import { mainMenuKeyboard, inlineMainMenu } from "../keyboards";
import * as db from "../database";

export async function handleContactText(ctx: BotContext) {
  const phone = await db.getSetting("about_phone");
  const instagram = await db.getSetting("about_instagram");

  const text = `☎️ *Biz bilan bog'lanish*

📞 Telefon: ${phone || "+998943941919"}
📸 Instagram: @${instagram || "pizza_ria_1"}

Instagram sahifamizga o'tish uchun quyidagi tugmani bosing:`;

  const keyboard = Markup.inlineKeyboard([
    [{ text: "📸 Instagram", url: `https://instagram.com/${instagram || "pizza_ria_1"}` }],
    [{ text: `📞 Qo'ng'iroq qilish`, url: `tel:${phone || "+998943941919"}` }],
    [{ text: "🏠 Asosiy menyu", callback_data: "main_menu" }],
  ]);

  await ctx.reply(text, {
    parse_mode: "Markdown",
    ...keyboard,
  });
}
