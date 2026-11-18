// bun run scripts/add-medal.ts fulano@email.com

import "dotenv/config";

import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { ActivityType, PrismaClient } from "../prisma/generated/client";

const [email] = process.argv.slice(2);

if (!email) {
  console.log("Usage: bun run scripts/add-medal.tsx <email>");
  process.exit(1);
}

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const rl = createInterface({ input, output });

const CONFIRM_ANSWERS = new Set(["s", "sim", "y", "yes"]);

async function main() {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  console.log(`User: ${user.name} <${user.email}>\n`);

  const [medals, userMedals] = await Promise.all([
    prisma.medal.findMany({ orderBy: { name: "asc" } }),
    prisma.userMedal.findMany({ where: { userId: user.id }, select: { medalId: true } }),
  ]);

  if (medals.length === 0) {
    console.log("No medals registered.");
    return;
  }

  const ownedMedalIds = new Set(userMedals.map(({ medalId }) => medalId));

  medals.forEach((medal, index) => {
    const ownedSuffix = ownedMedalIds.has(medal.id) ? " (já possui)" : "";
    console.log(`${index + 1}. ${medal.name}${ownedSuffix}`);
  });

  const choice = Number((await rl.question("\nEscolha o número da medalha: ")).trim());

  if (!Number.isInteger(choice) || choice < 1 || choice > medals.length) {
    console.error("Invalid choice.");
    process.exit(1);
  }

  const medal = medals[choice - 1];

  if (ownedMedalIds.has(medal.id)) {
    console.log(`User "${user.name}" already has medal "${medal.name}".`);
    return;
  }

  const answer = (await rl.question(`Conceder "${medal.name}" para "${user.name}"? (s/N) `)).trim().toLowerCase();

  if (!CONFIRM_ANSWERS.has(answer)) {
    console.log("Cancelado.");
    return;
  }

  const userMedal = await prisma.userMedal.create({
    data: { userId: user.id, medalId: medal.id },
  });

  await prisma.activity.create({
    data: {
      type: ActivityType.MedalEarned,
      userId: user.id,
      userMedalId: userMedal.id,
      metadata: { id: userMedal.id, medal: { ...medal } },
    },
  });

  console.log(`Medal "${medal.name}" granted to user "${user.name}".`);
}

main()
  .then(async () => {
    rl.close();
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (err) => {
    console.error(err);

    rl.close();
    await prisma.$disconnect();
    await pool.end();

    process.exit(1);
  });
