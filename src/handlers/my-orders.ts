import { BotContext, STATUS_LABELS, STATUS_EMOJI } from "../types";
import { myOrdersKeyboard, mainMenuKeyboard, inlineMainMenu } from "../keyboards";
import { Markup } from "telegraf";
import * as db from "../database";
import { getCallbackData } from "../utils/helpers";

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

  // Add "Buyurtmani oldim" button for active orders
  const keyboard = Markup.inlineKeyboard([
    [{ text: "📦 Buyurtmani oldim", callback_data: `picked_up_${order.id}` }],
    [{ text: "🏠 Asosiy menyu", callback_data: "main_menu" }],
  ]);

  try {
    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
      ...keyboard,
    });
  } catch {
    await ctx.reply(text, {
      parse_mode: "Markdown",
      ...keyboard,
    });
  }
}

export async function handlePickedUpCallback(ctx: BotContext) {
  if (!ctx.from) return;

  const data = getCallbackData(ctx);
  if (!data) return;
  const orderId = parseInt(data.replace("picked_up_", ""));

  if (!orderId) return ctx.answerCbQuery("Xatolik!");

  const order = await db.getOrderById(orderId);

  if (!order) {
    return ctx.answerCbQuery("Buyurtma topilmadi!");
  }

  if (Number(order.userId) !== ctx.from.id) {
    return ctx.answerCbQuery("Bu sizning buyurtmangiz emas!");
  }

  // Update status to delivered
  await db.updateOrderStatus(orderId, "delivered");

  // Notify admins
  const adminUsers = await db.getAdminUsers();
  const adminIds = adminUsers.map((u) => Number(u.telegramId));
  const envAdminIds = (process.env.ADMIN_IDS || "")
    .split(",")
    .map((id) => parseInt(id.trim()))
    .filter(Boolean);
  const allAdminIds = [...new Set([...adminIds, ...envAdminIds])];

  for (const adminId of allAdminIds) {
    try {
      await ctx.telegram.sendMessage(
        adminId,
        `✅ Buyurtma #${order.orderNumber} mijoz tomonidan olindi!\n\n👤 Mijoz: ${order.user.firstName}\n💰 Narx: ${order.totalPrice.toLocaleString("uz-UZ")} so'm`
      );
    } catch {}
  }

  await ctx.answerCbQuery("✅ Buyurtma olindi!");

  const text = `✅ *Buyurtma #${order.orderNumber} olindi!*\n\nRahmat! Yana tashrif buyuring! 🍕`;

  await ctx.editMessageText(text, {
    parse_mode: "Markdown",
    ...inlineMainMenu(),
  });
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
  text += `\n\n📋 Holat: ${statusLabel}`;

  return text;
}
