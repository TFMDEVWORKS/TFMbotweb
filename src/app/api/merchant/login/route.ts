
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ status: "error", message: "Invalid input" }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const merchant = await prisma.merchant.findFirst({ where: { email } });

  if (!merchant || !merchant.passwordHash || !(await verifyPassword(password, merchant.passwordHash))) {
    return NextResponse.json({ status: "error", message: "Invalid email or password" }, { status: 401 });
  }

  await createSession({ merchantId: merchant.id });

  return NextResponse.json({ status: "success", message: "Logged in" });
}
