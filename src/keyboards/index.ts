import { Markup } from "telegraf";
import { InlineKeyboardButton } from "telegraf/types";

// ============================================================
// MAIN MENU KEYBOARD (ReplyKeyboard - column layout)
// ============================================================
export function mainMenuKeyboard() {
  return Markup.keyboard([
    [{ text: "🍕 Menyu" }],
    [{ text: "🛒 Savatim" }],
    [{ text: "📦 Mening buyurtmalarim" }],
    [{ text: "📍 Yetkazib berish" }],
    [{ text: "ℹ️ Biz haqimizda" }],
    [{ text: "☎️ Bog'lanish" }],
  ]).resize();
}

// ============================================================
// BACK TO MAIN MENU BUTTON
// ============================================================
export function backToMainKeyboard() {
  return Markup.keyboard([[{ text: "🏠 Asosiy menyu" }]]).resize();
}

// ============================================================
// DISTRICT SELECTION (InlineKeyboard - column)
// ============================================================
export function districtKeyboard() {
  return Markup.inlineKeyboard([
    [{ text: "📍 Chinobod hududiga", callback_data: "district_chinobod" }],
    [{ text: "📍 Chinoboddan tashqariga", callback_data: "district_tashqari" }],
  ]);
}

// ============================================================
// ORDER CONFIRMATION (InlineKeyboard - column)
// ============================================================
export function orderConfirmKeyboard() {
  return Markup.inlineKeyboard([
    [{ text: "✅ Tasdiqlash", callback_data: "confirm_order" }],
    [{ text: "❌ Bekor qilish", callback_data: "cancel_order" }],
  ]);
}

// ============================================================
// CATEGORY LIST (InlineKeyboard - column)
// ============================================================
export function categoryListKeyboard(categories: { id: number; name: string; emoji: string }[]) {
  const buttons: InlineKeyboardButton[][] = categories.map((cat) => [
    { text: `${cat.emoji} ${cat.name}`, callback_data: `cat_${cat.id}` },
  ]);
  buttons.push([{ text: "🏠 Asosiy menyu", callback_data: "main_menu" }]);
  return Markup.inlineKeyboard(buttons);
}

// ============================================================
// PRODUCTS IN CATEGORY (InlineKeyboard - column)
// ============================================================
export function productListKeyboard(products: { id: number; name: string; emoji?: string | null }[], categoryId: number) {
  const buttons: InlineKeyboardButton[][] = products.map((p) => [
    { text: `${p.emoji || "🍽"} ${p.name}`, callback_data: `prod_${p.id}` },
  ]);
  buttons.push([{ text: "⬅️ Orqaga", callback_data: "menu_back" }]);
  buttons.push([{ text: "🏠 Asosiy menyu", callback_data: "main_menu" }]);
  return Markup.inlineKeyboard(buttons);
}

// ============================================================
// PRODUCT DETAIL (InlineKeyboard - column)
// ============================================================
export function productDetailKeyboard(productId: number, hasVariants: boolean) {
  const buttons: InlineKeyboardButton[][] = [];

  if (hasVariants) {
    buttons.push([{ text: "➕ Savatga qo'shish", callback_data: `add_cart_${productId}` }]);
  }
  buttons.push([{ text: "🛒 Savatni ko'rish", callback_data: "view_cart" }]);
  buttons.push([{ text: "⬅️ Orqaga", callback_data: "menu_back" }]);
  buttons.push([{ text: "🏠 Asosiy menyu", callback_data: "main_menu" }]);

  return Markup.inlineKeyboard(buttons);
}

// ============================================================
// VARIANT SELECTION (InlineKeyboard - column)
// ============================================================
export function variantSelectionKeyboard(productId: number, variants: { id: number; name: string; price: number }[]) {
  const buttons: InlineKeyboardButton[][] = variants.map((v) => [
    { text: `${v.name} — ${v.price.toLocaleString("uz-UZ")} so'm`, callback_data: `variant_${productId}_${v.id}` },
  ]);
  buttons.push([{ text: "⬅️ Orqaga", callback_data: `prod_${productId}` }]);
  return Markup.inlineKeyboard(buttons);
}

// ============================================================
// QUANTITY SELECTION (InlineKeyboard - column)
// ============================================================
export function quantityKeyboard(productId: number, variantId: number, current: number) {
  return Markup.inlineKeyboard([
    [
      { text: "➖", callback_data: `qty_minus_${productId}_${variantId}_${current}` },
      { text: `${current}`, callback_data: `qty_show_${current}` },
      { text: "➕", callback_data: `qty_plus_${productId}_${variantId}_${current}` },
    ],
    [{ text: "➕ Savatga qo'shish", callback_data: `confirm_add_${productId}_${variantId}_${current}` }],
    [{ text: "⬅️ Orqaga", callback_data: `prod_${productId}` }],
  ]);
}

// ============================================================
// CART VIEW (InlineKeyboard - column)
// ============================================================
export function cartKeyboard(hasItems: boolean) {
  const buttons: InlineKeyboardButton[][] = [];
  if (hasItems) {
    buttons.push([{ text: "📝 Buyurtma berish", callback_data: "start_order" }]);
    buttons.push([{ text: "➕ Mahsulot qo'shish", callback_data: "menu_back" }]);
    buttons.push([{ text: "🗑 Savatni tozalash", callback_data: "clear_cart" }]);
  }
  buttons.push([{ text: "⬅️ Menyuga qaytish", callback_data: "main_menu" }]);
  return Markup.inlineKeyboard(buttons);
}

// ============================================================
// ORDER FLOW - CONTACT REQUEST (ReplyKeyboard)
// ============================================================
export function contactRequestKeyboard() {
  return Markup.keyboard([
    [{ text: "📱 Telefon raqamni yuborish", request_contact: true }],
    [{ text: "⬅️ Orqaga" }],
  ])
    .resize()
    .oneTime();
}

// ============================================================
// ORDER FLOW - LOCATION REQUEST (ReplyKeyboard)
// ============================================================
export function locationRequestKeyboard() {
  return Markup.keyboard([
    [{ text: "🗺 Lokatsiyani yuborish", request_location: true }],
    [{ text: "⬅️ Orqaga" }],
  ])
    .resize()
    .oneTime();
}

// ============================================================
// ORDER FLOW - PAYMENT SELECTION (InlineKeyboard - column)
// ============================================================
export function paymentKeyboard() {
  return Markup.inlineKeyboard([
    [{ text: "💵 Naqd", callback_data: "pay_cash" }],
    [{ text: "💳 Karta", callback_data: "pay_card" }],
    [{ text: "⬅️ Orqaga", callback_data: "back_to_address" }],
  ]);
}

// ============================================================
// MY ORDERS (InlineKeyboard - column)
// ============================================================
export function myOrdersKeyboard() {
  return Markup.inlineKeyboard([
    [{ text: "📦 Faol buyurtma", callback_data: "active_order" }],
    [{ text: "📜 Buyurtmalar tarixi", callback_data: "order_history" }],
    [{ text: "🏠 Asosiy menyu", callback_data: "main_menu" }],
  ]);
}

// ============================================================
// ADMIN PANEL (ReplyKeyboard - column)
// ============================================================
export function adminPanelKeyboard() {
  return Markup.keyboard([
    [{ text: "📊 Bugungi statistika" }],
    [{ text: "📦 Buyurtmalar" }],
    [{ text: "🟢 Faol buyurtmalar" }],
    [{ text: "👥 Mijozlar" }],
    [{ text: "🍕 Menyuni boshqarish" }],
    [{ text: "⚙️ Sozlamalar" }],
    [{ text: "🏠 Asosiy menyu" }],
  ]).resize();
}

// ============================================================
// ADMIN ORDER STATUS (InlineKeyboard - column)
// ============================================================
export function adminOrderStatusKeyboard(orderId: number, currentStatus: string) {
  const statuses = [
    { status: "accepted", label: "✅ Qabul qilish" },
    { status: "preparing", label: "🍳 Tayyorlanmoqda" },
    { status: "on_delivery", label: "🛵 Kuryerga berildi" },
    { status: "delivered", label: "✅ Yetkazildi" },
    { status: "cancelled", label: "❌ Bekor qilish" },
  ];

  const buttons: InlineKeyboardButton[][] = statuses
    .filter((s) => s.status !== currentStatus)
    .map((s) => [{ text: s.label, callback_data: `admin_status_${orderId}_${s.status}` }]);

  buttons.push([{ text: "⬅️ Orqaga", callback_data: "admin_orders" }]);
  return Markup.inlineKeyboard(buttons);
}

// ============================================================
// ADMIN MENU MANAGEMENT (ReplyKeyboard - column)
// ============================================================
export function adminMenuMgmtKeyboard() {
  return Markup.keyboard([
    [{ text: "➕ Mahsulot qo'shish" }],
    [{ text: "✏️ Mahsulotni o'zgartirish" }],
    [{ text: "🗑 Mahsulotni o'chirish" }],
    [{ text: "💰 Narxni o'zgartirish" }],
    [{ text: "📂 Kategoriya boshqarish" }],
    [{ text: "⬅️ Orqaga" }],
  ]).resize();
}

// ============================================================
// ADMIN CATEGORY MANAGEMENT (InlineKeyboard - column)
// ============================================================
export function adminCategoryKeyboard(categories: { id: number; name: string; emoji: string }[]) {
  const buttons: InlineKeyboardButton[][] = categories.map((c) => [
    { text: `${c.emoji} ${c.name}`, callback_data: `admin_cat_${c.id}` },
  ]);
  buttons.push([{ text: "➕ Yangi kategoriya", callback_data: "admin_add_category" }]);
  buttons.push([{ text: "⬅️ Orqaga", callback_data: "admin_menu_mgmt" }]);
  return Markup.inlineKeyboard(buttons);
}

// ============================================================
// ADMIN PRODUCT LIST (InlineKeyboard - column)
// ============================================================
export function adminProductListKeyboard(products: { id: number; name: string }[]) {
  const buttons: InlineKeyboardButton[][] = products.map((p) => [
    { text: p.name, callback_data: `admin_prod_${p.id}` },
  ]);
  buttons.push([{ text: "⬅️ Orqaga", callback_data: "admin_menu_mgmt" }]);
  return Markup.inlineKeyboard(buttons);
}

// ============================================================
// ADMIN PRODUCT DETAIL (InlineKeyboard - column)
// ============================================================
export function adminProductDetailKeyboard(productId: number) {
  return Markup.inlineKeyboard([
    [{ text: "✏️ Nomini o'zgartirish", callback_data: `admin_edit_name_${productId}` }],
    [{ text: "💰 Narxni o'zgartirish", callback_data: `admin_edit_price_${productId}` }],
    [{ text: "📝 Tavsifni o'zgartirish", callback_data: `admin_edit_desc_${productId}` }],
    [{ text: "🗑 O'chirish", callback_data: `admin_delete_prod_${productId}` }],
    [{ text: "⬅️ Orqaga", callback_data: "admin_menu_mgmt" }],
  ]);
}

// ============================================================
// ADMIN SETTINGS (InlineKeyboard - column)
// ============================================================
export function adminSettingsKeyboard() {
  return Markup.inlineKeyboard([
    [{ text: "🚚 Yetkazib berish narxi", callback_data: "admin_set_delivery_price" }],
    [{ text: "📍 Manzil", callback_data: "admin_set_address" }],
    [{ text: "☎️ Telefon", callback_data: "admin_set_phone" }],
    [{ text: "📸 Instagram", callback_data: "admin_set_instagram" }],
    [{ text: "🕐 Ish vaqti", callback_data: "admin_set_hours" }],
    [{ text: "⬅️ Orqaga", callback_data: "admin_panel" }],
  ]);
}

// ============================================================
// ADMIN ORDERS LIST (InlineKeyboard - column)
// ============================================================
export function adminOrdersListKeyboard(orders: { id: number; orderNumber: number; status: string }[]) {
  const buttons: InlineKeyboardButton[][] = orders.map((o) => [
    { text: `📦 #${o.orderNumber} — ${o.status}`, callback_data: `admin_view_order_${o.id}` },
  ]);
  buttons.push([{ text: "⬅️ Orqaga", callback_data: "admin_panel" }]);
  return Markup.inlineKeyboard(buttons);
}

// ============================================================
// INLINE BUTTON: MAIN MENU
// ============================================================
export function inlineMainMenu() {
  return Markup.inlineKeyboard([
    [{ text: "🏠 Asosiy menyu", callback_data: "main_menu" }],
  ]);
}
