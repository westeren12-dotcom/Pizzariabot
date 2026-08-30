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
 * Send SMS to admin via Eskiz.uz API
 * Requires: ESKIZ_EMAIL, ESKIZ_PASSWORD in .env
 */
let eskizToken = "";
let eskizTokenExpiry = 0;

async function getEskizToken(): Promise<string> {
  const email = process.env.ESKIZ_EMAIL || "";
  const password = process.env.ESKIZ_PASSWORD || "";

  if (!email || !password) return "";

  // Token 24 soat amal qiladi, oldingi token hali yaroqli bo'lsa ishlatamiz
  if (eskizToken && Date.now() < eskizTokenExpiry) {
    return eskizToken;
  }

  try {
    const response = await fetch("https://sms-api.eskiz.uz/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data: any = await response.json();
    if (data.data?.token) {
      eskizToken = data.data.token;
      eskizTokenExpiry = Date.now() + 23 * 60 * 60 * 1000; // 23 soat
      return eskizToken;
    }
    console.error("❌ Eskiz token error:", data);
  } catch (err) {
    console.error("❌ Eskiz login error:", err);
  }
  return "";
}

export async function sendSmsToAdmin(phone: string, message: string): Promise<boolean> {
  const token = await getEskizToken();
  const from = process.env.ESKIZ_FROM || "4546";

  if (!token) {
    console.log("📱 Eskiz not configured, skipping SMS");
    return false;
  }

  try {
    const response = await fetch("https://sms-api.eskiz.uz/api/message/sms/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ mobile_phone: phone, message, from }),
    });

    const data: any = await response.json();
    if (data.status === "success" || data.id) {
      console.log(`📱 SMS sent to ${phone}`);
      return true;
    }
    console.error(`📱 SMS failed to ${phone}:`, data);
  } catch (err) {
    console.error(`📱 SMS error to ${phone}:`, err);
  }
  return false;
}

/**
 * Send SMS notification to all admin phones
 */
export async function notifyAdminsSms(order: OrderNotification) {
  const adminPhones = (process.env.ADMIN_PHONES || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (adminPhones.length === 0) {
    console.log("📱 ADMIN_PHONES not set, skipping SMS");
    return;
  }

  // SMS matni (qisqa, 70 ta belgi — kirillik uchun yetarli)
  const smsText = `YANGI BUYURTMA #${order.orderNumber}! Mijoz: ${order.customerName}. Tel: +${order.customerPhone}. ${order.items.trim()} Jami: ${order.totalPrice} so'm. TEZ JAVOB BERING!`;

  for (const phone of adminPhones) {
    await sendSmsToAdmin(phone, smsText);
  }
}

/**
 * Make phone call to admin via CallMeBot (FREE!)
 * Admin faqat 1 marta @CallMeBot_txtbot ga /start yozishi kerak
 * Keyin har doim qo'ng'iroq qiladi!
 * Requires: CALLMEBOT_USER in .env (masalan: @admin_username)
 */
export async function triggerAdminCall(order: OrderNotification) {
  const callmebotUsers = (process.env.CALLMEBOT_USER || "")
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);

  if (callmebotUsers.length === 0) {
    console.log("📞 CALLMEBOT_USER not configured, skipping phone call");
    console.log("📞 To enable: set CALLMEBOT_USER=@admin_username in .env");
    return;
  }

  const callText = `Yangi buyurtma. Buyurtma raqami ${order.orderNumber}. Mijoz ${order.customerName}. Telefon ${order.customerPhone}. Tez javob bering!`;

  for (const user of callmebotUsers) {
    try {
      // CallMeBot API format
      const userParam = user.startsWith("@") ? user : `@${user}`;
      const url = new URL("https://api.callmebot.com/start.php");
      url.searchParams.set("user", userParam);
      url.searchParams.set("text", callText);
      url.searchParams.set("lang", "uz");
      url.searchParams.set("rpt", "2");
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
      `✅ *Buyurtma #${orderNumber} qabul qilindi!*\n\nBuyurtmangiz tayyorlanmoqda.\nTez orada siz bilan bog'lanamiz.`,
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

  // 2. Phone call to admins (Twilio)
  await triggerAdminCall(order);

  // 3. SMS to admin phones (backup)
  await notifyAdminsSms(order);

  // 4. Confirmation to customer
  if (customerUserId) {
    await notifyCustomerOrderReceived(bot, customerUserId, order.orderNumber);
  }
}
