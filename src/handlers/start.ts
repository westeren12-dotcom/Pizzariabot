import { BotContext } from "../types";
import { mainMenuKeyboard, adminPanelKeyboard } from "../keyboards";
import { isAdmin } from "../middlewares";

export async function handleStart(ctx: BotContext) {
  if (!ctx.from) return;

  const admin = isAdmin(ctx.from.id);

  const welcomeText = `🍕 *Pizza Ria* ga xush kelibsiz!\n\nBizning menyudan o'z yoqtirgan taomingizni tanlab, buyurtma berishingiz mumkin.\n\n${admin ? "Admin panelga kirish uchun /admin yozing." : ""}\n\nQuyidagilardan birini tanlang:`;

  await ctx.reply(welcomeText, {
    parse_mode: "Markdown",
    ...mainMenuKeyboard(),
  });
}

export async function handleAdmin(ctx: BotContext) {
  if (!ctx.from) return;

  if (!isAdmin(ctx.from.id)) {
    return ctx.reply("Siz admin emassiz!");
  }

  const text = `👨‍💼 *Pizza Ria — Admin Panel*\n\nAssalomu alaykum! Siz admin sifatida kiradingiz.\n\n*Buyruqlar:*\n/BugungiFoyda — Bugungi daromad\n/BugungiBuyurtmalar — Bugungi buyurtmalar\n/Statistika — Umumiy statistika\n/Hisobot — Oylik hisobot\n/MenyuBoshqarish — Menyuni boshqarish\n/Narxlar — Narxlarni o'zgartirish\n/Buyurtmalar — Buyurtmalar ro'yxati\n/FaolBuyurtmalar — Faol buyurtmalar\n/Mijozlar — Mijozlar bazasi\n/Broadcast — Xabar yuborish\n/Sozlamalar — Bot sozlamalari`;

  await ctx.reply(text, {
    parse_mode: "Markdown",
    ...adminPanelKeyboard(),
  });
}
