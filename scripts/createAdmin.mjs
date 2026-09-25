
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const [, , email, password, name] = process.argv;

if (!email || !password || !name) {
  console.error('Usage: node scripts/createAdmin.mjs "email" "password" "Name"');
  process.exit(1);
}

const prisma = new PrismaClient();

const passwordHash = await bcrypt.hash(password, 10);

const admin = await prisma.adminUser.create({
  data: { email, passwordHash, name },
});

console.log(`Admin created: ${admin.email}`);
await prisma.$disconnect();