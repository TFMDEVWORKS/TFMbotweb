
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSession } from "@/lib/auth";

const schema = z.object({
  storeName: z.string().min(2),
  category: z.string().min(2),
  whatsappPhone: z.string().min(10),
  email: z.string().email(),
  password: z.string().min(6),
});

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ status: "error", message: "Invalid input", data: parsed.error.flatten() }, { status: 400 });
  }

  const { storeName, category, whatsappPhone, email, password } = parsed.data;
  const normalizedPhone = whatsappPhone.startsWith("+") ? whatsappPhone : `+${whatsappPhone}`;

  const existing = await prisma.merchant.findUnique({ where: { whatsappPhone: normalizedPhone } });
  if (existing) {
    return NextResponse.json({ status: "error", message: "A store already exists for this WhatsApp number" }, { status: 409 });

  }

  const baseSlug = slugify(storeName);
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.store.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const passwordHash = await hashPassword(password);

  const merchant = await prisma.merchant.create({
    data: {
      whatsappPhone: normalizedPhone,
      name: storeName,
      email,
      passwordHash,
      status: "PENDING",
      store: { create: { name: storeName, slug, category } },
    },
    include: { store: true },
  });

  await createSession({ merchantId: merchant.id });

  return NextResponse.json({ status: "success", message: "Store created", data: { slug: merchant.store?.slug } });
}
