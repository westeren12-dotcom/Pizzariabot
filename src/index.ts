import dotenv from "dotenv";
dotenv.config();
import { Telegraf, session } from "telegraf";
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
} from "./keyboards";

import * as db from "./database";
import { getCallbackData } from "./utils/helpers";

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
// ADMIN COMMANDS
// ============================================================
bot.command("admin", handleAdmin);

bot.command("bugungifoyda", async (ctx) => {
  if (!ctx.from || !isAdmin(ctx.from.id, ctx.from.username)) return ctx.reply("Siz admin emassiz!");
  await handleStats(ctx);
});

bot.command("bugunigibuyurtmalar", async (ctx) => {
  if (!ctx.from || !isAdmin(ctx.from.id, ctx.from.username)) return ctx.reply("Siz admin emassiz!");
  await handleAdminActiveOrders(ctx);
});

bot.command("statistika", async (ctx) => {
  if (!ctx.from || !isAdmin(ctx.from.id, ctx.from.username)) return ctx.reply("Siz admin emassiz!");
  await handleStats(ctx);
});

bot.command("hisobot", async (ctx) => {
  if (!ctx.from || !isAdmin(ctx.from.id, ctx.from.username)) return ctx.reply("Siz admin emassiz!");
  await handleAdminReport(ctx);
});

bot.command("menyuboshqarish", async (ctx) => {
  if (!ctx.from || !isAdmin(ctx.from.id, ctx.from.username)) return ctx.reply("Siz admin emassiz!");
  await handleAdminMenuMgmt(ctx);
});

bot.command("narxlar", async (ctx) => {
  if (!ctx.from || !isAdmin(ctx.from.id, ctx.from.username)) return ctx.reply("Siz admin emassiz!");
  await handleAdminSettings(ctx);
});

bot.command("buyurtmalar", async (ctx) => {
  if (!ctx.from || !isAdmin(ctx.from.id, ctx.from.username)) return ctx.reply("Siz admin emassiz!");
  await handleAdminOrders(ctx);
});

bot.command("faolbuyurtmalar", async (ctx) => {
  if (!ctx.from || !isAdmin(ctx.from.id, ctx.from.username)) return ctx.reply("Siz admin emassiz!");
  await handleAdminActiveOrders(ctx);
});

bot.command("mijozlar", async (ctx) => {
  if (!ctx.from || !isAdmin(ctx.from.id, ctx.from.username)) return ctx.reply("Siz admin emassiz!");
  await handleAdminCustomers(ctx);
});

bot.command("broadcast", async (ctx) => {
  if (!ctx.from || !isAdmin(ctx.from.id, ctx.from.username)) return ctx.reply("Siz admin emassiz!");
  ctx.session.adminAction = "broadcast";
  await ctx.reply("Xabar matnini kiriting. Bu xabar barcha mijozlarga yuboriladi:");
});

bot.command("sozlamalar", async (ctx) => {
  if (!ctx.from || !isAdmin(ctx.from.id, ctx.from.username)) return ctx.reply("Siz admin emassiz!");
  await handleAdminSettings(ctx);
});

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

  // ============================
  // ADMIN TEXT ACTIONS
  // ============================
  if (isAdmin(ctx.from.id, ctx.from.username) && ctx.session.adminAction) {
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
    ctx.session.orderItem = text;
    ctx.session.state = "awaiting_order_name";
    await ctx.reply("Ismingizni kiriting:");
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

    // Show summary
    const deliveryPriceSetting = await db.getSetting("delivery_price");
    const deliveryPrice = parseInt(deliveryPriceSetting || "0");

    let summary = `📦 *Buyurtma tasdiqlash*\n\n`;
    summary += `🍕 *Menyu:* ${ctx.session.orderItem}\n`;
    summary += `👤 *Ism:* ${ctx.session.orderName}\n`;
    summary += `📍 *Hudud:* ${ctx.session.orderDistrict}\n`;
    summary += `📞 *Telefon:* ${ctx.session.orderPhone}\n`;

    if (deliveryPrice > 0) {
      summary += `\n🚚 *Yetkazib berish:* ${deliveryPrice.toLocaleString("uz-UZ")} so'm`;
    } else {
      summary += `\n🚚 *Yetkazib berish:* Bepul`;
    }

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
  // MAIN MENU BUTTONS
  // ============================
  if (text.includes("Menyu") && !text.includes("boshqarish")) {
    return handleMenuText(ctx);
  }
  if (text.includes("Savatim")) {
    return handleCartText(ctx);
  }
  if (text.includes("buyurtmalarim")) {
    return handleMyOrdersText(ctx);
  }
  if (text.includes("Yetkazib berish")) {
    return handleDeliveryText(ctx);
  }
  if (text.includes("Biz haqimizda")) {
    return handleAboutText(ctx);
  }
  if (text.includes("Bog'lanish")) {
    return handleContactText(ctx);
  }
  if (text.includes("Asosiy menyu")) {
    ctx.session.state = undefined;
    return handleStart(ctx);
  }

  // ============================
  // ADMIN BUTTONS
  // ============================
  if (text.includes("Bugungi statistika")) {
    if (isAdmin(ctx.from.id, ctx.from.username)) return handleStats(ctx);
  }
  if (text.includes("Buyurtmalar") && !text.includes("Faol")) {
    if (isAdmin(ctx.from.id, ctx.from.username)) return handleAdminOrders(ctx);
  }
  if (text.includes("Faol buyurtmalar")) {
    if (isAdmin(ctx.from.id, ctx.from.username)) return handleAdminActiveOrders(ctx);
  }
  if (text.includes("Mijozlar")) {
    if (isAdmin(ctx.from.id, ctx.from.username)) return handleAdminCustomers(ctx);
  }
  if (text.includes("Menyuni boshqarish")) {
    if (isAdmin(ctx.from.id, ctx.from.username)) return handleAdminMenuMgmt(ctx);
  }
  if (text.includes("Sozlamalar")) {
    if (isAdmin(ctx.from.id, ctx.from.username)) return handleAdminSettings(ctx);
  }
  if (text.includes("Mahsulot qo'shish")) {
    if (isAdmin(ctx.from.id, ctx.from.username)) return handleAdminAddProduct(ctx);
  }
});

// ============================================================
// CALLBACK QUERY HANDLERS (InlineKeyboard)
// ============================================================

// Menu callbacks
bot.action(/^order_item_/, handleOrderItemCallback);
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
    } else {
      // Text-based order without cart
      order = {
        orderNumber,
        totalPrice: 0,
        items: [],
        user: { firstName: ctx.from.first_name, lastName: ctx.from.last_name },
      };
    }

    // Notify admins from database
    const adminUsers = await db.getAdminUsers();
    const adminIds = adminUsers.map((u) => Number(u.telegramId));

    const envAdminIds = (process.env.ADMIN_IDS || "")
      .split(",")
      .map((id) => parseInt(id.trim()))
      .filter(Boolean);

    const allAdminIds = [...new Set([...adminIds, ...envAdminIds])];

    console.log("Simple order - Admin IDs:", allAdminIds);

    let itemsText = "";
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        const variantInfo = item.variant?.name !== "Standart" ? ` — ${item.variant?.name}` : "";
        itemsText += `  ${item.product?.emoji || "🍽"} ${item.product?.name || ""}${variantInfo} × ${item.quantity}\n`;
      }
    } else {
      itemsText = `  🍕 ${orderItem}\n`;
    }

    const adminMessage = `📦 YANGI BUYURTMA #${order.orderNumber}\n\n👤 Mijoz: ${orderName}\n📞 Telefon: +${orderPhone}\n📍 Hudud: ${orderDistrict}\n${itemsText}\n💰 Jami: ${totalPrice > 0 ? totalPrice.toLocaleString("uz-UZ") + " so'm" : "Narx ko'rsatilmagan"}\n💳 To'lov: Naqd`;

    for (const adminId of allAdminIds) {
      try {
        await ctx.telegram.sendMessage(adminId, adminMessage);
        console.log(`Admin notified: ${adminId}`);
      } catch (err) {
        console.error(`Failed to notify admin ${adminId}:`, err);
      }
    }
  } catch (error) {
    console.error("Order error:", error);
  }

  // Clear session
  ctx.session.state = undefined;
  ctx.session.orderItem = undefined;
  ctx.session.orderName = undefined;
  ctx.session.orderDistrict = undefined;
  ctx.session.orderPhone = undefined;

  await ctx.answerCbQuery("Buyurtma tasdiqlandi!");
  await ctx.reply(
    `✅ Buyurtma tasdiqlandi!\n\n📦 Mahsulot: ${orderItem}\n👤 Ism: ${orderName}\n📍 Hudud: ${orderDistrict}\n📞 Telefon: ${orderPhone}\n\nTez orada siz bilan bog'lanamiz!`,
    mainMenuKeyboard()
  );
});

bot.action("cancel_order", async (ctx) => {
  ctx.session.state = undefined;
  ctx.session.orderItem = undefined;
  ctx.session.orderName = undefined;
  ctx.session.orderDistrict = undefined;
  ctx.session.orderPhone = undefined;

  await ctx.answerCbQuery("Buyurtma bekor qilindi");
  await ctx.reply("❌ Buyurtma bekor qilindi.", mainMenuKeyboard());
});

// Payment callbacks
bot.action(/^pay_(cash|card)$/, handlePaymentCallback);
bot.action("back_to_address", handlePaymentCallback);

// My orders callbacks
bot.action("active_order", handleActiveOrderCallback);
bot.action("order_history", handleOrderHistoryCallback);

// About callback
bot.action("about_callback", handleAboutCallback);

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
