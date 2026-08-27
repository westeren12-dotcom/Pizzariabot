import { BotContext } from "../types";
import { mainMenuKeyboard, adminPanelKeyboard } from "../keyboards";
import { isAdmin } from "../middlewares";

export async function handleStart(ctx: BotContext) {
  if (!ctx.from) return;

  const admin = isAdmin(ctx.from.id);

  const welcomeText = `🍕 *Pizza Ria* ga xush kelibsiz!

Bizning menyudan o'z yoqtirgan taomingizni tanlab, buyurtma berishingiz mumkin.

${admin ? "👨‍💼 Admin panelga kirish uchun /admin yozing." : ""}

Quyidagilardan birini tanlang:`;

  await ctx.reply(welcomeText, {
    parse_mode: "Markdown",
    ...mainMenuKeyboard(),
  });
}

export async function handleAdmin(ctx: BotContext) {
  if (!ctx.from) return;

  if (!isAdmin(ctx.from.id)) {
    return ctx.reply("⛔ Siz admin emassiz!");
  }

  const text = `👨‍💼 *Admin panel*

Quyidagi amallardan birini tanlang:`;

  await ctx.reply(text, {
    parse_mode: "Markdown",
    ...adminPanelKeyboard(),
  });
}
