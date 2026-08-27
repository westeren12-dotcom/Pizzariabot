import { Context } from "telegraf";

/**
 * Safely extract callback_query data from context.
 * callbackQuery can be GameQuery (no `data`) or DataQuery, so we narrow.
 */
export function getCallbackData(ctx: Context): string | undefined {
  const cq = ctx.callbackQuery;
  if (cq && "data" in cq) {
    return cq.data;
  }
  return undefined;
}
