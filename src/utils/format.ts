/**
 * Format a number as currency in Uzbek so'm
 */
export function formatPrice(price: number): string {
  return price.toLocaleString("uz-UZ") + " so'm";
}

/**
 * Format a phone number for display
 */
export function formatPhone(phone: string): string {
  if (phone.startsWith("+")) return phone;
  if (phone.startsWith("998")) return "+" + phone;
  return "+998" + phone;
}

/**
 * Truncate text to a max length
 */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen - 3) + "...";
}

/**
 * Escape special Markdown characters
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

/**
 * Format order number with leading zeros
 */
export function formatOrderNumber(num: number): string {
  return num.toString().padStart(4, "0");
}
