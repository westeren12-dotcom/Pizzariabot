import dotenv from "dotenv";
dotenv.config();
import { Telegraf, session } from "telegraf";
import { BotContext } from "./types";
import { autoRegisterMiddleware, isAdmin } from "./middlewares";

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
  ctx.reply("Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.").catch(() => {});
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
  if (!ctx.from || !isAdmin(ctx.from.id)) return ctx.reply("Siz admin emassiz!");
  await handleStats(ctx);
});

bot.command("bugunigibuyurtmalar", async (ctx) => {
  if (!ctx.from || !isAdmin(ctx.from.id)) return ctx.reply("Siz admin emassiz!");
  await handleAdminActiveOrders(ctx);
});

bot.command("statistika", async (ctx) => {
  if (!ctx.from || !isAdmin(ctx.from.id)) return ctx.reply("Siz admin emassiz!");
  await handleStats(ctx);
});

bot.command("hisobot", async (ctx) => {
  if (!ctx.from || !isAdmin(ctx.from.id)) return ctx.reply("Siz admin emassiz!");
  await handleAdminReport(ctx);
});

bot.command("menyuboshqarish", async (ctx) => {
  if (!ctx.from || !isAdmin(ctx.from.id)) return ctx.reply("Siz admin emassiz!");
  await handleAdminMenuMgmt(ctx);
});

bot.command("narxlar", async (ctx) => {
  if (!ctx.from || !isAdmin(ctx.from.id)) return ctx.reply("Siz admin emassiz!");
  await handleAdminSettings(ctx);
});

bot.command("buyurtmalar", async (ctx) => {
  if (!ctx.from || !isAdmin(ctx.from.id)) return ctx.reply("Siz admin emassiz!");
  await handleAdminOrders(ctx);
});

bot.command("faolbuyurtmalar", async (ctx) => {
  if (!ctx.from || !isAdmin(ctx.from.id)) return ctx.reply("Siz admin emassiz!");
  await handleAdminActiveOrders(ctx);
});

bot.command("mijozlar", async (ctx) => {
  if (!ctx.from || !isAdmin(ctx.from.id)) return ctx.reply("Siz admin emassiz!");
  await handleAdminCustomers(ctx);
});

bot.command("broadcast", async (ctx) => {
  if (!ctx.from || !isAdmin(ctx.from.id)) return ctx.reply("Siz admin emassiz!");
  ctx.session.adminAction = "broadcast";
  await ctx.reply("Xabar matnini kiriting. Bu xabar barcha mijozlarga yuboriladi:", {
    parse_mode: "Markdown",
  });
});

bot.command("sozlamalar", async (ctx) => {
  if (!ctx.from || !isAdmin(ctx.from.id)) return ctx.reply("Siz admin emassiz!");
  await handleAdminSettings(ctx);
});

// ============================================================
// TEXT MESSAGE HANDLERS (ReplyKeyboard)
// ============================================================
bot.on("text", async (ctx) => {
  const text = ctx.message.text;

  // Check if user is in an admin action
  if (isAdmin(ctx.from.id) && ctx.session.adminAction) {
    // Try admin text handlers first
    if (await handleAdminEditText(ctx)) return;
    if (await handleAdminAddCategoryText(ctx)) return;
    if (await handleAdminSettingText(ctx)) return;

    // Broadcast handler
    if (ctx.session.adminAction === "broadcast") {
      ctx.session.adminAction = undefined;
      const { getAllUsers } = await import("./database");
      const users = await getAllUsers();
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

  // Check if user is in order flow
  if (ctx.session.state) {
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
      if (text === "Lokatsiyasiz davom etish") {
        return handleSkipLocation(ctx);
      }
      return ctx.reply("Iltimos, Telegram lokatsiya tugmasini bosing:");
    }
  }

  // Main menu text handlers
  switch (text) {
    case "Menyu":
      return handleMenuText(ctx);
    case "Savatim":
      return handleCartText(ctx);
    case "Mening buyurtmalarim":
      return handleMyOrdersText(ctx);
    case "Yetkazib berish":
      return handleDeliveryText(ctx);
    case "Biz haqimizda":
      return handleAboutText(ctx);
    case "Bog'lanish":
      return handleContactText(ctx);
    case "Asosiy menyu":
      ctx.session.state = undefined;
      return handleStart(ctx);
    // Admin text handlers
    case "Bugungi statistika":
      if (isAdmin(ctx.from.id)) return handleStats(ctx);
      break;
    case "Buyurtmalar":
      if (isAdmin(ctx.from.id)) return handleAdminOrders(ctx);
      break;
    case "Faol buyurtmalar":
      if (isAdmin(ctx.from.id)) return handleAdminActiveOrders(ctx);
      break;
    case "Mijozlar":
      if (isAdmin(ctx.from.id)) return handleAdminCustomers(ctx);
      break;
    case "Menyuni boshqarish":
      if (isAdmin(ctx.from.id)) return handleAdminMenuMgmt(ctx);
      break;
    case "Sozlamalar":
      if (isAdmin(ctx.from.id)) return handleAdminSettings(ctx);
      break;
    case "Mahsulot qo'shish":
      if (isAdmin(ctx.from.id)) return handleAdminAddProduct(ctx);
      break;
    default:
      if (ctx.session.state === "awaiting_location" && text === "Lokatsiyasiz davom etish") {
        return handleSkipLocation(ctx);
      }
      break;
  }
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
// CALLBACK QUERY HANDLERS (InlineKeyboard)
// ============================================================

// Menu callbacks
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

// Payment callbacks
bot.action(/^pay_(cash|card)$/, handlePaymentCallback);
bot.action("back_to_address", handlePaymentCallback);

// Order callbacks
bot.action("confirm_order", handleConfirmOrderCallback);
bot.action("cancel_order", handleCancelOrderCallback);

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
