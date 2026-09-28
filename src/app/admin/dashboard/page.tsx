"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi, ApiError, getToken, setToken, type MerchantStatus, type Store } from "@/lib/adminApi";
import toast from "react-hot-toast";

const money = (amount: number) => new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(amount / 100);
const date = (value: string) => new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
const labels: Record<MerchantStatus, string> = { ACTIVE: "Active", PENDING: "Pending", SUSPENDED: "Suspended" };

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof adminApi.dashboard>> | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"ALL" | MerchantStatus>("ALL");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [dashboardState, setDashboardState] = useState<"loading" | "ready" | "error">("loading");
  const [storesState, setStoresState] = useState<"loading" | "ready" | "error">("loading");
  const [dashboardError, setDashboardError] = useState("");
  const [storesError, setStoresError] = useState("");
  const [actionError, setActionError] = useState("");
  const [dashboardRetry, setDashboardRetry] = useState(0);
  const [storesRetry, setStoresRetry] = useState(0);

  const loadStores = useCallback(async () => {
    const result = await adminApi.stores({ page, pageSize: 10, status: status === "ALL" ? undefined : status, search });
    setStores(result.items);
    setTotal(result.total);
  }, [page, status, search]);

  useEffect(() => {
    let alive = true;
    if (!getToken()) {
      router.replace("/admin/login");
      return () => { alive = false; };
    }
    setDashboardState("loading");
    setDashboardError("");
    Promise.all([adminApi.me(), adminApi.dashboard()]).then(([me, data]) => {
      if (!alive) return;
      setUser(me.admin);
      setStats(data);
      setDashboardState("ready");
    }).catch((e: unknown) => {
      if (!alive) return;
      if (e instanceof ApiError && e.status === 401) {
        setToken(null);
        router.replace("/admin/login");
        return;
      }
      const message = e instanceof Error ? e.message : "Could not load dashboard data.";
      setDashboardError(message);
      setDashboardState("error");
    });
    return () => { alive = false; };
  }, [router, dashboardRetry]);

  useEffect(() => {
    if (!getToken()) return;
    let alive = true;
    setStoresState("loading");
    setStoresError("");
    loadStores().then(() => {
      if (alive) setStoresState("ready");
    }).catch((e: unknown) => {
      if (!alive) return;
      if (e instanceof ApiError && e.status === 401) {
        setToken(null);
        router.replace("/admin/login");
        return;
      }
      setStoresError(e instanceof Error ? e.message : "Could not load stores.");
      setStoresState("error");
    });
    return () => { alive = false; };
  }, [loadStores, storesRetry, router]);

  async function signOut() {
    try { await adminApi.logout(); } catch { /* Clear local credentials even if the service is offline. */ }
    setToken(null);
    toast.success("Signed out");
    router.replace("/admin/login");
  }

  async function toggleStore(store: Store) {
    let reason: string | undefined;
    if (store.status === "ACTIVE") {
      reason = window.prompt(`Why are you suspending ${store.storeName}?`)?.trim();
      if (!reason || reason.length < 3) return;
    }
    setBusy(true);
    setActionError("");
    try {
      await adminApi.setStoreStatus(store.id, store.status !== "ACTIVE", reason);
      await Promise.all([loadStores(), adminApi.dashboard().then(setStats)]);
      toast.success(store.status === "ACTIVE" ? "Store suspended" : "Store activated");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setToken(null);
        router.replace("/admin/login");
      } else {
        const message = e instanceof Error ? e.message : "Action failed.";
        setActionError(message);
        toast.error(message);
      }
    } finally { setBusy(false); }
  }

  async function exportCsv() {
    setActionError("");
    try {
      await adminApi.exportStores();
      toast.success("Store export downloaded");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Export failed.";
      setActionError(message);
      toast.error(message);
    }
  }

  return <div className="admin-shell">
    <aside className="admin-rail">
      <a className="admin-brand" href="/admin/dashboard"><span className="admin-brand-mark">W</span><span>WhatsApp<span className="brand-accent">Mall</span><small>ADMIN CONSOLE</small></span></a>
      <div className="rail-caption">WORKSPACE</div>
      <a className="rail-link is-current" href="#overview"><span aria-hidden="true">◉</span> Overview</a>
      <a className="rail-link" href="#stores"><span aria-hidden="true">▦</span> Stores</a>
      <div className="rail-bottom"><span className="admin-avatar">{user?.name?.slice(0, 1).toUpperCase() ?? "A"}</span><span className="admin-user">{user?.name ?? "Administrator"}<small>{user?.email ?? "Platform admin"}</small></span><button className="icon-btn" aria-label="Sign out" title="Sign out" onClick={signOut}>↗</button></div>
    </aside>
    <main className="admin-main" id="overview">
      <header className="admin-topbar"><div className="admin-breadcrumb">Workspace <span>/</span> Overview</div><div className="admin-top-actions"><span className="live-pill"><i /> Live platform</span><button className="btn btn-ghost btn-sm" onClick={() => setDashboardRetry((value) => value + 1)}>↻ <span>Refresh</span></button></div></header>
      <section className="admin-content">
        <div className="admin-heading"><div><div className="admin-kicker">PLATFORM OPERATIONS</div><h1>Good to see you{user?.name ? `, ${user.name.split(" ")[0]}` : ""}.</h1><p className="subtitle">Here’s what’s happening across your marketplace.</p></div><button className="btn btn-primary btn-sm" onClick={exportCsv}>↓ <span>Export stores</span></button></div>
        {actionError && <div className="error" role="alert">{actionError}</div>}
        {dashboardState === "error" && <div className="admin-state-error" role="alert"><div><b>Dashboard data is unavailable</b><p>{dashboardError}</p></div><button className="page-btn" onClick={() => setDashboardRetry((value) => value + 1)}>Try again</button></div>}
        {dashboardState === "loading" && <div className="admin-loading"><span className="loading-orbit" />Loading your marketplace…</div>}
        {dashboardState === "ready" && stats && <>
          <div className="admin-stats">
            <article className="admin-stat"><div className="admin-stat-head"><span className="stat-icon green">▦</span><span className="stat-trend">Platform</span></div><strong>{stats.stores.total.toLocaleString()}</strong><span>Registered stores</span><div className="stat-foot"><b>{stats.stores.active}</b> active <span>·</span> <b>{stats.stores.pending}</b> awaiting review</div></article>
            <article className="admin-stat"><div className="admin-stat-head"><span className="stat-icon blue">♙</span><span className="stat-trend">Community</span></div><strong>{stats.customers.total.toLocaleString()}</strong><span>Total customers</span><div className="stat-foot">People shopping on the mall</div></article>
            <article className="admin-stat"><div className="admin-stat-head"><span className="stat-icon violet">◈</span><span className="stat-trend">All time</span></div><strong>{stats.orders.total.toLocaleString()}</strong><span>Orders placed</span><div className="stat-foot"><b>{stats.orders.pendingPayment}</b> awaiting payment</div></article>
            <article className="admin-stat"><div className="admin-stat-head"><span className="stat-icon amber">₵</span><span className="stat-trend">All time</span></div><strong className="revenue-value">{money(stats.revenueMinorUnits)}</strong><span>Order revenue</span><div className="stat-foot">Across paid and fulfilled orders</div></article>
          </div>
          <section className="admin-panel" id="stores">
            <div className="panel-heading"><div><h2>Store directory</h2><p>Review and manage marketplace sellers.</p></div><span className="count-chip">{total} stores</span></div>
            <div className="store-toolbar"><label className="admin-search"><span aria-hidden="true">⌕</span><input aria-label="Search stores" type="search" placeholder="Search stores…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></label><select aria-label="Filter stores by status" value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }}><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="PENDING">Pending</option><option value="SUSPENDED">Suspended</option></select></div>
            <div className={`table-scroll ${storesState === "loading" ? "is-loading" : ""}`} aria-busy={storesState === "loading"}>
              {storesState === "loading" && <div className="table-state"><span className="loading-orbit" />Loading stores…</div>}
              {storesState === "error" && <div className="table-state table-state-error" role="alert"><b>Stores could not be loaded</b><span>{storesError}</span><button className="page-btn" onClick={() => setStoresRetry((value) => value + 1)}>Try again</button></div>}
              <table className="admin-table"><thead><tr><th>STORE</th><th>STATUS</th><th className="optional-column subscription-column">SUBSCRIPTION</th><th className="optional-column products-column">PRODUCTS</th><th className="optional-column orders-column">ORDERS</th><th className="optional-column joined-column">JOINED</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{stores.map((store) => <tr key={store.id}><td><div className="store-identity"><span className="store-avatar">{store.storeName.slice(0, 1).toUpperCase()}</span><span><b>{store.storeName}</b><small>{store.category ?? store.whatsappPhone}</small></span></div></td><td><span className={`status-badge ${store.status.toLowerCase()}`}><i />{labels[store.status]}</span></td><td className="optional-column subscription-column"><span className={`subscription-label ${store.subscriptionStatus === "ACTIVE" ? "sub-active" : ""}`}>{store.subscriptionStatus?.replace("_", " ") ?? "No plan"}</span></td><td className="optional-column products-column">{store.productCount}</td><td className="optional-column orders-column">{store.orderCount}</td><td className="optional-column joined-column">{date(store.createdAt)}</td><td><button className="table-action" disabled={busy || store.status === "PENDING"} onClick={() => toggleStore(store)}>{store.status === "ACTIVE" ? "Suspend" : store.status === "SUSPENDED" ? "Activate" : "—"}</button></td></tr>)}</tbody></table>
              {storesState === "ready" && !stores.length && <div className="admin-empty"><span>⌕</span><b>No stores found</b><p>Try another search or status filter.</p></div>}
            </div>
            <div className="table-footer"><span>Showing {stores.length ? (page - 1) * 10 + 1 : 0}–{Math.min(page * 10, total)} of {total}</span><div><button className="page-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Previous</button><button className="page-btn" disabled={page * 10 >= total} onClick={() => setPage(page + 1)}>Next →</button></div></div>
          </section>
          <footer className="admin-footer">WhatsAppMall admin <span>·</span> Marketplace operations</footer>
        </>}
      </section>
    </main>
  </div>;
}
