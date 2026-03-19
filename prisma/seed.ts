import "dotenv/config";

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client";
import { populateMedals } from "./seeds/medals";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await populateMedals(prisma);
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
