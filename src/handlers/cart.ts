import { BotContext } from "../types";
import { cartKeyboard, mainMenuKeyboard, categoryListKeyboard } from "../keyboards";
import * as db from "../database";
import { getCallbackData } from "../utils/helpers";

export async function handleCartText(ctx: BotContext) {
  if (!ctx.from) return;

  const items = await db.getCartItems(ctx.from.id);

  if (items.length === 0) {
    return ctx.reply("🛒 Savatingiz bo'sh.\n\nMahsulot qo'shish uchun menyuga qarang:", {
      ...mainMenuKeyboard(),
    });
  }

  let text = `🛒 *SAVAT*\n`;

  let total = 0;
  for (const item of items) {
    const itemTotal = item.variant.price * item.quantity;
    total += itemTotal;
    const variantInfo = item.variant.name !== "Standart" ? ` — ${item.variant.name}` : "";
    text += `\n${item.product.emoji || "🍽"} ${item.product.name}${variantInfo} × ${item.quantity}`;
    text += `\n   💰 ${itemTotal.toLocaleString("uz-UZ")} so'm`;
  }

  text += `\n\n💰 *Jami: ${total.toLocaleString("uz-UZ")} so'm*`;

  await ctx.reply(text, {
    parse_mode: "Markdown",
    ...cartKeyboard(true),
  });
}

export async function handleViewCartCallback(ctx: BotContext) {
  if (!ctx.from) return;

  const items = await db.getCartItems(ctx.from.id);

  if (items.length === 0) {
    return ctx.answerCbQuery("🛒 Savatingiz bo'sh!");
  }

  let text = `🛒 *SAVAT*\n`;

  let total = 0;
  for (const item of items) {
    const itemTotal = item.variant.price * item.quantity;
    total += itemTotal;
    const variantInfo = item.variant.name !== "Standart" ? ` — ${item.variant.name}` : "";
    text += `\n${item.product.emoji || "🍽"} ${item.product.name}${variantInfo} × ${item.quantity}`;
    text += `\n   💰 ${itemTotal.toLocaleString("uz-UZ")} so'm`;
  }

  text += `\n\n💰 *Jami: ${total.toLocaleString("uz-UZ")} so'm*`;

  try {
    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
      ...cartKeyboard(true),
    });
  } catch {
    await ctx.reply(text, {
      parse_mode: "Markdown",
      ...cartKeyboard(true),
    });
  }
}

export async function handleClearCartCallback(ctx: BotContext) {
  if (!ctx.from) return;

  await db.clearCart(ctx.from.id);

  await ctx.answerCbQuery("🗑 Savat tozalandi!");

  try {
    await ctx.editMessageText("🛒 Savat tozalandi.\n\nMahsulot qo'shish uchun menyuga qarang:", {
      ...cartKeyboard(false),
    });
  } catch {
    await ctx.reply("🛒 Savat tozalandi.", {
      ...mainMenuKeyboard(),
    });
  }
}

export async function handleAddMoreCallback(ctx: BotContext) {
  const categories = await db.getActiveCategories();

  const text = `🍕 *Menyu*\n\nQo'shmoqchi bo'lgan mahsulotni tanlang:`;

  try {
    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
      ...categoryListKeyboard(categories),
    });
  } catch {
    await ctx.reply(text, {
      parse_mode: "Markdown",
      ...categoryListKeyboard(categories),
    });
  }
}
