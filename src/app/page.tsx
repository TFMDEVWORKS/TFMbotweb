import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Reveal from "@/components/Reveal";
import StoreExplorer, { type StoreCardData } from "@/components/StoreExplorer";

export const dynamic = "force-dynamic";

function toCardData(s: {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  merchant: { whatsappPhone: string };
  _count: { products: number };
  products: { imageUrl: string | null }[];
}): StoreCardData {
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    category: s.category,
    description: s.description,
    productCount: s._count.products,
    coverImage: s.products[0]?.imageUrl ?? null,
    whatsapp: s.merchant.whatsappPhone.replace(/\D/g, ""),
  };
}

export default async function HomePage() {
  const stores = await prisma.store.findMany({
    where: { isActive: true, merchant: { status: "ACTIVE" } },
    orderBy: { createdAt: "desc" },
    take: 24,
    include: {
      merchant: { select: { whatsappPhone: true } },
      _count: { select: { products: true } },
      products: {
        where: { isAvailable: true, imageUrl: { not: null } },
        take: 1,
        select: { imageUrl: true },
      },
    },
  });

  const cards = stores.map(toCardData);
  const storeCount = await prisma.store.count({
    where: { isActive: true, merchant: { status: "ACTIVE" } },
  });

  return (
    <div className="home">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-inner">
          <Reveal>
            <p className="hero-badge">
              <span className="pulse-dot" aria-hidden="true" />
              {storeCount} local stores live now
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="hero-title">
              Ghana&apos;s market,
              <br />
              <span className="gradient-text">one chat away.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="hero-sub">
              Browse fashion, food, electronics and more from verified local sellers —
              then order instantly through WhatsApp. No app download, no checkout queues.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="hero-cta">
              <a href="#stores" className="btn btn-primary btn-lg">
                Shop stores
              </a>
              <Link href="/merchant/signup" className="btn btn-ghost btn-lg">
                Sell on TFM
              </Link>
            </div>
          </Reveal>
          <Reveal delay={320}>
            <dl className="hero-stats">
              <div>
                <dt>Stores</dt>
                <dd>{storeCount}</dd>
              </div>
              <div>
                <dt>Order via</dt>
                <dd>WhatsApp</dd>
              </div>
              <div>
                <dt>Signup cost</dt>
                <dd>Free</dd>
              </div>
            </dl>
          </Reveal>
        </div>
        <div className="hero-glow" aria-hidden="true" />
      </section>

      {/* ── Live store directory ─────────────────────────── */}
      <section id="stores" className="section">
        <div className="section-inner">
          <Reveal>
            <p className="eyebrow">Live marketplace</p>
            <h2 className="section-title">Explore stores</h2>
            <p className="section-sub">Real shops, updated the moment sellers add products.</p>
          </Reveal>
          <Reveal delay={120}>
            <StoreExplorer stores={cards} />
          </Reveal>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section id="how" className="section section-alt">
        <div className="section-inner">
          <Reveal>
            <p className="eyebrow">How it works</p>
            <h2 className="section-title">From browsing to delivery in three taps</h2>
          </Reveal>
          <ol className="steps">
            <Reveal as="li" delay={0}>
              <span className="step-num" aria-hidden="true">1</span>
              <h3>Find your store</h3>
              <p>Search the mall above by name or category — fashion, food, electronics, beauty and more.</p>
            </Reveal>
            <Reveal as="li" delay={120}>
              <span className="step-num" aria-hidden="true">2</span>
              <h3>Chat on WhatsApp</h3>
              <p>Tap “Order on WhatsApp” and a pre-filled message opens a chat with the seller. No new app needed.</p>
            </Reveal>
            <Reveal as="li" delay={240}>
              <span className="step-num" aria-hidden="true">3</span>
              <h3>Pay &amp; receive</h3>
              <p>Pay securely with mobile money or card, get a digital receipt, and track delivery to your door.</p>
            </Reveal>
          </ol>
        </div>
      </section>

      {/* ── Seller CTA ───────────────────────────────────── */}
      <section id="sell" className="section">
        <div className="section-inner">
          <Reveal>
            <div className="cta-banner">
              <div>
                <h2>Own a shop? Put it on TFM.</h2>
                <p>
                  Create your storefront in minutes, add products over WhatsApp or the web,
                  and get paid straight to your pocket. First month free.
                </p>
              </div>
              <Link href="/merchant/signup" className="btn btn-primary btn-lg">
                Open your store
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}