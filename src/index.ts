import dotenv from "dotenv";
dotenv.config();
import { Telegraf, session, Markup } from "telegraf";
import { BotContext } from "./types";
import { autoRegisterMiddleware, isAdmin } from "./middlewares";
import * as path from "path";
import * as fs from "fs";

// Import handlers
import { handleStart, handleAdmin } from "./handlers/start";
import {
  handleMenuText,
  handleCategoryCallback,
  handleProductCallback,
  handleAddCartCallback,
  handleVariantCallback,
  handleQuantityCallback,
  handleConfirmAddCallback,
  handleMenuBack,
  handleMainMenuCallback,
  handleOrderItemCallback,
  handleSizeSelection,
  findMenuItem,
} from "./handlers/menu";
import {
  handleCartText,
  handleViewCartCallback,
  handleClearCartCallback,
  handleAddMoreCallback,
} from "./handlers/cart";
import {
  handleStartOrderCallback,
  handleContact,
  handlePhoneText,
  handleAddress,
  handleLocation,
  handleSkipLocation,
  handlePaymentCallback,
  handleConfirmOrderCallback,
  handleCancelOrderCallback,
  handleOrderBack,
} from "./handlers/order";
import {
  handleActiveOrderCallback,
  handleOrderHistoryCallback,
  handleMyOrdersText,
  handlePickedUpCallback,
} from "./handlers/my-orders";
import { handleAboutText, handleAboutCallback } from "./handlers/about";
import { handleContactText } from "./handlers/contact";
import { handleDeliveryText } from "./handlers/delivery";

// Import admin handlers
import {
  handleAdminPanel,
  handleStats,
  handleAdminOrders,
  handleAdminViewOrderCallback,
  handleAdminStatusCallback,
  handleAdminActiveOrders,
  handleAdminCustomers,
  handleAdminMenuMgmt,
  handleAdminAddProduct,
  handleAdminCategorySelect,
  handleAdminEditProduct,
  handleAdminEditNameCallback,
  handleAdminEditPriceCallback,
  handleAdminEditDescCallback,
  handleAdminDeleteProductCallback,
  handleAdminEditText,
  handleAdminCatMgmtCallback,
  handleAdminAddCategoryCallback,
  handleAdminAddCategoryText,
  handleAdminSettings,
  handleAdminSettingCallback,
  handleAdminSettingText,
  handleAdminPanelCallback,
  handleAdminMenuMgmtCallback,
  handleAdminReport,
} from "./handlers/admin";

import {
  mainMenuKeyboard,
  districtKeyboard,
  orderConfirmKeyboard,
  backToMainKeyboard,
  quantitySelectionKeyboard,
} from "./keyboards";

import * as db from "./database";
import { getCallbackData } from "./utils/helpers";
import { onNewOrder } from "./services/notifications";

// ============================================================
// BOT INITIALIZATION
// ============================================================
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("BOT_TOKEN is not set in .env file!");
  process.exit(1);
}

const bot = new Telegraf<BotContext>(BOT_TOKEN);

// ============================================================
// MIDDLEWARE
// ============================================================
bot.use(
  session({
    defaultSession: () => ({}),
  })
);

bot.use(autoRegisterMiddleware);

// ============================================================
// ERROR HANDLING
// ============================================================
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply("Xatolik yuz berdi.").catch(() => {});
});

// ============================================================
// /start COMMAND
// ============================================================
bot.start(handleStart);

// ============================================================
// ADMIN COMMANDS — try/catch bilan
// ============================================================
function adminGuard(handler: (ctx: BotContext) => Promise<any>) {
  return async (ctx: BotContext) => {
    if (!ctx.from || !isAdmin(ctx.from.id, ctx.from.username)) {
      return ctx.reply("Siz admin emassiz!");
    }
    // State ni tozalash — admin commandlari order flow'ni buzmasin
    ctx.session.state = undefined;
    ctx.session.adminAction = undefined;
    try {
      await handler(ctx);
    } catch (err) {
      console.error("Admin command error:", err);
      await ctx.reply("Xatolik yuz berdi. Qaytadan urinib ko'ring.").catch(() => {});
    }
  };
}

bot.command("admin", handleAdmin);
bot.command("bugungifoyda", adminGuard(handleStats));
bot.command("bugunigibuyurtmalar", adminGuard(handleAdminActiveOrders));
bot.command("statistika", adminGuard(handleStats));
bot.command("hisobot", adminGuard(handleAdminReport));
bot.command("menyuboshqarish", adminGuard(handleAdminMenuMgmt));
bot.command("narxlar", adminGuard(handleAdminSettings));
bot.command("buyurtmalar", adminGuard(handleAdminOrders));
bot.command("faolbuyurtmalar", adminGuard(handleAdminActiveOrders));
bot.command("mijozlar", adminGuard(handleAdminCustomers));
bot.command("broadcast", adminGuard(async (ctx) => {
  ctx.session.adminAction = "broadcast";
  await ctx.reply("Xabar matnini kiriting. Bu xabar barcha mijozlarga yuboriladi:");
}));
bot.command("sozlamalar", adminGuard(handleAdminSettings));

// ============================================================
// CONTACT HANDLER
// ============================================================
bot.on("contact", handleContact);

// ============================================================
// LOCATION HANDLER
// ============================================================
bot.on("location", async (ctx) => {
  if (ctx.session.state === "awaiting_location") {
    return handleLocation(ctx);
  }
});

// ============================================================
// TEXT MESSAGE HANDLERS
// ============================================================
bot.on("text", async (ctx) => {
  const text = ctx.message.text;

  // Agar / command bo'lsa, command handler ishlaydi
  if (text.startsWith("/")) return;

  // ============================
  // ADMIN TEXT ACTIONS
  // ============================
  if (ctx.from && isAdmin(ctx.from.id, ctx.from.username) && ctx.session.adminAction) {
    if (await handleAdminEditText(ctx)) return;
    if (await handleAdminAddCategoryText(ctx)) return;
    if (await handleAdminSettingText(ctx)) return;

    // Broadcast handler
    if (ctx.session.adminAction === "broadcast") {
      ctx.session.adminAction = undefined;
      const users = await db.getAllUsers();
      let sent = 0;
      let failed = 0;
      for (const user of users) {
        try {
          await ctx.telegram.sendMessage(Number(user.telegramId), text);
          sent++;
        } catch {
          failed++;
        }
      }
      await ctx.reply(`Xabar yuborildi!\nYuborilgan: ${sent}\nXatolik: ${failed}`);
      return;
    }
  }

  // ============================
  // SIMPLE ORDER FLOW
  // ============================

  // State: awaiting order item (user types product name)
  if (ctx.session.state === "awaiting_order_item") {
    const item = findMenuItem(text);
    if (item) {
      // If item has 2 prices, show size selection
      if (item.priceSmall && item.priceLarge) {
        ctx.session.orderItem = item.name;
        ctx.session.state = "awaiting_order_size";
        const { Markup } = await import("telegraf");
        await ctx.reply(
          `${item.name} tanlandi!\n\nHajmini tanlang:`,
          Markup.inlineKeyboard([
            [{ text: `Kichik — ${item.priceSmall.toLocaleString("uz-UZ")} so'm`, callback_data: `size_${item.name}_small` }],
            [{ text: `Katta — ${item.priceLarge.toLocaleString("uz-UZ")} so'm`, callback_data: `size_${item.name}_large` }],
            [{ text: "⬅️ Orqaga", callback_data: "menu_back" }],
          ])
        );
        return;
      }
      // Single price — ask quantity first
      ctx.session.orderItem = item.name;
      ctx.session.orderPrice = item.price || 0;
      ctx.session.orderVariant = "Standart";
      ctx.session.orderQuantity = 1;
      ctx.session.state = "awaiting_order_quantity";
      await ctx.reply(
        `${item.name} — ${(item.price || 0).toLocaleString("uz-UZ")} so'm tanlandi!\n\nMiqdorini tanlang (1-10):`,
        quantitySelectionKeyboard()
      );
    } else {
      await ctx.reply("Mahsulot topilmadi. Qaytadan kiriting yoki menyudan tanlang:");
    }
    return;
  }

  // State: awaiting order quantity (1-10)
  if (ctx.session.state === "awaiting_order_quantity") {
    const qty = parseInt(text);
    if (isNaN(qty) || qty < 1 || qty > 10) {
      await ctx.reply("Iltimos, 1 dan 10 gacha son kiriting:", quantitySelectionKeyboard());
      return;
    }
    ctx.session.orderQuantity = qty;
    ctx.session.state = "awaiting_order_name";
    await ctx.reply(`✅ ${qty} dona tanlandi!\n\nIsmingizni kiriting:`);
    return;
  }

  // State: awaiting order name
  if (ctx.session.state === "awaiting_order_name") {
    ctx.session.orderName = text;
    ctx.session.state = "awaiting_order_district";
    await ctx.reply("Hududni tanlang:", districtKeyboard());
    return;
  }

  // State: awaiting order phone
  if (ctx.session.state === "awaiting_order_phone") {
    ctx.session.orderPhone = text;

    const orderItem = ctx.session.orderItem || "";
    const orderName = ctx.session.orderName || "";
    const orderDistrict = ctx.session.orderDistrict || "";
    const orderPrice = ctx.session.orderPrice || 0;
    const orderVariant = ctx.session.orderVariant || "Standart";
    const orderQuantity = ctx.session.orderQuantity || 1;
    const totalPrice = orderPrice * orderQuantity;

    let summary = `📦 *Buyurtma tasdiqlash*\n\n`;
    summary += `🍕 *Menyu:* ${orderItem}`;
    if (orderVariant !== "Standart") {
      summary += ` (${orderVariant})`;
    }
    summary += `\n🔢 *Miqdor:* ${orderQuantity} ta`;
    summary += `\n💰 *Narx:* ${orderPrice.toLocaleString("uz-UZ")} so'm × ${orderQuantity}`;
    summary += `\n💰 *Jami:* ${totalPrice.toLocaleString("uz-UZ")} so'm`;
    summary += `\n👤 *Ism:* ${orderName}`;
    summary += `\n📍 *Hudud:* ${orderDistrict}`;
    summary += `\n📞 *Telefon:* ${text}`;
    summary += `\n\n🚚 *Yetkazib berish:* Bepul`;
    summary += `\n\nBuyurtmani tasdiqlaysizmi?`;

    ctx.session.state = "awaiting_order_confirm";
    await ctx.reply(summary, {
      parse_mode: "Markdown",
      ...orderConfirmKeyboard(),
    });
    return;
  }

  // ============================
  // ORIGINAL ORDER FLOW (kept for compatibility)
  // ============================
  if (ctx.session.state === "awaiting_phone") {
    return handlePhoneText(ctx);
  }
  if (ctx.session.state === "awaiting_address") {
    return handleAddress(ctx);
  }
  if (ctx.session.state === "awaiting_location") {
    if (text === "Orqaga") {
      ctx.session.state = "awaiting_address";
      return ctx.reply("Manzilingizni kiriting:");
    }
    return ctx.reply("Iltimos, Telegram lokatsiya tugmasini bosing:");
  }

  // ============================
  // ADMIN BUTTONS (order flow'dan oldin tekshiriladi)
  // ============================
  if (ctx.from && isAdmin(ctx.from.id, ctx.from.username)) {
    if (text.includes("Bugungi statistika")) {
      ctx.session.state = undefined;
      return handleStats(ctx);
    }
    if (text.includes("Buyurtmalar") && !text.includes("Faol")) {
      ctx.session.state = undefined;
      return handleAdminOrders(ctx);
    }
    if (text.includes("Faol buyurtmalar")) {
      ctx.session.state = undefined;
      return handleAdminActiveOrders(ctx);
    }
    if (text.includes("Mijozlar")) {
      ctx.session.state = undefined;
      return handleAdminCustomers(ctx);
    }
    if (text.includes("Menyuni boshqarish")) {
      ctx.session.state = undefined;
      return handleAdminMenuMgmt(ctx);
    }
    if (text.includes("Sozlamalar")) {
      ctx.session.state = undefined;
      return handleAdminSettings(ctx);
    }
    if (text.includes("Mahsulot qo'shish")) {
      ctx.session.state = undefined;
      return handleAdminAddProduct(ctx);
    }
  }

  // ============================
  // MAIN MENU BUTTONS
  // ============================
  if (text.includes("Menyu") && !text.includes("boshqarish")) {
    ctx.session.state = undefined;
    return handleMenuText(ctx);
  }
  if (text.includes("Savatim")) {
    ctx.session.state = undefined;
    return handleCartText(ctx);
  }
  if (text.includes("buyurtmalarim")) {
    ctx.session.state = undefined;
    return handleMyOrdersText(ctx);
  }
  if (text.includes("Yetkazib berish")) {
    ctx.session.state = undefined;
    return handleDeliveryText(ctx);
  }
  if (text.includes("Biz haqimizda")) {
    ctx.session.state = undefined;
    return handleAboutText(ctx);
  }
  if (text.includes("Bog'lanish")) {
    ctx.session.state = undefined;
    return handleContactText(ctx);
  }
  if (text.includes("Asosiy menyu")) {
    ctx.session.state = undefined;
    return handleStart(ctx);
  }
});

// ============================================================
// CALLBACK QUERY HANDLERS (InlineKeyboard)
// ============================================================

// Menu callbacks
bot.action(/^order_item_/, handleOrderItemCallback);
bot.action(/^size_(.+)$/, handleSizeSelection);
bot.action(/^cat_(\d+)$/, handleCategoryCallback);
bot.action(/^prod_(\d+)$/, handleProductCallback);
bot.action(/^add_cart_(\d+)$/, handleAddCartCallback);
bot.action(/^variant_(\d+)_(\d+)$/, handleVariantCallback);
bot.action(/^qty_(plus|minus|show)_/, handleQuantityCallback);
bot.action(/^confirm_add_/, handleConfirmAddCallback);
bot.action("menu_back", handleMenuBack);
bot.action("main_menu", handleMainMenuCallback);

// Cart callbacks
bot.action("view_cart", handleViewCartCallback);
bot.action("clear_cart", handleClearCartCallback);
bot.action("start_order", handleStartOrderCallback);

// District selection
bot.action(/^district_(.+)$/, async (ctx) => {
  const data = getCallbackData(ctx);
  if (!data || !ctx.from) return;

  const district = data.replace("district_", "");
  ctx.session.orderDistrict = district === "chinobod" ? "Chinobod hududiga" : "Chinoboddan tashqariga";
  ctx.session.state = "awaiting_order_phone";

  await ctx.answerCbQuery();
  await ctx.reply("📞 Telefon raqamingizni kiriting:");
});

// Order confirmation
bot.action("confirm_order", async (ctx) => {
  if (!ctx.from) return;

  if (ctx.session.state !== "awaiting_order_confirm") {
    return ctx.answerCbQuery("Buyurtma topilmadi!");
  }

  const orderItem = ctx.session.orderItem || "";
  const orderName = ctx.session.orderName || "";
  const orderDistrict = ctx.session.orderDistrict || "";
  const orderPhone = ctx.session.orderPhone || "";
  const orderPrice = ctx.session.orderPrice || 0;
  const orderVariant = ctx.session.orderVariant || "Standart";
  const orderQuantity = ctx.session.orderQuantity || 1;
  let savedOrderId = 0;

  try {
    await db.getOrCreateUser(ctx.from.id, ctx.from.first_name, ctx.from.last_name, ctx.from.username);

    const orderNumber = await db.getNextOrderNumber();

    const cartItems = await db.getCartItems(ctx.from.id);

    let totalPrice = 0;
    let order;

    if (cartItems.length > 0) {
      for (const item of cartItems) {
        totalPrice += item.variant.price * item.quantity;
      }

      order = await db.createOrder({
        userId: ctx.from.id,
        phone: orderPhone,
        address: orderDistrict,
        paymentType: "cash",
        deliveryPrice: 0,
        totalPrice,
        items: cartItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          price: item.variant.price,
        })),
      });
      savedOrderId = order.id;
    } else {
      // Text-based order — use stored price × quantity
      totalPrice = orderPrice * orderQuantity;

      order = await db.createOrder({
        userId: ctx.from.id,
        phone: orderPhone,
        address: orderDistrict,
        paymentType: "cash",
        deliveryPrice: 0,
        totalPrice,
        items: [],
      });
      savedOrderId = order.id;
    }

    // Get admin IDs
    const adminUsers = await db.getAdminUsers();
    const adminIds = adminUsers.map((u) => Number(u.telegramId));
    const envAdminIds = (process.env.ADMIN_IDS || "")
      .split(",")
      .map((id) => parseInt(id.trim()))
      .filter(Boolean);
    const allAdminIds = [...new Set([...adminIds, ...envAdminIds])];

    // Build items text with quantity
    let itemsText = "";
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        const variantInfo = item.variant?.name !== "Standart" ? ` — ${item.variant?.name}` : "";
        itemsText += `  ${item.product?.emoji || "🍽"} ${item.product?.name || ""}${variantInfo} × ${item.quantity}\n`;
      }
    } else {
      const variantInfo = orderVariant !== "Standart" ? ` (${orderVariant})` : "";
      itemsText = `  🍕 ${orderItem}${variantInfo} × ${orderQuantity}\n`;
    }

    const totalPriceStr = totalPrice > 0 ? totalPrice.toLocaleString("uz-UZ") : "0";

    // Auto-accept order
    await db.updateOrderStatus(savedOrderId, "accepted");

    // Send Telegram notification to admins
    await onNewOrder(bot, allAdminIds, {
      orderNumber: order.orderNumber,
      orderId: savedOrderId,
      customerName: orderName,
      customerPhone: orderPhone,
      district: orderDistrict,
      items: itemsText,
      totalPrice: totalPriceStr,
      paymentType: "Naqd",
    }, ctx.from.id);
  } catch (error) {
    console.error("Order error:", error);
  }

  // Clear session
  ctx.session.state = undefined;
  ctx.session.orderItem = undefined;
  ctx.session.orderPrice = undefined;
  ctx.session.orderVariant = undefined;
  ctx.session.orderName = undefined;
  ctx.session.orderDistrict = undefined;
  ctx.session.orderPhone = undefined;
  ctx.session.orderQuantity = undefined;

  const variantInfo = orderVariant !== "Standart" ? ` (${orderVariant})` : "";
  const totalPrice = orderPrice * orderQuantity;

  try {
    await ctx.answerCbQuery("Buyurtma tasdiqlandi!");
    await ctx.reply(
      `✅ Buyurtma tasdiqlandi!\n\n📦 Mahsulot: ${orderItem}${variantInfo}\n🔢 Miqdor: ${orderQuantity} ta\n💰 Narx: ${orderPrice.toLocaleString("uz-UZ")} so'm × ${orderQuantity}\n💰 Jami: ${totalPrice.toLocaleString("uz-UZ")} so'm\n👤 Ism: ${orderName}\n📍 Hudud: ${orderDistrict}\n📞 Telefon: ${orderPhone}\n\nTez orada siz bilan bog'lanamiz!`,
    Markup.inlineKeyboard([
      [{ text: "📞 Adminni qo'ng'iroq qilish", url: "tel:+998944557791" }],
      [{ text: "🏠 Asosiy menyu", callback_data: "main_menu" }],
    ])
    );
  } catch (err) {
    console.error("Reply error:", err);
    await ctx.answerCbQuery("Buyurtma tasdiqlandi!");
    await ctx.reply("✅ Buyurtma tasdiqlandi! Tez orada siz bilan bog'lanamiz.");
  }
});

bot.action("cancel_order", async (ctx) => {
  ctx.session.state = undefined;
  ctx.session.orderItem = undefined;
  ctx.session.orderPrice = undefined;
  ctx.session.orderVariant = undefined;
  ctx.session.orderName = undefined;
  ctx.session.orderDistrict = undefined;
  ctx.session.orderPhone = undefined;
  ctx.session.orderQuantity = undefined;

  await ctx.answerCbQuery("Buyurtma bekor qilindi");
  await ctx.reply("❌ Buyurtma bekor qilindi.", mainMenuKeyboard());
});

// Payment callbacks
bot.action(/^pay_(cash|card)$/, handlePaymentCallback);
bot.action("back_to_address", handlePaymentCallback);

// My orders callbacks
bot.action("active_order", handleActiveOrderCallback);
bot.action("order_history", handleOrderHistoryCallback);
bot.action(/^picked_up_(\d+)$/, handlePickedUpCallback);

// About callback
bot.action("about_callback", handleAboutCallback);

// Admin accept/reject from notification buttons
bot.action(/^admin_accept_(\d+)$/, async (ctx) => {
  if (!ctx.from || !isAdmin(ctx.from.id, ctx.from.username)) {
    return ctx.answerCbQuery("Siz admin emassiz!");
  }
  const data = getCallbackData(ctx);
  if (!data) return;
  const orderId = parseInt(data.replace("admin_accept_", ""));
  if (!orderId) return;

  await db.updateOrderStatus(orderId, "accepted");
  const order = await db.getOrderById(orderId);
  if (!order) return ctx.answerCbQuery("Buyurtma topilmadi!");

  // Notify customer
  try {
    await ctx.telegram.sendMessage(
      Number(order.userId),
      `✅ *Buyurtma #${order.orderNumber} qabul qilindi!*\n\nTez orada siz bilan bog'lanamiz.`,
      { parse_mode: "Markdown" }
    );
  } catch {}

  await ctx.answerCbQuery("✅ Buyurtma qabul qilindi!");
  try {
    await ctx.editMessageText(
      `✅ *Buyurtma #${order.orderNumber} qabul qilindi!*\n\nMijozga xabar yuborildi.`,
      { parse_mode: "Markdown" }
    );
  } catch {}
});

bot.action(/^admin_reject_(\d+)$/, async (ctx) => {
  if (!ctx.from || !isAdmin(ctx.from.id, ctx.from.username)) {
    return ctx.answerCbQuery("Siz admin emassiz!");
  }
  const data = getCallbackData(ctx);
  if (!data) return;
  const orderId = parseInt(data.replace("admin_reject_", ""));
  if (!orderId) return;

  await db.updateOrderStatus(orderId, "cancelled");
  const order = await db.getOrderById(orderId);
  if (!order) return ctx.answerCbQuery("Buyurtma topilmadi!");

  // Notify customer
  try {
    await ctx.telegram.sendMessage(
      Number(order.userId),
      `❌ *Buyurtma #${order.orderNumber} bekor qilindi.*`,
      { parse_mode: "Markdown" }
    );
  } catch {}

  await ctx.answerCbQuery("❌ Buyurtma bekor qilindi!");
  try {
    await ctx.editMessageText(
      `❌ *Buyurtma #${order.orderNumber} bekor qilindi.*`,
      { parse_mode: "Markdown" }
    );
  } catch {}
});

// Quantity selection callback
bot.action(/^order_qty_(\d+)$/, async (ctx) => {
  const data = getCallbackData(ctx);
  if (!data) return;
  const qty = parseInt(data.replace("order_qty_", ""));
  if (isNaN(qty) || qty < 1 || qty > 10) return;

  ctx.session.orderQuantity = qty;
  ctx.session.state = "awaiting_order_name";
  await ctx.answerCbQuery(`${qty} ta tanlandi`);
  await ctx.reply(`✅ ${qty} dona tanlandi!\n\nIsmingizni kiriting:`);
});

// Admin callbacks
bot.action("admin_panel", handleAdminPanelCallback);
bot.action("admin_stats", handleStats);
bot.action("admin_orders", handleAdminOrders);
bot.action("admin_menu_mgmt", handleAdminMenuMgmtCallback);
bot.action(/^admin_view_order_(\d+)$/, handleAdminViewOrderCallback);
bot.action(/^admin_status_\d+_/, handleAdminStatusCallback);
bot.action(/^admin_prod_(\d+)$/, handleAdminEditProduct);
bot.action(/^admin_edit_name_(\d+)$/, handleAdminEditNameCallback);
bot.action(/^admin_edit_price_(\d+)$/, handleAdminEditPriceCallback);
bot.action(/^admin_edit_desc_(\d+)$/, handleAdminEditDescCallback);
bot.action(/^admin_delete_prod_(\d+)$/, handleAdminDeleteProductCallback);
bot.action("admin_add_category", handleAdminAddCategoryCallback);
bot.action(/^admin_cat_(\d+)$/, handleAdminCategorySelect);
bot.action(/^admin_set_/, handleAdminSettingCallback);

// ============================================================
// LAUNCH BOT
// ============================================================
async function startBot() {
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    await prisma.$connect();
    console.log("Database connected!");

    await bot.launch();
    console.log("Pizza Ria bot is running!");

    process.once("SIGINT", () => bot.stop("SIGINT"));
    process.once("SIGTERM", () => bot.stop("SIGTERM"));

    await prisma.$disconnect();
  } catch (error) {
    console.error("Failed to start bot:", error);
    process.exit(1);
  }
}

startBot();
