import { Telegraf } from "telegraf";
import { BotContext } from "../types";
import { Markup } from "telegraf";

interface OrderNotification {
  orderNumber: number;
  orderId?: number;
  customerName: string;
  customerPhone: string;
  district: string;
  items: string;
  totalPrice: string;
  paymentType: string;
}

/**
 * Send Telegram notification to all admins with high-priority sound + inline buttons
 */
export async function notifyAdminsTelegram(
  bot: Telegraf<BotContext>,
  adminIds: number[],
  order: OrderNotification
) {
  const message = formatAdminMessage(order);
  const orderId = order.orderId || order.orderNumber;

  // Inline buttons: Tasdiqlash / Bekor qilish
  const keyboard = Markup.inlineKeyboard([
    [{ text: `✅ Buyurtma #${orderId} ni qabul qilish`, callback_data: `admin_accept_${orderId}` }],
    [{ text: `❌ Buyurtma #${orderId} ni bekor qilish`, callback_data: `admin_reject_${orderId}` }],
  ]);

  for (const adminId of adminIds) {
    try {
      await bot.telegram.sendMessage(adminId, message, {
        parse_mode: "Markdown",
        disable_notification: false,
        ...keyboard,
      });
      console.log(`✅ Telegram notification sent to admin ${adminId}`);
    } catch (err) {
      console.error(`❌ Failed to notify admin ${adminId}:`, err);
    }
  }

  // Schedule repeat notifications (30s, 2min, 5min) if no response
  scheduleReminders(bot, adminIds, order);
}

/**
 * Format admin notification message
 */
function formatAdminMessage(order: OrderNotification): string {
  return (
    `🔔🔔🔔 *YANGI BUYURTMA!* 🔔🔔🔔\n\n` +
    `📦 *#${order.orderNumber}*\n\n` +
    `👤 *Mijoz:* ${order.customerName}\n` +
    `📞 *Telefon:* +${order.customerPhone}\n` +
    `📍 *Hudud:* ${order.district}\n\n` +
    `🍽 *Buyurtma:*\n${order.items}\n\n` +
    `💰 *Jami:* ${order.totalPrice} so'm\n` +
    `💳 *To'lov:* ${order.paymentType}\n\n` +
    `⚡ *TEZ JAVOB BERING!*`
  );
}

/**
 * Schedule repeat reminder messages
 */
function scheduleReminders(
  bot: Telegraf<BotContext>,
  adminIds: number[],
  order: OrderNotification
) {
  const reminders = [
    { delay: 30_000, text: `⚠️ *ESLATMA!* Buyurtma #${order.orderNumber} hali javob berilmadi!\n\n👤 ${order.customerName} — +${order.customerPhone}\n⚡ TEZ JAVOB BERING!` },
    { delay: 120_000, text: `🚨 *OGOHLANTIRISH!* Buyurtma #${order.orderNumber} 2 daqiqa javobsiz!\n\n👤 ${order.customerName} — +${order.customerPhone}\n🚨 Mijoz kutmoqda!` },
    { delay: 300_000, text: `❌ *JUDA MUHIM!* Buyurtma #${order.orderNumber} 5 daqiqa javobsiz!\n\n👤 ${order.customerName} — +${order.customerPhone}\n❌ Mijoz uzoq kutyapti!` },
  ];

  for (const reminder of reminders) {
    setTimeout(async () => {
      for (const adminId of adminIds) {
        try {
          await bot.telegram.sendMessage(adminId, reminder.text, {
            parse_mode: "Markdown",
          });
        } catch (err) {
          console.error(`Failed to send reminder to ${adminId}:`, err);
        }
      }
    }, reminder.delay);
  }
}

/**
 * Trigger phone call to admin via CallMeBot API
 * Step 1: Send /start to @CallMeBot_txtbot to authorize
 * Step 2: Set CALLMEBOT_USER in .env (e.g. @username or +998...)
 */
export async function triggerAdminCall(order: OrderNotification) {
  // CallMeBot env variables
  const callmebotUser = process.env.CALLMEBOT_USER || "";
  const callmebotLang = process.env.CALLMEBOT_LANG || "en-GB-Standard-B";
  const callmebotRepeat = process.env.CALLMEBOT_REPEAT || "2";

  if (!callmebotUser) {
    console.log("📞 CALLMEBOT_USER not set, skipping phone call");
    console.log("📞 To enable: set CALLMEBOT_USER=@username in .env");
    return;
  }

  const callText = `Yangi buyurtma number ${order.orderNumber}. Mijoz ${order.customerName}. Telefon ${order.customerPhone}. Tez javob bering!`;

  // Support multiple users separated by comma
  const users = callmebotUser.split(",").map((u) => u.trim()).filter(Boolean);

  for (const user of users) {
    try {
      const userParam = user.startsWith("@") ? user : user.startsWith("+") ? user : `@${user}`;

      // CallMeBot API format:
      // http://api.callmebot.com/start.php?user=@username&text=message&lang=en-GB-Standard-B&rpt=2&cc=yes
      const url = new URL("https://api.callmebot.com/start.php");
      url.searchParams.set("user", userParam);
      url.searchParams.set("text", callText);
      url.searchParams.set("lang", callmebotLang);
      url.searchParams.set("rpt", callmebotRepeat);
      url.searchParams.set("cc", "yes");

      console.log(`📞 Calling ${userParam}...`);
      const response = await fetch(url.toString());

      if (response.ok) {
        console.log(`📞 Phone call triggered to ${userParam}`);
      } else {
        const body = await response.text();
        console.error(`📞 Phone call failed to ${userParam}: ${response.status} - ${body}`);
      }
    } catch (err) {
      console.error(`📞 Phone call error to ${user}:`, err);
    }
  }
}

/**
 * Send order confirmation to customer
 */
export async function notifyCustomerOrderReceived(
  bot: Telegraf<BotContext>,
  userId: number,
  orderNumber: number
) {
  try {
    await bot.telegram.sendMessage(
      userId,
      `✅ *Buyurtma #${orderNumber} qabul qilindi!*\n\nTez orada siz bilan bog'lanamiz.`,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    console.error(`Failed to notify customer ${userId}:`, err);
  }
}

/**
 * Notify all admins about new order — full notification suite
 */
export async function onNewOrder(
  bot: Telegraf<BotContext>,
  adminIds: number[],
  order: OrderNotification,
  customerUserId?: number
) {
  // 1. Telegram notifications to admins
  await notifyAdminsTelegram(bot, adminIds, order);

  // 2. Phone call to admins (webhook)
  await triggerAdminCall(order);

  // 3. Confirmation to customer
  if (customerUserId) {
    await notifyCustomerOrderReceived(bot, customerUserId, order.orderNumber);
  }
}
