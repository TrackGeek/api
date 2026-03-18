import type { PrismaClient } from "../generated/client";

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
