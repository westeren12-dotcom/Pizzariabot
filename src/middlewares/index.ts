import { BotContext } from "../types";

const ADMIN_IDS = (process.env.ADMIN_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

/**
 * Check if the current user is an admin
 */
export function isAdmin(telegramId: number): boolean {
  return ADMIN_IDS.includes(telegramId.toString());
}

/**
 * Middleware to auto-register users
 */
export async function autoRegisterMiddleware(ctx: BotContext, next: () => Promise<void>) {
  if (ctx.from) {
    const { getOrCreateUser } = await import("../database");
    const admin = isAdmin(ctx.from.id);
    await getOrCreateUser(
      ctx.from.id,
      ctx.from.first_name,
      ctx.from.last_name,
      ctx.from.username,
      admin
    );
  }
  return next();
}
