import { BotContext } from "../types";

const ADMIN_USERNAMES = (process.env.ADMIN_USERNAMES || "")
  .split(",")
  .map((u) => u.trim().toLowerCase())
  .filter(Boolean);

const ADMIN_IDS = (process.env.ADMIN_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

/**
 * Check if the current user is an admin (by username or ID)
 */
export function isAdmin(telegramId: number, username?: string): boolean {
  if (username && ADMIN_USERNAMES.includes(username.toLowerCase())) {
    return true;
  }
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
