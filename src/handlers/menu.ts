import { BotContext } from "../types";
import { Markup } from "telegraf";
import { InlineKeyboardButton } from "telegraf/types";
import { categoryListKeyboard, productListKeyboard, productDetailKeyboard, variantSelectionKeyboard, quantityKeyboard, mainMenuKeyboard } from "../keyboards";
import { isAdmin } from "../middlewares";
import * as db from "../database";
import { getCallbackData } from "../utils/helpers";
import * as path from "path";
import * as fs from "fs";

// All menu items with numeric prices
interface MenuItem {
  name: string;
  price?: number;        // single price
  priceSmall?: number;   // pizza small price
  priceLarge?: number;   // pizza large price
}

const ALL_MENU_ITEMS: MenuItem[] = [
  { name: "TANDIR LAVASH", price: 35000 },
  { name: "LAVASH", price: 32000 },
  { name: "LAVASH KATTA", price: 35000 },
  { name: "LAVASH PISHLOQ", price: 35000 },
  { name: "NON BURGER", price: 35000 },
  { name: "GAMBURGER", price: 30000 },
  { name: "CHEESEBURGER", price: 35000 },
  { name: "HOT DOG", price: 15000 },
  { name: "HOT DOG KANADA", price: 18000 },
  { name: "BIG HOT DOG", price: 22000 },
  { name: "FREE (kartoshka) 150g", price: 20000 },
  { name: "FREE (kartoshka) 150g MAXSUS", price: 25000 },
  { name: "PEPPERONI", priceSmall: 50000, priceLarge: 70000 },
  { name: "MARGARITA", priceSmall: 40000, priceLarge: 60000 },
  { name: "MIKS", priceSmall: 70000, priceLarge: 95000 },
  { name: "GO'SHTLI", priceSmall: 60000, priceLarge: 80000 },
  { name: "4 FASL", priceSmall: 60000, priceLarge: 90000 },
  { name: "TOVUQLI", priceSmall: 60000, priceLarge: 80000 },
  { name: "RANCH", priceSmall: 50000, priceLarge: 75000 },
];

function formatPrice(n: number): string {
  return n.toLocaleString("uz-UZ");
}

function getItemDisplayPrice(item: MenuItem): string {
  if (item.price) return formatPrice(item.price);
  if (item.priceSmall && item.priceLarge) return `${formatPrice(item.priceSmall)} / ${formatPrice(item.priceLarge)}`;
  return "N/A";
}

// Check if item has two prices (pizza)
function hasTwoPrices(item: MenuItem): boolean {
  return !!(item.priceSmall && item.priceLarge);
}

function menuButtonsKeyboard() {
  const buttons: InlineKeyboardButton[][] = ALL_MENU_ITEMS.map((item) => [
    { text: `${item.name} — ${getItemDisplayPrice(item)}`, callback_data: `order_item_${item.name}` },
  ]);
  buttons.push([{ text: "🏠 Asosiy menyu", callback_data: "main_menu" }]);
  return Markup.inlineKeyboard(buttons);
}

// Keyboard for size selection (pizza)
function sizeSelectionKeyboard(itemName: string, priceSmall: number, priceLarge: number): any {
  return Markup.inlineKeyboard([
    [{ text: `Kichik — ${formatPrice(priceSmall)} so'm`, callback_data: `size_${itemName}_small` }],
    [{ text: `Katta — ${formatPrice(priceLarge)} so'm`, callback_data: `size_${itemName}_large` }],
    [{ text: "⬅️ Orqaga", callback_data: "menu_back" }],
  ]);
}

export async function handleMenuText(ctx: BotContext) {
  if (!ctx.from) return;

  ctx.session.state = "awaiting_order_item";

  const menuImagePath = path.join(process.cwd(), "assets", "menu.png");

  if (fs.existsSync(menuImagePath)) {
    await ctx.replyWithPhoto(
      { source: menuImagePath },
      {
        caption: "Menyudan birini tanlang yoki mahsulot nomini kiriting:",
        ...menuButtonsKeyboard(),
      }
    );
  } else {
    await ctx.reply("Menyudan birini tanlang yoki mahsulot nomini kiriting:", menuButtonsKeyboard());
  }
}

export async function handleOrderItemCallback(ctx: BotContext) {
  const data = getCallbackData(ctx);
  if (!data || !ctx.from) return;

  const itemName = data.replace("order_item_", "");
  const item = ALL_MENU_ITEMS.find((i) => i.name === itemName);

  await ctx.answerCbQuery();

  // If item has two prices (pizza), ask for size
  if (item && hasTwoPrices(item) && item.priceSmall && item.priceLarge) {
    ctx.session.orderItem = itemName;
    ctx.session.state = "awaiting_order_size";
    await ctx.reply(
      `${itemName} tanlandi!\n\nHajmini tanlang:`,
      sizeSelectionKeyboard(itemName, item.priceSmall, item.priceLarge)
    );
    return;
  }

  // Single price item - go directly to name
  ctx.session.orderItem = itemName;
  ctx.session.orderPrice = item?.price || 0;
  ctx.session.orderVariant = "Standart";
  ctx.session.state = "awaiting_order_name";
  await ctx.reply(`${itemName} — ${formatPrice(item?.price || 0)} so'm tanlandi!\n\nIsmingizni kiriting:`);
}

// Handle size selection for pizza
export async function handleSizeSelection(ctx: BotContext) {
  const data = getCallbackData(ctx);
  if (!data || !ctx.from) return;

  // Format: size_ITEMNAME_small or size_ITEMNAME_large
  const parts = data.replace("size_", "").split("_");
  const size = parts.pop(); // small or large
  const itemName = parts.join("_"); // rejoin in case name has underscores

  const item = ALL_MENU_ITEMS.find((i) => i.name === itemName);
  if (!item) return;

  await ctx.answerCbQuery();

  if (size === "small" && item.priceSmall) {
    ctx.session.orderItem = itemName;
    ctx.session.orderPrice = item.priceSmall;
    ctx.session.orderVariant = "Kichik";
    ctx.session.state = "awaiting_order_name";
    await ctx.reply(`${itemName} (Kichik) — ${formatPrice(item.priceSmall)} so'm\n\nIsmingizni kiriting:`);
  } else if (size === "large" && item.priceLarge) {
    ctx.session.orderItem = itemName;
    ctx.session.orderPrice = item.priceLarge;
    ctx.session.orderVariant = "Katta";
    ctx.session.state = "awaiting_order_name";
    await ctx.reply(`${itemName} (Katta) — ${formatPrice(item.priceLarge)} so'm\n\nIsmingizni kiriting:`);
  }
}

// Search item by text (fuzzy match)
export function findMenuItem(text: string): MenuItem | undefined {
  const upper = text.toUpperCase().trim();
  // Exact match first
  let found = ALL_MENU_ITEMS.find((i) => i.name === upper);
  if (found) return found;
  // Partial match
  found = ALL_MENU_ITEMS.find((i) => upper.includes(i.name) || i.name.includes(upper));
  return found;
}

export async function handleCategoryCallback(ctx: BotContext) {
  const data = getCallbackData(ctx);
  if (!data) return;

  const catId = parseInt(data.replace("cat_", ""));
  const category = await db.getCategoryById(catId);
  if (!category) return;

  const products = await db.getProductsByCategory(catId);

  if (products.length === 0) {
    return ctx.answerCbQuery("Bu kategoriyada mahsulotlar yo'q");
  }

  const text = `${category.emoji} *${category.name}*\n\nMahsulotlardan birini tanlang:`;

  await ctx.editMessageText(text, {
    parse_mode: "Markdown",
    ...productListKeyboard(products, catId),
  });
}

export async function handleProductCallback(ctx: BotContext) {
  const data = getCallbackData(ctx);
  if (!data) return;

  const prodId = parseInt(data.replace("prod_", ""));
  const product = await db.getProductById(prodId);
  if (!product) return;

  let text = `${product.emoji || "🍽"} *${product.name}*\n`;

  if (product.description) {
    text += `\n📝 ${product.description}\n`;
  }

  text += `\n💰 *Narxlar:*`;

  for (const variant of product.variants) {
    text += `\n  • ${variant.name} — ${variant.price.toLocaleString("uz-UZ")} so'm`;
  }

  ctx.session.orderItem = `${product.name} — ${product.variants[0]?.name || "Standart"} ${product.variants[0]?.price?.toLocaleString("uz-UZ") || ""} so'm`;
  ctx.session.orderPrice = product.variants[0]?.price || 0;
  ctx.session.orderVariant = product.variants[0]?.name || "Standart";
  ctx.session.state = "awaiting_order_name";

  text += `\n\nIsmingizni kiriting:`;

  await ctx.editMessageText(text, {
    parse_mode: "Markdown",
  });
}

export async function handleAddCartCallback(ctx: BotContext) {
  const data = getCallbackData(ctx);
  if (!data) return;

  const productId = parseInt(data.replace("add_cart_", ""));
  const product = await db.getProductById(productId);
  if (!product) return;

  const variants = await db.getVariantsByProduct(productId);

  if (variants.length === 1) {
    ctx.session.selectedProductId = productId;
    ctx.session.selectedVariantId = variants[0].id;
    ctx.session.selectedQuantity = 1;

    const text = `${product.emoji || "🍽"} *${product.name}*\n\n🔢 Miqdorni tanlang:`;

    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
      ...quantityKeyboard(productId, variants[0].id, 1),
    });
    return;
  }

  const text = `${product.emoji || "🍽"} *${product.name}*\n\nHajmni tanlang:`;

  await ctx.editMessageText(text, {
    parse_mode: "Markdown",
    ...variantSelectionKeyboard(productId, variants),
  });
}

export async function handleVariantCallback(ctx: BotContext) {
  const data = getCallbackData(ctx);
  if (!data) return;

  const parts = data.replace("variant_", "").split("_");
  const productId = parseInt(parts[0]);
  const variantId = parseInt(parts[1]);

  ctx.session.selectedProductId = productId;
  ctx.session.selectedVariantId = variantId;
  ctx.session.selectedQuantity = 1;

  const product = await db.getProductById(productId);
  if (!product) return;

  const text = `${product.emoji || "🍽"} *${product.name}*\n\n🔢 Miqdorni tanlang:`;

  await ctx.editMessageText(text, {
    parse_mode: "Markdown",
    ...quantityKeyboard(productId, variantId, 1),
  });
}

export async function handleQuantityCallback(ctx: BotContext) {
  const data = getCallbackData(ctx);
  if (!data) return;

  const parts = data.split("_");

  if (parts[1] === "show") {
    return ctx.answerCbQuery(`${parts[2]} ta`);
  }

  const productId = parseInt(parts[2]);
  const variantId = parseInt(parts[3]);
  let quantity = parseInt(parts[4]);

  if (parts[1] === "plus") {
    quantity = Math.min(quantity + 1, 99);
  } else if (parts[1] === "minus") {
    quantity = Math.max(quantity - 1, 1);
  }

  ctx.session.selectedQuantity = quantity;

  const product = await db.getProductById(productId);
  if (!product) return;

  const text = `${product.emoji || "🍽"} *${product.name}*\n\n🔢 Miqdor: ${quantity}`;

  await ctx.editMessageText(text, {
    parse_mode: "Markdown",
    ...quantityKeyboard(productId, variantId, quantity),
  });
}

export async function handleConfirmAddCallback(ctx: BotContext) {
  const data = getCallbackData(ctx);
  if (!data || !ctx.from) return;

  const parts = data.replace("confirm_add_", "").split("_");
  const productId = parseInt(parts[0]);
  const variantId = parseInt(parts[1]);
  const quantity = parseInt(parts[2]);

  await db.addToCart(ctx.from.id, productId, variantId, quantity);

  const product = await db.getProductById(productId);

  await ctx.answerCbQuery(`${quantity} ta ${product?.name || "mahsulot"} savatga qo'shildi!`);

  if (product) {
    let text = `${product.emoji || "🍽"} *${product.name}*\n`;

    if (product.description) {
      text += `\n📝 ${product.description}\n`;
    }

    text += `\n💰 *Narxlar:*`;

    for (const v of product.variants) {
      text += `\n  • ${v.name} — ${v.price.toLocaleString("uz-UZ")} so'm`;
    }

    text += `\n\n✅ *Savatga qo'shildi!* (${quantity} ta)`;

    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
      ...productDetailKeyboard(productId, product.variants.length > 1),
    });
  }
}

export async function handleMenuBack(ctx: BotContext) {
  const categories = await db.getActiveCategories();
  const text = `🍕 *Menyu*\n\nKategoriyalardan birini tanlang:`;

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

export async function handleMainMenuCallback(ctx: BotContext) {
  if (!ctx.from) return;

  const welcomeText = `🍕 *Pizza Ria* ga xush kelibsiz!\n\nQuyidagilardan birini tanlang:`;

  try {
    await ctx.editMessageText(welcomeText, {
      parse_mode: "Markdown",
    });
  } catch {
    await ctx.reply(welcomeText, {
      parse_mode: "Markdown",
      ...mainMenuKeyboard(),
    });
  }
}
