import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { ActivityType, PrismaClient } from "../prisma/generated/client";

// Usage: bun run scripts/add-medal.tsx <userId> <medalId>
const [userId, medalId] = process.argv.slice(2);

if (!medalId || !userId) {
  console.log("Usage: bun run scripts/add-medal.tsx <userId> <medalId>");
  process.exit(1);
}

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const medal = await prisma.medal.findUnique({ where: { id: medalId } });

  if (!medal) {
    console.error(`Medal not found: ${medalId}`);
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    console.error(`User not found: ${userId}`);
    process.exit(1);
  }

  const alreadyHasMedal = await prisma.userMedal.findFirst({
    where: { userId, medalId },
  });

  if (alreadyHasMedal) {
    console.log(`User "${user.name}" already has medal "${medal.name}".`);
    return;
  }

  const userMedal = await prisma.userMedal.create({
    data: { userId, medalId },
  });

  await prisma.activity.create({
    data: {
      type: ActivityType.MedalEarned,
      userId,
      userMedalId: userMedal.id,
      metadata: { id: userMedal.id, medal: { ...medal } },
    },
  });

  console.log(`Medal "${medal.name}" granted to user "${user.name}".`);
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
