import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Seed categories
  const lavash = await prisma.category.upsert({
    where: { name: "Lavash" },
    update: {},
    create: { name: "Lavash", emoji: "🌯", sortOrder: 1 },
  });

  const burger = await prisma.category.upsert({
    where: { name: "Burger" },
    update: {},
    create: { name: "Burger", emoji: "🍔", sortOrder: 2 },
  });

  const hotDog = await prisma.category.upsert({
    where: { name: "Hot Dog" },
    update: {},
    create: { name: "Hot Dog", emoji: "🌭", sortOrder: 3 },
  });

  const free = await prisma.category.upsert({
    where: { name: "Free" },
    update: {},
    create: { name: "Free", emoji: "🍟", sortOrder: 4 },
  });

  const pizza = await prisma.category.upsert({
    where: { name: "Pizza" },
    update: {},
    create: { name: "Pizza", emoji: "🍕", sortOrder: 5 },
  });

  // Seed Lavash products
  const lavashProducts = [
    { name: "TANDIR LAVASH", description: "Maxsus tandirda pishirilgan lavash", price: 35000 },
    { name: "LAVASH", description: "Klassik lavash", price: 32000 },
    { name: "LAVASH KATTA", description: "Katta hajmli lavash", price: 35000 },
    { name: "LAVASH PISHLOQ", description: "Pishloqli lavash", price: 35000 },
  ];

  for (const [i, p] of lavashProducts.entries()) {
    const product = await prisma.product.upsert({
      where: { id: i + 1 },
      update: {},
      create: {
        name: p.name,
        description: p.description,
        emoji: "🌯",
        categoryId: lavash.id,
        sortOrder: i + 1,
      },
    });
    await prisma.productVariant.create({
      data: { name: "Standart", price: p.price, productId: product.id },
    });
  }

  // Seed Burger products
  const burgerProducts = [
    { name: "NON BURGER", description: "Non bilan tayyorlangan burger", price: 35000 },
    { name: "GAMBURGER", description: "Klassik gamburger", price: 30000 },
    { name: "CHEESEBURGER", description: "Pishloqli burger", price: 35000 },
  ];

  for (const [i, p] of burgerProducts.entries()) {
    const product = await prisma.product.upsert({
      where: { id: i + 5 },
      update: {},
      create: {
        name: p.name,
        description: p.description,
        emoji: "🍔",
        categoryId: burger.id,
        sortOrder: i + 1,
      },
    });
    await prisma.productVariant.create({
      data: { name: "Standart", price: p.price, productId: product.id },
    });
  }

  // Seed Hot Dog products
  const hotDogProducts = [
    { name: "HOT DOG", description: "Klassik hot dog", price: 15000 },
    { name: "HOT DOG KANADA", description: "Kanada uslubidagi hot dog", price: 18000 },
    { name: "BIG HOT DOG", description: "Katta hot dog", price: 22000 },
  ];

  for (const [i, p] of hotDogProducts.entries()) {
    const product = await prisma.product.upsert({
      where: { id: i + 8 },
      update: {},
      create: {
        name: p.name,
        description: p.description,
        emoji: "🌭",
        categoryId: hotDog.id,
        sortOrder: i + 1,
      },
    });
    await prisma.productVariant.create({
      data: { name: "Standart", price: p.price, productId: product.id },
    });
  }

  // Seed Free (Fries) products
  const freeProducts = [
    { name: "FREE 150g", description: "Kartoshka fri 150g — klassik", price: 20000 },
    { name: "FREE 150g MAXSUS", description: "Kartoshka fri 150g — maxsus tayyorlangan", price: 25000 },
  ];

  for (const [i, p] of freeProducts.entries()) {
    const product = await prisma.product.upsert({
      where: { id: i + 11 },
      update: {},
      create: {
        name: p.name,
        description: p.description,
        emoji: "🍟",
        categoryId: free.id,
        sortOrder: i + 1,
      },
    });
    await prisma.productVariant.create({
      data: { name: "Standart", price: p.price, productId: product.id },
    });
  }

  // Seed Pizza products
  const pizzaProducts = [
    { name: "PEPPERONI", description: "Pepperoni kolbasa bilan pizza", smallPrice: 50000, bigPrice: 70000 },
    { name: "MARGARITA", description: "Klassik margarita pizza", smallPrice: 40000, bigPrice: 60000 },
    { name: "MIKS", description: "Turli masalliqli pizza", smallPrice: 70000, bigPrice: 95000 },
    { name: "GO'SHTLI", description: "Go'shtli pizza", smallPrice: 60000, bigPrice: 80000 },
    { name: "4 FASL", description: "To'rt fasl pizza", smallPrice: 60000, bigPrice: 90000 },
    { name: "TOVUQLI", description: "Tovuqli pizza", smallPrice: 60000, bigPrice: 80000 },
    { name: "RANCH", description: "Ranch sousli pizza", smallPrice: 50000, bigPrice: 75000 },
  ];

  for (const [i, p] of pizzaProducts.entries()) {
    const product = await prisma.product.upsert({
      where: { id: i + 13 },
      update: {},
      create: {
        name: p.name,
        description: p.description,
        emoji: "🍕",
        categoryId: pizza.id,
        sortOrder: i + 1,
      },
    });
    const existingSmall = await prisma.productVariant.findFirst({
      where: { productId: product.id, name: "Kichik" },
    });
    if (!existingSmall) {
      await prisma.productVariant.create({
        data: { name: "Kichik", price: p.smallPrice, productId: product.id },
      });
    }
    const existingBig = await prisma.productVariant.findFirst({
      where: { productId: product.id, name: "Katta" },
    });
    if (!existingBig) {
      await prisma.productVariant.create({
        data: { name: "Katta", price: p.bigPrice, productId: product.id },
      });
    }
  }

  // Seed default settings
  const defaultSettings = [
    { key: "delivery_price", value: "0" },
    { key: "about_address", value: "Chinobod" },
    { key: "about_phone", value: "+998943941919" },
    { key: "about_instagram", value: "pizza_ria_1" },
    { key: "about_work_hours", value: "09:00 - 03:00" },
    { key: "about_name", value: "Pizza Ria" },
  ];

  for (const setting of defaultSettings) {
    await prisma.botSettings.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
