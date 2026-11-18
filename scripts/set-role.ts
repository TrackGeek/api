// bun run scripts/set-role.ts fulano@email.com

import "dotenv/config";

import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient, UserRole } from "../prisma/generated/client";

const [email] = process.argv.slice(2);

if (!email) {
  console.log("Usage: bun run scripts/set-role.tsx <email>");
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

  console.log(`User: ${user.name} <${user.email}>`);
  console.log(`Current role: ${user.role}\n`);

  const roles = Object.values(UserRole);

  roles.forEach((role, index) => {
    const currentSuffix = role === user.role ? " (atual)" : "";
    console.log(`${index + 1}. ${role}${currentSuffix}`);
  });

  const choice = Number((await rl.question("\nEscolha o número da role: ")).trim());

  if (!Number.isInteger(choice) || choice < 1 || choice > roles.length) {
    console.error("Invalid choice.");
    process.exit(1);
  }

  const role = roles[choice - 1];

  if (role === user.role) {
    console.log(`User "${user.name}" already has role "${role}".`);
    return;
  }

  const answer = (await rl.question(`Mudar role de "${user.name}" de ${user.role} para ${role}? (s/N) `))
    .trim()
    .toLowerCase();

  if (!CONFIRM_ANSWERS.has(answer)) {
    console.log("Cancelado.");
    return;
  }

  await prisma.user.update({ where: { id: user.id }, data: { role } });

  console.log(`Role of user "${user.name}" changed from ${user.role} to ${role}.`);
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
