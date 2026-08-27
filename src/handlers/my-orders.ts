import { BotContext, STATUS_LABELS, STATUS_EMOJI } from "../types";
import { myOrdersKeyboard, mainMenuKeyboard, inlineMainMenu } from "../keyboards";
import * as db from "../database";

export async function handleMyOrdersText(ctx: BotContext) {
  if (!ctx.from) return;

  const text = `📦 *Mening buyurtmalarim*\n\nBo'limlardan birini tanlang:`;

  await ctx.reply(text, {
    parse_mode: "Markdown",
    ...myOrdersKeyboard(),
  });
}

export async function handleActiveOrderCallback(ctx: BotContext) {
  if (!ctx.from) return;

  const order = await db.getActiveOrderByUser(ctx.from.id);

  if (!order) {
    return ctx.answerCbQuery("📦 Hozirda faol buyurtmangiz yo'q");
  }

  const text = buildOrderText(order);

  try {
    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
      ...inlineMainMenu(),
    });
  } catch {
    await ctx.reply(text, {
      parse_mode: "Markdown",
      ...inlineMainMenu(),
    });
  }
}

export async function handleOrderHistoryCallback(ctx: BotContext) {
  if (!ctx.from) return;

  const orders = await db.getOrdersByUser(ctx.from.id);

  if (orders.length === 0) {
    return ctx.answerCbQuery("📜 Buyurtmalar tarixi bo'sh");
  }

  let text = `📜 *Buyurtmalar tarixi*\n`;

  for (const order of orders.slice(0, 10)) {
    const statusLabel = STATUS_LABELS[order.status as keyof typeof STATUS_LABELS] || order.status;
    const statusEmoji = STATUS_EMOJI[order.status as keyof typeof STATUS_EMOJI] || "📋";

    text += `\n${statusEmoji} *#${order.orderNumber}* — ${order.totalPrice.toLocaleString("uz-UZ")} so'm`;
    text += `\n   📅 ${new Date(order.createdAt).toLocaleDateString("uz-UZ")}`;
    text += `\n   ${statusLabel}`;
    text += `\n`;
  }

  if (orders.length > 10) {
    text += `\n_... va yana ${orders.length - 10} ta buyurtma_`;
  }

  try {
    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
      ...inlineMainMenu(),
    });
  } catch {
    await ctx.reply(text, {
      parse_mode: "Markdown",
      ...inlineMainMenu(),
    });
  }
}

function buildOrderText(order: any): string {
  const statusLabel = STATUS_LABELS[order.status as keyof typeof STATUS_LABELS] || order.status;
  const statusEmoji = STATUS_EMOJI[order.status as keyof typeof STATUS_EMOJI] || "📋";

  let text = `${statusEmoji} *Buyurtma #${order.orderNumber}*\n`;

  for (const item of order.items) {
    const variantInfo = item.variant.name !== "Standart" ? ` — ${item.variant.name}` : "";
    text += `\n${item.product.emoji || "🍽"} ${item.product.name}${variantInfo} × ${item.quantity}`;
  }

  text += `\n\n💰 Jami: ${order.totalPrice.toLocaleString("uz-UZ")} so'm`;
  text += `\n📍 Manzil: ${order.address}`;
  text += `\n💳 To'lov: ${order.paymentType === "cash" ? "💵 Naqd" : "💳 Karta"}`;
  text += `\n\n${statusLabel}`;

  return text;
}
