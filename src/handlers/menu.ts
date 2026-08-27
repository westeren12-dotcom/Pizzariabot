import { BotContext } from "../types";
import { categoryListKeyboard, productListKeyboard, productDetailKeyboard, variantSelectionKeyboard, quantityKeyboard, mainMenuKeyboard } from "../keyboards";
import { isAdmin } from "../middlewares";
import * as db from "../database";
import { getCallbackData } from "../utils/helpers";
import * as path from "path";
import * as fs from "fs";

export async function handleMenuText(ctx: BotContext) {
  if (!ctx.from) return;

  const categories = await db.getActiveCategories();
  const menuImagePath = path.join(process.cwd(), "assets", "menu.png");

  if (fs.existsSync(menuImagePath)) {
    await ctx.replyWithPhoto(
      { source: menuImagePath },
      {
        caption: "Menyudan birini tanlang yoki mahsulot nomini kiriting:",
        ...categoryListKeyboard(categories),
      }
    );
  } else {
    const text = `Menyudan birini tanlang yoki mahsulot nomini kiriting:`;
    await ctx.reply(text, {
      parse_mode: "Markdown",
      ...categoryListKeyboard(categories),
    });
  }
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

  // Start order flow with this product
  ctx.session.orderItem = `${product.name} — ${product.variants[0]?.name || "Standart"} ${product.variants[0]?.price?.toLocaleString("uz-UZ") || ""} so'm`;
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
