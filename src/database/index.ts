import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default prisma;

// ============================================================
// USER OPERATIONS
// ============================================================
export async function getOrCreateUser(
  telegramId: number,
  firstName: string,
  lastName?: string,
  username?: string,
  isAdmin?: boolean
) {
  let user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        telegramId,
        firstName,
        lastName: lastName || null,
        username: username || null,
        isAdmin: isAdmin || false,
      },
    });
  } else {
    // Update name/username if changed
    if (user.firstName !== firstName || user.lastName !== lastName || user.username !== username) {
      user = await prisma.user.update({
        where: { telegramId },
        data: { firstName, lastName: lastName || null, username: username || null },
      });
    }
  }
  return user;
}

export async function updateUserPhone(telegramId: number, phone: string) {
  return prisma.user.update({
    where: { telegramId },
    data: { phone },
  });
}

export async function getUserById(telegramId: number) {
  return prisma.user.findUnique({ where: { telegramId } });
}

export async function getAllUsers() {
  return prisma.user.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getUserOrderCount(telegramId: number) {
  return prisma.order.count({ where: { userId: telegramId } });
}

export async function getUserTotalSpent(telegramId: number) {
  const result = await prisma.order.aggregate({
    where: { userId: telegramId, status: { in: ["accepted", "delivered"] } },
    _sum: { totalPrice: true },
  });
  return result._sum.totalPrice || 0;
}

// ============================================================
// CATEGORY OPERATIONS
// ============================================================
export async function getActiveCategories() {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getCategoryById(id: number) {
  return prisma.category.findUnique({ where: { id } });
}

export async function createCategory(name: string, emoji: string) {
  const maxOrder = await prisma.category.aggregate({ _max: { sortOrder: true } });
  return prisma.category.create({
    data: {
      name,
      emoji,
      sortOrder: (maxOrder._max.sortOrder || 0) + 1,
    },
  });
}

export async function updateCategory(id: number, data: { name?: string; emoji?: string; isActive?: boolean }) {
  return prisma.category.update({ where: { id }, data });
}

// ============================================================
// PRODUCT OPERATIONS
// ============================================================
export async function getProductsByCategory(categoryId: number) {
  return prisma.product.findMany({
    where: { categoryId, isActive: true },
    include: { variants: { where: { isActive: true } } },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getProductById(id: number) {
  return prisma.product.findUnique({
    where: { id },
    include: { variants: { where: { isActive: true } }, category: true },
  });
}

export async function createProduct(data: {
  name: string;
  description?: string;
  emoji?: string;
  categoryId: number;
}) {
  const maxOrder = await prisma.product.aggregate({
    where: { categoryId: data.categoryId },
    _max: { sortOrder: true },
  });
  return prisma.product.create({
    data: {
      ...data,
      sortOrder: (maxOrder._max.sortOrder || 0) + 1,
    },
  });
}

export async function updateProduct(id: number, data: { name?: string; description?: string; emoji?: string; isActive?: boolean }) {
  return prisma.product.update({ where: { id }, data });
}

export async function deleteProduct(id: number) {
  return prisma.product.delete({ where: { id } });
}

export async function getAllProducts() {
  return prisma.product.findMany({
    include: { category: true, variants: { where: { isActive: true } } },
    orderBy: { sortOrder: "asc" },
  });
}

// ============================================================
// VARIANT OPERATIONS
// ============================================================
export async function getVariantsByProduct(productId: number) {
  return prisma.productVariant.findMany({
    where: { productId, isActive: true },
  });
}

export async function createVariant(productId: number, name: string, price: number) {
  return prisma.productVariant.create({
    data: { productId, name, price },
  });
}

export async function updateVariant(id: number, data: { name?: string; price?: number; isActive?: boolean }) {
  return prisma.productVariant.update({ where: { id }, data });
}

// ============================================================
// CART OPERATIONS
// ============================================================
export async function getOrCreateCart(telegramId: number) {
  let cart = await prisma.cart.findUnique({ where: { userId: telegramId } });
  if (!cart) {
    cart = await prisma.cart.create({ data: { userId: telegramId } });
  }
  return cart;
}

export async function getCartItems(telegramId: number) {
  const cart = await getOrCreateCart(telegramId);
  return prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: { product: true, variant: true },
  });
}

export async function addToCart(telegramId: number, productId: number, variantId: number, quantity: number) {
  const cart = await getOrCreateCart(telegramId);

  const existingItem = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId, variantId },
  });

  if (existingItem) {
    return prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: existingItem.quantity + quantity },
    });
  }

  return prisma.cartItem.create({
    data: {
      cartId: cart.id,
      productId,
      variantId,
      quantity,
    },
  });
}

export async function updateCartItemQuantity(cartItemId: number, quantity: number) {
  if (quantity <= 0) {
    return prisma.cartItem.delete({ where: { id: cartItemId } });
  }
  return prisma.cartItem.update({
    where: { id: cartItemId },
    data: { quantity },
  });
}

export async function removeCartItem(cartItemId: number) {
  return prisma.cartItem.delete({ where: { id: cartItemId } });
}

export async function clearCart(telegramId: number) {
  const cart = await getOrCreateCart(telegramId);
  return prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
}

export async function getCartTotal(telegramId: number) {
  const items = await getCartItems(telegramId);
  return items.reduce((sum, item) => sum + item.variant.price * item.quantity, 0);
}

// ============================================================
// ORDER OPERATIONS
// ============================================================
export async function getNextOrderNumber() {
  const lastOrder = await prisma.order.findFirst({
    orderBy: { orderNumber: "desc" },
  });
  return (lastOrder?.orderNumber || 0) + 1;
}

export async function createOrder(data: {
  userId: number;
  phone: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  paymentType: string;
  deliveryPrice: number;
  totalPrice: number;
  items: { productId: number; variantId: number; quantity: number; price: number }[];
}) {
  const orderNumber = await getNextOrderNumber();

  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId: data.userId,
      phone: data.phone,
      address: data.address,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      paymentType: data.paymentType,
      deliveryPrice: data.deliveryPrice,
      totalPrice: data.totalPrice,
      status: "pending",
      items: {
        create: data.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          price: item.price,
        })),
      },
      statusHistory: {
        create: { status: "pending" },
      },
    },
    include: { items: { include: { product: true, variant: true } }, user: true },
  });

  // Clear the user's cart
  await clearCart(data.userId);

  return order;
}

export async function getOrderById(id: number) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true, variant: true } },
      user: true,
      statusHistory: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function getOrdersByUser(telegramId: number) {
  return prisma.order.findMany({
    where: { userId: telegramId },
    include: { items: { include: { product: true, variant: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getActiveOrderByUser(telegramId: number) {
  return prisma.order.findFirst({
    where: {
      userId: telegramId,
      status: { in: ["pending", "accepted", "preparing", "on_delivery"] },
    },
    include: { items: { include: { product: true, variant: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllOrders() {
  return prisma.order.findMany({
    include: {
      items: { include: { product: true, variant: true } },
      user: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateOrderStatus(orderId: number, status: string) {
  await prisma.orderStatusHistory.create({
    data: { orderId, status },
  });
  return prisma.order.update({
    where: { id: orderId },
    data: { status },
    include: { user: true },
  });
}

// ============================================================
// STATISTICS
// ============================================================
export async function getTodayStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const totalOrders = await prisma.order.count({
    where: { createdAt: { gte: today, lt: tomorrow } },
  });

  const deliveredOrders = await prisma.order.count({
    where: { createdAt: { gte: today, lt: tomorrow }, status: { in: ["accepted", "delivered"] } },
  });

  const pendingOrders = await prisma.order.count({
    where: { createdAt: { gte: today, lt: tomorrow }, status: { in: ["pending", "accepted", "preparing", "on_delivery"] } },
  });

  const cancelledOrders = await prisma.order.count({
    where: { createdAt: { gte: today, lt: tomorrow }, status: "cancelled" },
  });

  const revenue = await prisma.order.aggregate({
    where: { createdAt: { gte: today, lt: tomorrow }, status: { in: ["accepted", "delivered"] } },
    _sum: { totalPrice: true },
  });

  // Top selling products
  const topProducts = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      order: { createdAt: { gte: today, lt: tomorrow }, status: { in: ["accepted", "delivered"] } },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 5,
  });

  const topProductDetails = await Promise.all(
    topProducts.map(async (tp) => {
      const product = await prisma.product.findUnique({ where: { id: tp.productId } });
      return {
        name: product?.name || "Noma'lum",
        count: tp._sum.quantity || 0,
      };
    })
  );

  return {
    totalOrders,
    deliveredOrders,
    pendingOrders,
    cancelledOrders,
    revenue: revenue._sum.totalPrice || 0,
    topProducts: topProductDetails,
  };
}

// ============================================================
// SETTINGS
// ============================================================
export async function getSetting(key: string) {
  const setting = await prisma.botSettings.findUnique({ where: { key } });
  return setting?.value || null;
}

export async function getAdminUsers() {
  const adminUsernames = (process.env.ADMIN_USERNAMES || "")
    .split(",")
    .map((u) => u.trim().toLowerCase())
    .filter(Boolean);

  if (adminUsernames.length === 0) return [];

  return prisma.user.findMany({
    where: {
      username: { in: adminUsernames },
    },
  });
}

export async function setSetting(key: string, value: string) {
  return prisma.botSettings.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}
