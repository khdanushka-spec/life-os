import { config as loadEnv } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "@node-rs/argon2";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Must match src/lib/auth/password.ts's ARGON2_OPTIONS.
const ARGON2_OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

async function main() {
  const username = process.env.SUPER_ADMIN_USERNAME;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!username || !password) {
    console.log(
      "Skipping Super Admin seed: set SUPER_ADMIN_USERNAME and SUPER_ADMIN_PASSWORD to create one.",
    );
    return;
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log(`Super Admin "${username}" already exists, skipping.`);
    return;
  }

  const passwordHash = await hash(password, ARGON2_OPTIONS);
  await prisma.user.create({
    data: { username, passwordHash, role: "SUPER_ADMIN" },
  });

  console.log(`Created Super Admin "${username}".`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
