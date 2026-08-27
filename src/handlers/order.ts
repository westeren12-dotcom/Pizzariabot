import { BotContext, PAYMENT_LABELS } from "../types";
import {
  contactRequestKeyboard,
  locationRequestKeyboard,
  paymentKeyboard,
  orderConfirmKeyboard,
  mainMenuKeyboard,
  backToMainKeyboard,
} from "../keyboards";
import * as db from "../database";
import { getCallbackData } from "../utils/helpers";

export async function handleStartOrderCallback(ctx: BotContext) {
  if (!ctx.from) return;

  const items = await db.getCartItems(ctx.from.id);
  if (items.length === 0) {
    return ctx.answerCbQuery("🛒 Savatingiz bo'sh!");
  }

  ctx.session.state = "awaiting_phone";

  const text = `📦 *Buyurtma berish*\n\n📱 *1-bosqich:*\nTelefon raqamingizni yuboring.\n\nQuyidagi tugmani bosing yoki qo'lda kiriting:`;

  try {
    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
    });
  } catch {
    await ctx.reply(text, {
      parse_mode: "Markdown",
    });
  }

  await ctx.reply("📞 Telefon raqamni yuboring:", {
    ...contactRequestKeyboard(),
  });
}

export async function handleContact(ctx: BotContext) {
  if (!ctx.from || !ctx.message || !("contact" in ctx.message)) return;

  const contact = ctx.message.contact;
  const phone = contact.phone_number;

  await db.updateUserPhone(ctx.from.id, phone);
  ctx.session.phone = phone;
  ctx.session.state = "awaiting_address";

  await ctx.reply(
    `✅ Telefon: +${phone}\n\n📍 *2-bosqich:*\nYetkazib berish manzilingizni kiriting:`,
    {
      parse_mode: "Markdown",
      ...backToMainKeyboard(),
    }
  );
}

export async function handlePhoneText(ctx: BotContext) {
  if (!ctx.from || !ctx.message || !("text" in ctx.message)) return;

  const text = ctx.message.text;
  if (text === "⬅️ Orqaga") {
    ctx.session.state = undefined;
    return ctx.reply("🏠 Asosiy menyu:", mainMenuKeyboard());
  }

  const cleaned = text.replace(/[\s\-\(\)]/g, "");
  if (!/^\+?\d{9,15}$/.test(cleaned)) {
    return ctx.reply("❌ Noto'g'ri telefon raqam. Qaytadan kiriting:");
  }

  const phone = cleaned.startsWith("+") ? cleaned.substring(1) : cleaned;
  await db.updateUserPhone(ctx.from.id, phone);
  ctx.session.phone = phone;
  ctx.session.state = "awaiting_address";

  await ctx.reply(
    `✅ Telefon: +${phone}\n\n📍 *2-bosqich:*\nYetkazib berish manzilingizni kiriting:`,
    {
      parse_mode: "Markdown",
      ...backToMainKeyboard(),
    }
  );
}

export async function handleAddress(ctx: BotContext) {
  if (!ctx.from || !ctx.message || !("text" in ctx.message)) return;

  const text = ctx.message.text;
  if (text === "⬅️ Orqaga") {
    ctx.session.state = "awaiting_phone";
    return ctx.reply("📞 Telefon raqamni yuboring:", contactRequestKeyboard());
  }

  ctx.session.address = text;
  ctx.session.state = "awaiting_location";

  await ctx.reply(
    `✅ Manzil: ${text}\n\n🗺 *3-bosqich:*\nLokatsiyangizni yuboring.\n\nTelegram lokatsiya tugmasini bosing yoki "Lokatsiyasiz davom etish" bosing:`,
    {
      parse_mode: "Markdown",
      ...locationRequestKeyboard(),
    }
  );
}

export async function handleLocation(ctx: BotContext) {
  if (!ctx.from || !ctx.message || !("location" in ctx.message)) return;

  const location = ctx.message.location;
  ctx.session.latitude = location.latitude;
  ctx.session.longitude = location.longitude;
  ctx.session.state = "awaiting_payment";

  await ctx.reply(
    `✅ Lokatsiya qabul qilindi!\n\n💳 *4-bosqich:*\nTo'lov turini tanlang:`,
    {
      parse_mode: "Markdown",
      ...paymentKeyboard(),
    }
  );
}

export async function handleSkipLocation(ctx: BotContext) {
  if (!ctx.from) return;

  ctx.session.state = "awaiting_payment";

  await ctx.reply(`✅ Lokatsiya o'tkazib yuborildi.\n\n💳 *4-bosqich:*\nTo'lov turini tanlang:`, {
    parse_mode: "Markdown",
    ...paymentKeyboard(),
  });
}

export async function handlePaymentCallback(ctx: BotContext) {
  const data = getCallbackData(ctx);
  if (!data || !ctx.from) return;

  if (data === "back_to_address") {
    ctx.session.state = "awaiting_address";
    return ctx.reply("📍 Manzilingizni kiriting:", backToMainKeyboard());
  }

  const paymentType = data === "pay_cash" ? "cash" : "card";
  ctx.session.paymentType = paymentType;
  ctx.session.state = "awaiting_confirm";

  const items = await db.getCartItems(ctx.from.id);
  const deliveryPriceSetting = await db.getSetting("delivery_price");
  const deliveryPrice = parseInt(deliveryPriceSetting || "0");

  let itemsTotal = 0;
  let summary = `📦 *Buyurtma xulosasi*\n`;

  for (const item of items) {
    const itemTotal = item.variant.price * item.quantity;
    itemsTotal += itemTotal;
    const variantInfo = item.variant.name !== "Standart" ? ` — ${item.variant.name}` : "";
    summary += `\n${item.product.emoji || "🍽"} ${item.product.name}${variantInfo} × ${item.quantity}`;
  }

  const grandTotal = itemsTotal + deliveryPrice;

  summary += `\n\n💰 Mahsulotlar: ${itemsTotal.toLocaleString("uz-UZ")} so'm`;
  summary += `\n🚚 Yetkazib berish: ${deliveryPrice > 0 ? deliveryPrice.toLocaleString("uz-UZ") + " so'm" : "Bepul"}`;
  summary += `\n💰 *Jami: ${grandTotal.toLocaleString("uz-UZ")} so'm*`;
  summary += `\n\n📍 Manzil: ${ctx.session.address || "Ko'rsatilmagan"}`;
  summary += `\n📞 Telefon: +${ctx.session.phone || "Ko'rsatilmagan"}`;
  summary += `\n💳 To'lov: ${PAYMENT_LABELS[paymentType]}`;

  try {
    await ctx.editMessageText(summary, {
      parse_mode: "Markdown",
      ...orderConfirmKeyboard(),
    });
  } catch {
    await ctx.reply(summary, {
      parse_mode: "Markdown",
      ...orderConfirmKeyboard(),
    });
  }
}

export async function handleConfirmOrderCallback(ctx: BotContext) {
  if (!ctx.from) return;

  const items = await db.getCartItems(ctx.from.id);
  if (items.length === 0) {
    return ctx.answerCbQuery("🛒 Savatingiz bo'sh!");
  }

  if (!ctx.session.phone || !ctx.session.address || !ctx.session.paymentType) {
    return ctx.answerCbQuery("⚠️ Buyurtma ma'lumotlari to'liq emas!");
  }

  const deliveryPriceSetting = await db.getSetting("delivery_price");
  const deliveryPrice = parseInt(deliveryPriceSetting || "0");

  let itemsTotal = 0;
  for (const item of items) {
    itemsTotal += item.variant.price * item.quantity;
  }

  const grandTotal = itemsTotal + deliveryPrice;

  try {
    const order = await db.createOrder({
      userId: ctx.from.id,
      phone: ctx.session.phone,
      address: ctx.session.address,
      latitude: ctx.session.latitude || null,
      longitude: ctx.session.longitude || null,
      paymentType: ctx.session.paymentType,
      deliveryPrice,
      totalPrice: grandTotal,
      items: items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        price: item.variant.price,
      })),
    });

    ctx.session.state = undefined;
    ctx.session.phone = undefined;
    ctx.session.address = undefined;
    ctx.session.latitude = undefined;
    ctx.session.longitude = undefined;
    ctx.session.paymentType = undefined;

    const confirmText = `✅ *Buyurtma #${order.orderNumber} qabul qilindi!*\n\n⏳ Buyurtmangiz ko'rib chiqilmoqda.\nTez orada siz bilan bog'lanamiz!`;

    try {
      await ctx.editMessageText(confirmText, {
        parse_mode: "Markdown",
      });
    } catch {
      await ctx.reply(confirmText, {
        parse_mode: "Markdown",
        ...mainMenuKeyboard(),
      });
    }

    await notifyAdmins(ctx, order);
  } catch (error) {
    console.error("Order creation error:", error);
    await ctx.reply("❌ Buyurtma yaratishda xatolik yuz berdi.", {
      ...mainMenuKeyboard(),
    });
  }
}

export async function handleCancelOrderCallback(ctx: BotContext) {
  ctx.session.state = undefined;
  ctx.session.phone = undefined;
  ctx.session.address = undefined;
  ctx.session.latitude = undefined;
  ctx.session.longitude = undefined;
  ctx.session.paymentType = undefined;

  try {
    await ctx.editMessageText("❌ Buyurtma bekor qilindi.");
  } catch {
    await ctx.reply("❌ Buyurtma bekor qilindi.", {
      ...mainMenuKeyboard(),
    });
  }
}

export async function handleOrderBack(ctx: BotContext) {
  ctx.session.state = undefined;
  ctx.reply("🏠 Asosiy menyu:", mainMenuKeyboard());
}

// ============================================================
// Notify admins about new order
// ============================================================
async function notifyAdmins(ctx: BotContext, order: any) {
  // Get admin users from database by username
  const adminUsers = await db.getAdminUsers();
  const adminIds = adminUsers.map((u) => Number(u.telegramId));

  // Also try ADMIN_IDS env var
  const envAdminIds = (process.env.ADMIN_IDS || "")
    .split(",")
    .map((id) => parseInt(id.trim()))
    .filter(Boolean);

  const allAdminIds = [...new Set([...adminIds, ...envAdminIds])];

  console.log("Admin IDs for notification:", allAdminIds);

  if (allAdminIds.length === 0) {
    console.log("No admin users found for notification!");
    return;
  }

  let itemsText = "";
  for (const item of order.items) {
    const variantInfo = item.variant.name !== "Standart" ? ` — ${item.variant.name}` : "";
    itemsText += `  ${item.product.emoji || "🍽"} ${item.product.name}${variantInfo} × ${item.quantity}\n`;
  }

  const adminMessage = `📦 *YANGI BUYURTMA #${order.orderNumber}*

👤 Mijoz: ${order.user.firstName} ${order.user.lastName || ""}
📞 Telefon: +${order.phone}
${itemsText}
💰 Jami: ${order.totalPrice.toLocaleString("uz-UZ")} so'm
📍 Manzil: ${order.address}
💳 To'lov: ${PAYMENT_LABELS[order.paymentType] || order.paymentType}`;

  for (const adminId of allAdminIds) {
    try {
      await ctx.telegram.sendMessage(adminId, adminMessage, {
        parse_mode: "Markdown",
      });
      console.log(`Admin notified: ${adminId}`);
    } catch (err) {
      console.error(`Failed to notify admin ${adminId}:`, err);
    }
  }
}
