import "dotenv/config";

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { v7 as uuid } from "uuid";

import { PrismaClient, UserRole } from "./generated/client";

const nodeEnv = process.env.NODE_ENV;

if (!nodeEnv || (nodeEnv !== "development" && nodeEnv !== "production")) {
  throw new Error("NODE_ENV is not defined. Please set it to 'development' or 'production'.");
}

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await populateMedals(prisma);
  
  if (nodeEnv === "development") {
    await createFirstUser(prisma);
  }
}

export async function populateMedals(prisma: PrismaClient) {
  const medals = await prisma.medal.createMany({
    data: [
      {
        name: "contributor",
        imageUrl: "https://i.ibb.co/99PS2x8m/logo.png",
      },
      {
        name: "staff",
        imageUrl: "https://i.ibb.co/99PS2x8m/logo.png",
      },
    ],
    skipDuplicates: true,
  });

  console.log(`Inserted ${medals.count} medals.`);
}

async function createFirstUser(prisma: PrismaClient) {
  const password = "$2a$12$VFoLlPVUMw.kcjR4L8Cdx.A4UrkBt4CWFZRLIrD1KOohG19Mc3XzC"; // "super-secure-password"

  const users = [
    {
      id: uuid(),
      name: "Jhon Doe",
      username: "jhondoe",
      email: "jhondoe@example.com",
    },
    {
      id: uuid(),
      name: "Jane Doe",
      username: "janedoe",
      email: "janedoe@example.com",
    },
  ];

  let insertedCount = 0;

  for (const userData of users) {
    const userExists = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (!userExists) {
      await prisma.user.create({
        data: {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          username: userData.username,
          emailVerified: true,
          role: UserRole.User,
          profile: {
            create: {
              id: uuid(),
            },
          },
          accounts: {
            create: {
              id: uuid(),
              accountId: userData.id,
              providerId: "credential",
              password,
            },
          },
        },
      });

      insertedCount++;
    }
  }

  console.log(`Inserted ${insertedCount} users.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (err) => {
    console.error(err);

    await prisma.$disconnect();
    await pool.end();

    process.exit(1);
  });
