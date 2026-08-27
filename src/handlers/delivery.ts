import { Markup } from "telegraf";
import { BotContext } from "../types";
import { mainMenuKeyboard, inlineMainMenu } from "../keyboards";
import * as db from "../database";

export async function handleDeliveryText(ctx: BotContext) {
  const deliveryPriceSetting = await db.getSetting("delivery_price");
  const deliveryPrice = parseInt(deliveryPriceSetting || "10000");
  const address = await db.getSetting("about_address");

  const text = `📍 *Yetkazib berish*

🚚 Yetkazib berish narxi: ${deliveryPrice.toLocaleString("uz-UZ")} so'm
📍 Manzil: ${address || "Toshkent shahri"}

Buyurtma berish uchun 🍕 Menyuni tanlang va mahsulotlarni tanlab, savatga qo'shing.`;

  await ctx.reply(text, {
    parse_mode: "Markdown",
    ...mainMenuKeyboard(),
  });
}
