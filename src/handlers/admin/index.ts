import { BotContext, STATUS_LABELS, STATUS_EMOJI, PAYMENT_LABELS } from "../../types";
import {
  adminPanelKeyboard,
  adminOrderStatusKeyboard,
  adminMenuMgmtKeyboard,
  adminCategoryKeyboard,
  adminProductListKeyboard,
  adminProductDetailKeyboard,
  adminSettingsKeyboard,
  adminOrdersListKeyboard,
  mainMenuKeyboard,
  inlineMainMenu,
} from "../../keyboards";
import { isAdmin } from "../../middlewares";
import * as db from "../../database";
import { Markup } from "telegraf";
import { getCallbackData } from "../../utils/helpers";

// ============================================================
// ADMIN PANEL
// ============================================================
export async function handleAdminPanel(ctx: BotContext) {
  if (!ctx.from || !isAdmin(ctx.from.id)) {
    return ctx.reply("⛔ Siz admin emassiz!");
  }

  const text = `👨‍💼 *Admin panel*\n\nQuyidagi amallardan birini tanlang:`;

  try {
    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
    });
  } catch {
    await ctx.reply(text, {
      parse_mode: "Markdown",
      ...adminPanelKeyboard(),
    });
  }
}

// ============================================================
// TODAY'S STATISTICS
// ============================================================
export async function handleStats(ctx: BotContext) {
  if (!ctx.from || !isAdmin(ctx.from.id)) return;

  const stats = await db.getTodayStats();

  let text = `📊 *BUGUNGI STATISTIKA*\n`;
  text += `\n💰 Bugungi daromad: ${stats.revenue.toLocaleString("uz-UZ")} so'm`;
  text += `\n📦 Buyurtmalar: ${stats.totalOrders} ta`;
  text += `\n✅ Yetkazilgan: ${stats.deliveredOrders} ta`;
  text += `\n🟡 Jarayonda: ${stats.pendingOrders} ta`;
  text += `\n❌ Bekor qilingan: ${stats.cancelledOrders} ta`;

  if (stats.topProducts.length > 0) {
    text += `\n\n🏆 *ENG KO'P SOTILGAN:*\n`;
    stats.topProducts.forEach((p, i) => {
      text += `\n${i + 1}. ${p.name} — ${p.count} ta`;
    });
  }

  const keyboard = Markup.inlineKeyboard([
    [{ text: "🔄 Yangilash", callback_data: "admin_stats" }],
    [{ text: "⬅️ Admin panel", callback_data: "admin_panel" }],
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

// ============================================================
// ALL ORDERS
// ============================================================
export async function handleAdminOrders(ctx: BotContext) {
  if (!ctx.from || !isAdmin(ctx.from.id)) return;

  const orders = await db.getAllOrders();
  const recentOrders = orders.slice(0, 15);

  if (recentOrders.length === 0) {
    return ctx.reply("📦 Hozircha buyurtmalar yo'q.", adminPanelKeyboard());
  }

  let text = `📦 *BUYURTMALAR*\n`;
  for (const order of recentOrders) {
    const statusEmoji = STATUS_EMOJI[order.status as keyof typeof STATUS_EMOJI] || "📋";
    text += `\n${statusEmoji} *#${order.orderNumber}* — ${order.totalPrice.toLocaleString("uz-UZ")} so'm`;
    text += `\n   👤 ${order.user.firstName}`;
    text += `\n   📅 ${new Date(order.createdAt).toLocaleDateString("uz-UZ")}`;
    text += `\n`;
  }

  try {
    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
      ...adminOrdersListKeyboard(recentOrders.map((o) => ({ id: o.id, orderNumber: o.orderNumber, status: o.status }))),
    });
  } catch {
    await ctx.reply(text, {
      parse_mode: "Markdown",
      ...adminOrdersListKeyboard(recentOrders.map((o) => ({ id: o.id, orderNumber: o.orderNumber, status: o.status }))),
    });
  }
}

// ============================================================
// VIEW SINGLE ORDER (Admin)
// ============================================================
export async function handleAdminViewOrderCallback(ctx: BotContext) {
  if (!ctx.from || !isAdmin(ctx.from.id)) return;

  const data = getCallbackData(ctx);
  if (!data) return;

  const orderId = parseInt(data.replace("admin_view_order_", ""));
  const order = await db.getOrderById(orderId);

  if (!order) {
    return ctx.answerCbQuery("Buyurtma topilmadi!");
  }

  const statusLabel = STATUS_LABELS[order.status as keyof typeof STATUS_LABELS] || order.status;

  let text = `📦 *BUYURTMA #${order.orderNumber}*\n\n`;
  text += `👤 Mijoz: ${order.user.firstName} ${order.user.lastName || ""}\n`;
  text += `📞 Telefon: +${order.phone}\n\n`;

  for (const item of order.items) {
    const variantInfo = item.variant.name !== "Standart" ? ` — ${item.variant.name}` : "";
    text += `${item.product.emoji || "🍽"} ${item.product.name}${variantInfo} × ${item.quantity}\n`;
  }

  text += `\n💰 Jami: ${order.totalPrice.toLocaleString("uz-UZ")} so'm`;
  text += `\n📍 Manzil: ${order.address}`;
  text += `\n💳 To'lov: ${PAYMENT_LABELS[order.paymentType] || order.paymentType}`;
  text += `\n📋 Holat: ${statusLabel}`;
  text += `\n📅 Sana: ${new Date(order.createdAt).toLocaleString("uz-UZ")}`;

  if (order.latitude && order.longitude) {
    text += `\n🗺 [Lokatsiya](https://maps.google.com/?q=${order.latitude},${order.longitude})`;
  }

  await ctx.editMessageText(text, {
    parse_mode: "Markdown",
    ...adminOrderStatusKeyboard(orderId, order.status),
  });
}

// ============================================================
// UPDATE ORDER STATUS (Admin)
// ============================================================
export async function handleAdminStatusCallback(ctx: BotContext) {
  if (!ctx.from || !isAdmin(ctx.from.id)) return;

  const data = getCallbackData(ctx);
  if (!data) return;

  const parts = data.replace("admin_status_", "").split("_");
  const orderId = parseInt(parts[0]);
  const newStatus = parts.slice(1).join("_");

  const order = await db.updateOrderStatus(orderId, newStatus);

  const statusLabel = STATUS_LABELS[newStatus as keyof typeof STATUS_LABELS] || newStatus;
  const statusEmoji = STATUS_EMOJI[newStatus as keyof typeof STATUS_EMOJI] || "📋";

  const customerMessage = `${statusEmoji} *Buyurtma #${order.orderNumber}*\n\n${statusLabel}`;

  try {      await ctx.telegram.sendMessage(order.user.telegramId.toString(), customerMessage, {
        parse_mode: "Markdown",
      });
  } catch (err) {
    console.error(`Failed to notify customer ${order.user.telegramId}:`, err);
  }

  await ctx.answerCbQuery(`✅ Status o'zgartirildi: ${statusLabel}`);

  const updatedOrder = await db.getOrderById(orderId);
  if (updatedOrder) {
    const updatedStatusLabel = STATUS_LABELS[updatedOrder.status as keyof typeof STATUS_LABELS] || updatedOrder.status;

    let text = `📦 *BUYURTMA #${updatedOrder.orderNumber}*\n\n`;
    text += `👤 Mijoz: ${updatedOrder.user.firstName} ${updatedOrder.user.lastName || ""}\n`;
    text += `📞 Telefon: +${updatedOrder.phone}\n\n`;

    for (const item of updatedOrder.items) {
      const variantInfo = item.variant.name !== "Standart" ? ` — ${item.variant.name}` : "";
      text += `${item.product.emoji || "🍽"} ${item.product.name}${variantInfo} × ${item.quantity}\n`;
    }

    text += `\n💰 Jami: ${updatedOrder.totalPrice.toLocaleString("uz-UZ")} so'm`;
    text += `\n📍 Manzil: ${updatedOrder.address}`;
    text += `\n💳 To'lov: ${PAYMENT_LABELS[updatedOrder.paymentType] || updatedOrder.paymentType}`;
    text += `\n📋 Holat: ${updatedStatusLabel}`;

    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
      ...adminOrderStatusKeyboard(orderId, updatedOrder.status),
    });
  }
}

// ============================================================
// ACTIVE ORDERS
// ============================================================
export async function handleAdminActiveOrders(ctx: BotContext) {
  if (!ctx.from || !isAdmin(ctx.from.id)) return;

  const orders = await db.getAllOrders();
  const activeOrders = orders.filter((o) =>
    ["pending", "accepted", "preparing", "on_delivery"].includes(o.status)
  );

  if (activeOrders.length === 0) {
    return ctx.reply("🟢 Hozircha faol buyurtmalar yo'q.", adminPanelKeyboard());
  }

  let text = `🟢 *FAOL BUYURTMALAR*\n`;
  for (const order of activeOrders) {
    const statusEmoji = STATUS_EMOJI[order.status as keyof typeof STATUS_EMOJI] || "📋";
    const statusLabel = STATUS_LABELS[order.status as keyof typeof STATUS_LABELS] || order.status;
    text += `\n${statusEmoji} *#${order.orderNumber}* — ${order.totalPrice.toLocaleString("uz-UZ")} so'm`;
    text += `\n   👤 ${order.user.firstName}`;
    text += `\n   ${statusLabel}`;
    text += `\n`;
  }

  try {
    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
      ...adminOrdersListKeyboard(activeOrders.map((o) => ({ id: o.id, orderNumber: o.orderNumber, status: o.status }))),
    });
  } catch {
    await ctx.reply(text, {
      parse_mode: "Markdown",
      ...adminOrdersListKeyboard(activeOrders.map((o) => ({ id: o.id, orderNumber: o.orderNumber, status: o.status }))),
    });
  }
}

// ============================================================
// CUSTOMERS
// ============================================================
export async function handleAdminCustomers(ctx: BotContext) {
  if (!ctx.from || !isAdmin(ctx.from.id)) return;

  const users = await db.getAllUsers();
  const regularUsers = users.filter((u) => !u.isAdmin);

  if (regularUsers.length === 0) {
    return ctx.reply("👥 Hozircha mijozlar yo'q.", adminPanelKeyboard());
  }

  let text = `👥 *MIJOZLAR* (${regularUsers.length} ta)\n`;

  for (const user of regularUsers.slice(0, 20)) {
    const orderCount = await db.getUserOrderCount(Number(user.telegramId));
    const totalSpent = await db.getUserTotalSpent(Number(user.telegramId));

    text += `\n👤 ${user.firstName} ${user.lastName || ""}`;
    if (user.username) text += ` (@${user.username})`;
    text += `\n   🆔 ${user.telegramId}`;
    if (user.phone) text += ` | 📞 +${user.phone}`;
    text += `\n   📦 ${orderCount} ta buyurtma | 💰 ${totalSpent.toLocaleString("uz-UZ")} so'm`;
    text += `\n`;
  }

  if (regularUsers.length > 20) {
    text += `\n_... va yana ${regularUsers.length - 20} ta mijoz_`;
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

// ============================================================
// MENU MANAGEMENT
// ============================================================
export async function handleAdminMenuMgmt(ctx: BotContext) {
  if (!ctx.from || !isAdmin(ctx.from.id)) return;

  const text = `🍕 *Menyuni boshqarish*\n\nAmalni tanlang:`;

  try {
    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
    });
  } catch {
    await ctx.reply(text, {
      parse_mode: "Markdown",
      ...adminMenuMgmtKeyboard(),
    });
  }
}

// ============================================================
// ADD PRODUCT
// ============================================================
export async function handleAdminAddProduct(ctx: BotContext) {
  if (!ctx.from || !isAdmin(ctx.from.id)) return;

  const categories = await db.getActiveCategories();
  const text = `➕ *Mahsulot qo'shish*\n\nKategoriyani tanlang:`;

  try {
    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
      ...adminCategoryKeyboard(categories),
    });
  } catch {
    await ctx.reply(text, {
      parse_mode: "Markdown",
      ...adminCategoryKeyboard(categories),
    });
  }
}

export async function handleAdminCategorySelect(ctx: BotContext) {
  if (!ctx.from || !isAdmin(ctx.from.id)) return;

  const data = getCallbackData(ctx);
  if (!data) return;

  const catId = parseInt(data.replace("admin_cat_", ""));
  ctx.session.adminAction = "add_product_name";
  ctx.session.editingCategoryId = catId;

  const category = await db.getCategoryById(catId);
  await ctx.reply(`➕ *${category?.emoji || ""} ${category?.name || ""}* kategoriyasiga mahsulot qo'shish\n\n📝 Mahsulot nomini kiriting:`, {
    parse_mode: "Markdown",
  });
}

export async function handleAdminEditProduct(ctx: BotContext) {
  if (!ctx.from || !isAdmin(ctx.from.id)) return;

  const data = getCallbackData(ctx);
  if (!data) return;

  const prodId = parseInt(data.replace("admin_prod_", ""));
  const product = await db.getProductById(prodId);

  if (!product) return ctx.answerCbQuery("Mahsulot topilmadi!");

  let text = `✏️ *${product.emoji || ""} ${product.name}*\n\n`;
  text += `📝 Tavsif: ${product.description || "Yo'q"}\n`;
  text += `📂 Kategoriya: ${product.category.name}\n\n`;
  text += `Variantlar:\n`;

  for (const variant of product.variants) {
    text += `  • ${variant.name} — ${variant.price.toLocaleString("uz-UZ")} so'm\n`;
  }

  await ctx.editMessageText(text, {
    parse_mode: "Markdown",
    ...adminProductDetailKeyboard(prodId),
  });
}

// ============================================================
// EDIT PRODUCT ACTIONS
// ============================================================
export async function handleAdminEditNameCallback(ctx: BotContext) {
  if (!ctx.from || !isAdmin(ctx.from.id)) return;

  const data = getCallbackData(ctx);
  if (!data) return;

  const prodId = parseInt(data.replace("admin_edit_name_", ""));
  ctx.session.adminAction = "edit_product_name";
  ctx.session.editingProductId = prodId;

  const product = await db.getProductById(prodId);
  await ctx.reply(`✏️ *${product?.name || ""}* nomini o'zgartirish\n\n📝 Yangi nomni kiriting:`, {
    parse_mode: "Markdown",
  });
}

export async function handleAdminEditPriceCallback(ctx: BotContext) {
  if (!ctx.from || !isAdmin(ctx.from.id)) return;

  const data = getCallbackData(ctx);
  if (!data) return;

  const prodId = parseInt(data.replace("admin_edit_price_", ""));
  const product = await db.getProductById(prodId);
  if (!product) return;

  ctx.session.adminAction = "edit_product_price";
  ctx.session.editingProductId = prodId;

  let text = `💰 *${product.name}* narxini o'zgartirish\n\nVariantlar:\n`;
  for (const v of product.variants) {
    text += `  ${v.id}. ${v.name} — ${v.price.toLocaleString("uz-UZ")} so'm\n`;
  }
  text += `\n📝 Variant ID va yangi narxni kiriting (masalan: 1 55000):`;

  await ctx.reply(text, { parse_mode: "Markdown" });
}

export async function handleAdminEditDescCallback(ctx: BotContext) {
  if (!ctx.from || !isAdmin(ctx.from.id)) return;

  const data = getCallbackData(ctx);
  if (!data) return;

  const prodId = parseInt(data.replace("admin_edit_desc_", ""));
  ctx.session.adminAction = "edit_product_desc";
  ctx.session.editingProductId = prodId;

  const product = await db.getProductById(prodId);
  await ctx.reply(`📝 *${product?.name || ""}* tavsifini o'zgartirish\n\nYangi tavsifni kiriting:`, {
    parse_mode: "Markdown",
  });
}

export async function handleAdminDeleteProductCallback(ctx: BotContext) {
  if (!ctx.from || !isAdmin(ctx.from.id)) return;

  const data = getCallbackData(ctx);
  if (!data) return;

  const prodId = parseInt(data.replace("admin_delete_prod_", ""));

  try {
    await db.deleteProduct(prodId);
    await ctx.answerCbQuery("✅ Mahsulot o'chirildi!");
    const categories = await db.getActiveCategories();
    await ctx.editMessageText("✅ Mahsulot o'chirildi.", {
      ...adminCategoryKeyboard(categories),
    });
  } catch (err) {
    await ctx.answerCbQuery("❌ O'chirishda xatolik!");
  }
}

// ============================================================
// EDIT PRODUCT TEXT HANDLER
// ============================================================
export async function handleAdminEditText(ctx: BotContext) {
  if (!ctx.from || !ctx.message || !("text" in ctx.message)) return false;
  if (!isAdmin(ctx.from.id)) return false;

  const text = ctx.message.text;
  const action = ctx.session.adminAction;

  if (!action) return false;

  if (text === "⬅️ Orqaga") {
    ctx.session.adminAction = undefined;
    ctx.session.editingProductId = undefined;
    ctx.session.editingCategoryId = undefined;
    await ctx.reply("👨‍💼 Admin panel:", adminPanelKeyboard());
    return true;
  }

  if (action === "add_product_name") {
    const catId = ctx.session.editingCategoryId;
    if (!catId) return false;

    const category = await db.getCategoryById(catId);
    const emoji = category?.emoji || "🍽";
    const product = await db.createProduct({
      name: text,
      emoji,
      categoryId: catId,
    });

    ctx.session.adminAction = "add_product_variant_price";
    ctx.session.editingProductId = product.id;

    await ctx.reply(
      `✅ *${text}* yaratildi!\n\n💰 Variant narxini kiriting (masalan: 35000):`,
      { parse_mode: "Markdown" }
    );
    return true;
  }

  if (action === "add_product_variant_price") {
    const prodId = ctx.session.editingProductId;
    if (!prodId) return false;

    const price = parseInt(text.replace(/\D/g, ""));
    if (isNaN(price) || price <= 0) {
      await ctx.reply("❌ Noto'g'ri narx. Qaytadan kiriting:");
      return true;
    }

    await db.createVariant(prodId, "Standart", price);

    ctx.session.adminAction = undefined;
    ctx.session.editingProductId = undefined;

    await ctx.reply(`✅ Variant qo'shildi: Standart — ${price.toLocaleString("uz-UZ")} so'm`, adminPanelKeyboard());
    return true;
  }

  if (action === "edit_product_name") {
    const prodId = ctx.session.editingProductId;
    if (!prodId) return false;

    await db.updateProduct(prodId, { name: text });
    ctx.session.adminAction = undefined;
    ctx.session.editingProductId = undefined;

    await ctx.reply(`✅ Nom o'zgartirildi: ${text}`, adminPanelKeyboard());
    return true;
  }

  if (action === "edit_product_desc") {
    const prodId = ctx.session.editingProductId;
    if (!prodId) return false;

    await db.updateProduct(prodId, { description: text });
    ctx.session.adminAction = undefined;
    ctx.session.editingProductId = undefined;

    await ctx.reply(`✅ Tavsif o'zgartirildi.`, adminPanelKeyboard());
    return true;
  }

  if (action === "edit_product_price") {
    const prodId = ctx.session.editingProductId;
    if (!prodId) return false;

    const parts = text.split(" ");
    if (parts.length < 2) {
      await ctx.reply("❌ Noto'g'ri format. Variant ID va narxni kiriting (masalan: 1 55000):");
      return true;
    }

    const variantId = parseInt(parts[0]);
    const price = parseInt(parts[1]?.replace(/\D/g, ""));

    if (isNaN(variantId) || isNaN(price) || price <= 0) {
      await ctx.reply("❌ Noto'g'ri format. Qaytadan kiriting:");
      return true;
    }

    await db.updateVariant(variantId, { price });
    ctx.session.adminAction = undefined;
    ctx.session.editingProductId = undefined;

    await ctx.reply(`✅ Narx o'zgartirildi: ${price.toLocaleString("uz-UZ")} so'm`, adminPanelKeyboard());
    return true;
  }

  return false;
}

// ============================================================
// CATEGORY MANAGEMENT
// ============================================================
export async function handleAdminCatMgmtCallback(ctx: BotContext) {
  if (!ctx.from || !isAdmin(ctx.from.id)) return;

  const categories = await db.getActiveCategories();

  let text = `📂 *Kategoriyalar*\n`;
  for (const cat of categories) {
    text += `\n${cat.emoji} ${cat.name}`;
  }
  text += `\n\n➕ Yangi kategoriya qo'shish uchun tugmani bosing:`;

  try {
    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
      ...adminCategoryKeyboard(categories),
    });
  } catch {
    await ctx.reply(text, {
      parse_mode: "Markdown",
      ...adminCategoryKeyboard(categories),
    });
  }
}

export async function handleAdminAddCategoryCallback(ctx: BotContext) {
  if (!ctx.from || !isAdmin(ctx.from.id)) return;

  ctx.session.adminAction = "add_category";

  await ctx.reply(
    `📂 *Yangi kategoriya qo'shish*\n\nFormat: Emoji Nom\nMasalan: 🍕 Pizza`,
    { parse_mode: "Markdown" }
  );
}

export async function handleAdminAddCategoryText(ctx: BotContext) {
  if (!ctx.from || !ctx.message || !("text" in ctx.message)) return false;
  if (!isAdmin(ctx.from.id)) return false;

  const text = ctx.message.text;
  if (ctx.session.adminAction === "add_category") {
    const match = text.match(/^(\S+)\s+(.+)$/);
    if (!match) {
      await ctx.reply("❌ Noto'g'ri format. Emoji Nom kiriting (masalan: 🍕 Pizza):");
      return true;
    }

    const emoji = match[1];
    const name = match[2];

    await db.createCategory(name, emoji);
    ctx.session.adminAction = undefined;

    await ctx.reply(`✅ Kategoriya yaratildi: ${emoji} ${name}`, adminPanelKeyboard());
    return true;
  }

  return false;
}

// ============================================================
// SETTINGS
// ============================================================
export async function handleAdminSettings(ctx: BotContext) {
  if (!ctx.from || !isAdmin(ctx.from.id)) return;

  const text = `⚙️ *Sozlamalar*\n\nSozlamani tanlang:`;

  try {
    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
      ...adminSettingsKeyboard(),
    });
  } catch {
    await ctx.reply(text, {
      parse_mode: "Markdown",
      ...adminSettingsKeyboard(),
    });
  }
}

export async function handleAdminSettingCallback(ctx: BotContext) {
  if (!ctx.from || !isAdmin(ctx.from.id)) return;

  const data = getCallbackData(ctx);
  if (!data) return;

  const settingMap: Record<string, { key: string; label: string }> = {
    admin_set_delivery_price: { key: "delivery_price", label: "Yetkazib berish narxi" },
    admin_set_address: { key: "about_address", label: "Manzil" },
    admin_set_phone: { key: "about_phone", label: "Telefon" },
    admin_set_instagram: { key: "about_instagram", label: "Instagram username" },
    admin_set_hours: { key: "about_work_hours", label: "Ish vaqti" },
  };

  const setting = settingMap[data];
  if (!setting) return;

  const currentValue = await db.getSetting(setting.key);
  ctx.session.adminAction = `setting_${setting.key}`;

  await ctx.reply(
    `⚙️ *${setting.label}*\n\nHozirgi qiymat: ${currentValue || "Yo'q"}\n\nYangi qiymatni kiriting:`,
    { parse_mode: "Markdown" }
  );
}

export async function handleAdminSettingText(ctx: BotContext) {
  if (!ctx.from || !ctx.message || !("text" in ctx.message)) return false;
  if (!isAdmin(ctx.from.id)) return false;

  const action = ctx.session.adminAction;
  if (!action || !action.startsWith("setting_")) return false;

  const key = action.replace("setting_", "");
  const value = ctx.message.text;

  await db.setSetting(key, value);
  ctx.session.adminAction = undefined;

  await ctx.reply(`✅ Sozlama yangilandi: ${key} = ${value}`, adminPanelKeyboard());
  return true;
}

// ============================================================
// ADMIN MAIN MENU CALLBACKS
// ============================================================
export async function handleAdminPanelCallback(ctx: BotContext) {
  if (!ctx.from || !isAdmin(ctx.from.id)) return;

  const text = `👨‍💼 *Admin panel*\n\nQuyidagi amallardan birini tanlang:`;

  try {
    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
    });
  } catch {
    await ctx.reply(text, {
      parse_mode: "Markdown",
      ...adminPanelKeyboard(),
    });
  }
}

export async function handleAdminMenuMgmtCallback(ctx: BotContext) {
  if (!ctx.from || !isAdmin(ctx.from.id)) return;

  const text = `🍕 *Menyuni boshqarish*\n\nAmalni tanlang:`;

  try {
    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
    });
  } catch {
    await ctx.reply(text, {
      parse_mode: "Markdown",
      ...adminMenuMgmtKeyboard(),
    });
  }
}

// ============================================================
// MONTHLY REPORT
// ============================================================
export async function handleAdminReport(ctx: BotContext) {
  if (!ctx.from || !isAdmin(ctx.from.id)) return;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const orders = await db.getAllOrders();
  const monthOrders = orders.filter((o) => {
    const d = new Date(o.createdAt);
    return d >= startOfMonth && d <= endOfMonth;
  });

  const delivered = monthOrders.filter((o) => o.status === "delivered");
  const cancelled = monthOrders.filter((o) => o.status === "cancelled");
  const totalRevenue = delivered.reduce((sum, o) => sum + o.totalPrice, 0);

  let text = `OYLIK HISOBOT\n`;
  text += `Sana: ${now.toLocaleString("uz-UZ", { month: "long", year: "numeric" })}\n\n`;
  text += `Jami buyurtmalar: ${monthOrders.length} ta\n`;
  text += `Yetkazilgan: ${delivered.length} ta\n`;
  text += `Bekor qilingan: ${cancelled.length} ta\n`;
  text += `Jami daromad: ${totalRevenue.toLocaleString("uz-UZ")} so'm\n`;

  const productCounts: Record<string, number> = {};
  for (const order of delivered) {
    const fullOrder = await db.getOrderById(order.id);
    if (fullOrder) {
      for (const item of fullOrder.items) {
        const name = item.product.name;
        productCounts[name] = (productCounts[name] || 0) + item.quantity;
      }
    }
  }

  const sorted = Object.entries(productCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (sorted.length > 0) {
    text += `\nENG KOP SOTILGAN:\n`;
    sorted.forEach(([name, count], i) => {
      text += `${i + 1}. ${name} — ${count} ta\n`;
    });
  }

  await ctx.reply(text);
}
