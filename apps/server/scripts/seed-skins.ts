import "dotenv/config";
import { Prisma } from "@prisma/client";
import { createPrismaClient } from "../src/db.js";

type SeedSkin = {
  id: string;
  name: string;
  description: string;
  priceCoins: number;
  sortOrder: number;
  isActive?: boolean;
};

const INITIAL_SKINS: SeedSkin[] = [
  {
    id: "ember",
    name: "Ember",
    description: "A fiery frame with warm highlights.",
    priceCoins: 10,
    sortOrder: 10
  },
  {
    id: "frost",
    name: "Frost",
    description: "A cool blue frame with icy glow.",
    priceCoins: 20,
    sortOrder: 20
  },
  {
    id: "neon",
    name: "Neon",
    description: "A neon green frame for high-contrast rivals.",
    priceCoins: 30,
    sortOrder: 30
  },
  {
    id: "aurora",
    name: "Aurora Flux",
    description: "Animated northern lights rolling across your rank card.",
    priceCoins: 45,
    sortOrder: 40
  },
  {
    id: "plasma",
    name: "Plasma Core",
    description: "Electric magenta-blue plasma with a live pulse.",
    priceCoins: 55,
    sortOrder: 50
  },
  {
    id: "synthwave",
    name: "Synthwave",
    description: "Retro sunset stripes with subtle scanline motion.",
    priceCoins: 65,
    sortOrder: 60
  },
  {
    id: "crimson",
    name: "Crimson Dominion",
    description:
      "Royal maroon gradient with molten ruby highlights and battle-ready aura.",
    priceCoins: 70,
    sortOrder: 70
  },
  {
    id: "void",
    name: "Event Horizon",
    description: "Deep space skin with drifting starfield glow.",
    priceCoins: 80,
    sortOrder: 80
  },
  {
    id: "hologram",
    name: "Hologram",
    description: "Iridescent prism gradient with rotating light sweep.",
    priceCoins: 95,
    sortOrder: 90
  },
  {
    id: "gold",
    name: "Gold Supreme",
    description: "The final flex: animated molten gold for top-tier champions.",
    priceCoins: 100,
    sortOrder: 100
  }
];

const main = async () => {
  const prisma = createPrismaClient("postgresql://postgres:1pMndebosaa5Q23sVUQOKyQaUFRTYQUleaB0yRl6aLrZ0ueT7lKVGNzHm4ThJwu5@138.199.197.214:5433/postgres?statusColor=686B6F&env=&name=Molty&tLSMode=0&usePrivateKey=false&safeModeLevel=0&advancedSafeModeLevel=0&driverVersion=0&lazyload=true");

  try {
    await prisma.$connect();

    let created = 0;
    let updated = 0;

    for (const skin of INITIAL_SKINS) {
      const existed = await prisma.ww_skin_catalog.findUnique({
        where: { id: skin.id },
        select: { id: true }
      });

      await prisma.ww_skin_catalog.upsert({
        where: { id: skin.id },
        create: {
          id: skin.id,
          name: skin.name,
          description: skin.description,
          price_coins: skin.priceCoins,
          sort_order: skin.sortOrder,
          is_active: skin.isActive ?? true
        },
        update: {
          name: skin.name,
          description: skin.description,
          price_coins: skin.priceCoins,
          sort_order: skin.sortOrder,
          is_active: skin.isActive ?? true
        }
      });

      if (existed) {
        updated += 1;
      } else {
        created += 1;
      }
    }

    const total = await prisma.ww_skin_catalog.count();
    // eslint-disable-next-line no-console
    console.log(
      `Skin seed completed. created=${created}, updated=${updated}, total=${total}`
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2021"
    ) {
      // eslint-disable-next-line no-console
      console.error(
        'Table "ww_skin_catalog" was not found. Run `bunx prisma db push` or your migrations first.'
      );
      process.exit(1);
    }

    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

void main();
