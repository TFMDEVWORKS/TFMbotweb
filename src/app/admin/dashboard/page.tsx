"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminApi, ApiError, setToken, type Order, type Store } from "@/lib/adminApi";
import AdminWorkspace from "@/components/admin/AdminWorkspace";

const money = (amount: number) => new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(amount / 100);
const shortDate = (value: string) => new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
const statusLabel: Record<string, string> = { ACTIVE: "Active", PENDING: "Pending", SUSPENDED: "Suspended", PAST_DUE: "Past due", CANCELLED: "Cancelled" };

type LoadState = "loading" | "ready" | "error";

function PanelState({ state, error, retry, empty = false }: { state: LoadState; error: string; retry: () => void; empty?: boolean }) {
  if (state === "loading") return <div className="admin-loading panel-state"><span className="loading-orbit" />Loading activity…</div>;
  if (state === "error") return <div className="panel-error" role="alert"><span>{error}</span><button className="page-btn" onClick={retry}>Try again</button></div>;
  if (empty) return <div className="admin-empty panel-state"><b>Nothing to show yet</b><p>New marketplace activity will appear here.</p></div>;
  return null;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof adminApi.dashboard>> | null>(null);
  const [statsState, setStatsState] = useState<LoadState>("loading");
  const [statsError, setStatsError] = useState("");
  const [statsRetry, setStatsRetry] = useState(0);
  const [recentStores, setRecentStores] = useState<Store[]>([]);
  const [storesState, setStoresState] = useState<LoadState>("loading");
  const [storesError, setStoresError] = useState("");
  const [storesRetry, setStoresRetry] = useState(0);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [ordersState, setOrdersState] = useState<LoadState>("loading");
  const [ordersError, setOrdersError] = useState("");
  const [ordersRetry, setOrdersRetry] = useState(0);

  const loadStats = useCallback(async () => {
    setStatsState("loading"); setStatsError("");
    try { setStats(await adminApi.dashboard()); setStatsState("ready"); }
    catch (error) {
      if (error instanceof ApiError && error.status === 401) { setToken(null); window.location.assign("/admin/login"); return; }
      setStatsError(error instanceof Error ? error.message : "Could not load overview statistics."); setStatsState("error");
    }
  }, []);
  const loadRecentStores = useCallback(async () => {
    setStoresState("loading"); setStoresError("");
    try { setRecentStores((await adminApi.stores({ page: 1, pageSize: 8 })).items); setStoresState("ready"); }
    catch (error) {
      if (error instanceof ApiError && error.status === 401) { setToken(null); window.location.assign("/admin/login"); return; }
      setStoresError(error instanceof Error ? error.message : "Could not load recent stores."); setStoresState("error");
    }
  }, []);
  const loadRecentOrders = useCallback(async () => {
    setOrdersState("loading"); setOrdersError("");
    try { setRecentOrders((await adminApi.orders({ page: 1, pageSize: 8 })).items); setOrdersState("ready"); }
    catch (error) {
      if (error instanceof ApiError && error.status === 401) { setToken(null); window.location.assign("/admin/login"); return; }
      setOrdersError(error instanceof Error ? error.message : "Could not load recent orders."); setOrdersState("error");
    }
  }, []);

  useEffect(() => { void loadStats(); }, [loadStats, statsRetry]);
  useEffect(() => { void loadRecentStores(); }, [loadRecentStores, storesRetry]);
  useEffect(() => { void loadRecentOrders(); }, [loadRecentOrders, ordersRetry]);

  return <AdminWorkspace>
    <div className="admin-heading page-heading"><div><div className="admin-kicker">PLATFORM OPERATIONS</div><h1>Marketplace overview</h1><p className="subtitle">A live snapshot of stores, customers and orders.</p></div><Link className="btn btn-primary btn-sm" href="/admin/stores">Manage stores <span aria-hidden="true">→</span></Link></div>

    {statsState === "ready" && stats && <div className="admin-stats overview-stats">
      <article className="admin-stat"><div className="admin-stat-head"><span className="stat-icon violet">S</span><span className="stat-trend">{stats.stores.pending} pending review</span></div><strong>{stats.stores.total.toLocaleString()}</strong><span>Registered stores</span><div className="stat-foot"><b>{stats.stores.active}</b> active · <b>{stats.stores.suspended}</b> suspended</div></article>
      <article className="admin-stat"><div className="admin-stat-head"><span className="stat-icon blue">C</span><span className="stat-trend">Community</span></div><strong>{stats.customers.total.toLocaleString()}</strong><span>Total customers</span><div className="stat-foot">People shopping on the mall</div></article>
      <article className="admin-stat"><div className="admin-stat-head"><span className="stat-icon green">O</span><span className="stat-trend">Orders</span></div><strong>{stats.orders.total.toLocaleString()}</strong><span>Orders placed</span><div className="stat-foot"><b>{stats.orders.pendingPayment}</b> awaiting payment</div></article>
      <article className="admin-stat"><div className="admin-stat-head"><span className="stat-icon amber">₵</span><span className="stat-trend">All time</span></div><strong className="revenue-value">{money(stats.revenueMinorUnits)}</strong><span>Order revenue</span><div className="stat-foot">Across paid and fulfilled orders</div></article>
    </div>}
    {statsState !== "ready" && <section className="admin-panel stats-panel"><div className="panel-heading"><div><h2>Marketplace metrics</h2><p>Stores, customers, orders and revenue.</p></div></div><PanelState state={statsState} error={statsError} retry={() => setStatsRetry((value) => value + 1)} /></section>}

    <div className="overview-panels">
      <section className="admin-panel activity-panel"><div className="panel-heading"><div><h2>Recent stores</h2><p>The latest sellers joining the marketplace.</p></div><Link className="text-link" href="/admin/stores">View all</Link></div>
        <PanelState state={storesState} error={storesError} retry={() => setStoresRetry((value) => value + 1)} empty={storesState === "ready" && recentStores.length === 0} />
        {storesState === "ready" && recentStores.length > 0 && <div className="activity-list">{recentStores.map((store) => <Link className="activity-row" href={`/admin/stores/${encodeURIComponent(store.id)}`} key={store.id}><span className="store-avatar">{store.storeName?.slice(0, 1).toUpperCase() ?? "S"}</span><span className="activity-primary"><b>{store.storeName}</b><small>{store.category || store.whatsappPhone}</small></span><span className={`status-badge ${store.status.toLowerCase()}`}><i />{statusLabel[store.status]}</span><time>{shortDate(store.createdAt)}</time></Link>)}</div>}
      </section>
      <section className="admin-panel activity-panel"><div className="panel-heading"><div><h2>Recent orders</h2><p>Latest customer purchases across stores.</p></div><Link className="text-link" href="/admin/orders">View all</Link></div>
        <PanelState state={ordersState} error={ordersError} retry={() => setOrdersRetry((value) => value + 1)} empty={ordersState === "ready" && recentOrders.length === 0} />
        {ordersState === "ready" && recentOrders.length > 0 && <div className="activity-list">{recentOrders.map((order) => <Link className="activity-row" href={`/admin/orders/${encodeURIComponent(order.orderCode)}`} key={order.id}><span className="order-mark">#</span><span className="activity-primary"><b>{order.orderCode}</b><small>{order.storeName} · {order.customerName || order.customerPhone}</small></span><span className={`status-badge order-${order.status.toLowerCase()}`}><i />{order.status.replaceAll("_", " ")}</span><strong className="activity-amount">{money(order.totalMinorUnits)}</strong></Link>)}</div>}
      </section>
    </div>
  </AdminWorkspace>;
}
