
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/merchant/login");

  const merchant = await prisma.merchant.findUnique({
    where: { id: session.merchantId },
    include: {
      store: { include: { products: true } },
      subscription: true,
    },
  });

  if (!merchant || !merchant.store) redirect("/merchant/login");

  const orderCount = await prisma.order.count({ where: { storeId: merchant.store.id } });
  const paidRevenue = await prisma.order.aggregate({
    where: { storeId: merchant.store.id, status: { in: ["PAID", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED"] } },
    _sum: { totalMinorUnits: true },
  });

  const revenue = ((paidRevenue._sum.totalMinorUnits ?? 0) / 100).toFixed(2);

  return (
    <div className="dashboard">
      <h1>{merchant.store.name}</h1>
      <p className="subtitle">Store status: {merchant.status} · mall.app/{merchant.store.slug}</p>


      <div className="stat-grid">
        <div className="card">
          <div className="stat-value">{merchant.store.products.length}</div>
          <div className="stat-label">Products listed</div>
        </div>
        <div className="card">
          <div className="stat-value">{orderCount}</div>
          <div className="stat-label">Total orders</div>
        </div>
        <div className="card">
          <div className="stat-value">GHS {revenue}</div>
          <div className="stat-label">Revenue to date</div>
        </div>
      </div>

      <div className="card">
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 14 }}>
          Product management with photo uploads, order tracking, and subscription billing are coming in the next build steps.
        </p>
      </div>
    </div>
  );
}
