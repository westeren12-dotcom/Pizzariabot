import { Context } from "telegraf";

export interface SessionData {
  state?: string;
  selectedProductId?: number;
  selectedVariantId?: number;
  selectedQuantity?: number;
  selectedCategoryId?: number;
  phone?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  paymentType?: "cash" | "card";
  awaitingReply?: string;
  adminAction?: string;
  editingProductId?: number;
  editingCategoryId?: number;
}

export interface BotContext extends Context {
  session: SessionData;
}

export const ORDER_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  PREPARING: "preparing",
  ON_DELIVERY: "on_delivery",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;

export type OrderStatusType = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const STATUS_LABELS: Record<OrderStatusType, string> = {
  pending: "⏳ Kutishda",
  accepted: "✅ Qabul qilindi",
  preparing: "🍳 Tayyorlanmoqda",
  on_delivery: "🛵 Kuryerga berildi",
  delivered: "✅ Yetkazildi",
  cancelled: "❌ Bekor qilindi",
};

export const STATUS_EMOJI: Record<OrderStatusType, string> = {
  pending: "⏳",
  accepted: "✅",
  preparing: "🍳",
  on_delivery: "🛵",
  delivered: "✅",
  cancelled: "❌",
};

export const PAYMENT_TYPES = {
  CASH: "cash",
  CARD: "card",
} as const;

export const PAYMENT_LABELS: Record<string, string> = {
  cash: "💵 Naqd",
  card: "💳 Karta",
};

export const ADMIN_STATUSES: { status: OrderStatusType; label: string; emoji: string }[] = [
  { status: "accepted", label: "✅ Qabul qilish", emoji: "✅" },
  { status: "preparing", label: "🍳 Tayyorlanmoqda", emoji: "🍳" },
  { status: "on_delivery", label: "🛵 Kuryerga berildi", emoji: "🛵" },
  { status: "delivered", label: "✅ Yetkazildi", emoji: "✅" },
  { status: "cancelled", label: "❌ Bekor qilish", emoji: "❌" },
];
