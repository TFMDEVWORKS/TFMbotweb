"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminWorkspace from "@/components/admin/AdminWorkspace";
import { adminApi, ApiError, setToken, type MerchantStatus, type Store } from "@/lib/adminApi";
import { shortDate, statusText } from "@/lib/adminData";
import toast from "react-hot-toast";

const PAGE_SIZE = 20;

export default function StoresPage() {
  const router = useRouter();
  const [items, setItems] = useState<Store[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | MerchantStatus>("ALL");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let alive = true;
    setState("loading"); setError("");
    adminApi.stores({ page, pageSize: PAGE_SIZE, status: status === "ALL" ? undefined : status, search })
      .then((result) => { if (alive) { setItems(result.items); setTotal(result.total); setState("ready"); } })
      .catch((cause: unknown) => {
        if (!alive) return;
        if (cause instanceof ApiError && cause.status === 401) { setToken(null); router.replace("/admin/login"); return; }
        setError(cause instanceof Error ? cause.message : "Could not load stores."); setState("error");
      });
    return () => { alive = false; };
  }, [page, status, search, retry, router]);

  async function toggleStore(store: Store, activate: boolean) {
    let reason: string | undefined;
    if (!activate) {
      reason = window.prompt(`Enter a reason for suspending ${store.storeName} (3–500 characters):`)?.trim();
      if (!reason || reason.length < 3 || reason.length > 500) {
        if (reason) toast.error("The reason must be between 3 and 500 characters.");
        return;
      }
    }
    setBusyId(store.id);
    try {
      await adminApi.setStoreStatus(store.id, activate, reason);
      toast.success(activate ? "Store activated" : "Store suspended");
      setRetry((value) => value + 1);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) { setToken(null); router.replace("/admin/login"); }
      else toast.error(cause instanceof Error ? cause.message : "Could not update the store.");
    } finally { setBusyId(""); }
  }

  async function exportCsv() {
    try { await adminApi.exportStores(); toast.success("Store export downloaded"); }
    catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) { setToken(null); router.replace("/admin/login"); }
      else toast.error(cause instanceof Error ? cause.message : "Could not export stores.");
    }
  }

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return <AdminWorkspace>
    <div className="admin-heading page-heading"><div><div className="admin-kicker">SELLER DIRECTORY</div><h1>Stores & merchants</h1><p className="subtitle">Review sellers and manage their marketplace access.</p></div><button className="btn btn-primary btn-sm" onClick={exportCsv}>Export CSV <span aria-hidden="true">↓</span></button></div>
    <section className="admin-panel data-panel">
      <div className="panel-heading"><div><h2>All stores</h2><p>{total.toLocaleString()} marketplace sellers</p></div><span className="count-chip">{total} total</span></div>
      <div className="list-toolbar"><label className="admin-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Search by store or phone" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} aria-label="Search stores by name or phone" /></label><select aria-label="Filter by store status" value={status} onChange={(event) => { setStatus(event.target.value as typeof status); setPage(1); }}><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="PENDING">Pending</option><option value="SUSPENDED">Suspended</option></select></div>
      {state === "loading" && <div className="admin-loading"><span className="loading-orbit" />Loading stores…</div>}
      {state === "error" && <div className="list-error" role="alert"><div><b>Stores could not be loaded</b><p>{error}</p></div><button className="page-btn" onClick={() => setRetry((value) => value + 1)}>Try again</button></div>}
      {state === "ready" && items.length === 0 && <div className="admin-empty"><span>⌕</span><b>No stores found</b><p>Try another search or status filter.</p></div>}
      {state === "ready" && items.length > 0 && <div className="table-scroll"><table className="admin-table full-data-table"><thead><tr><th>STORE</th><th>WHATSAPP</th><th>STATUS</th><th>SUBSCRIPTION</th><th>PRODUCTS</th><th>ORDERS</th><th>JOINED</th><th>ACTIONS</th></tr></thead><tbody>
        {items.map((store) => <tr key={store.id}><td><Link className="store-identity store-row-link" href={`/admin/stores/${encodeURIComponent(store.id)}`}><span className="store-avatar">{store.storeName.slice(0, 1).toUpperCase()}</span><span><b>{store.storeName}</b><small>{store.category || "Uncategorised"}</small></span></Link></td><td>{store.whatsappPhone}</td><td><span className={`status-badge ${store.status.toLowerCase()}`}><i />{statusText(store.status)}</span></td><td><span className={`subscription-label ${store.subscriptionStatus === "ACTIVE" ? "sub-active" : ""}`}>{statusText(store.subscriptionStatus)}</span></td><td>{store.productCount}</td><td>{store.orderCount}</td><td>{shortDate(store.createdAt)}</td><td><div className="row-actions"><Link className="table-action" href={`/admin/stores/${encodeURIComponent(store.id)}`}>View</Link>{store.status !== "ACTIVE" && <button className="table-action" disabled={busyId === store.id} onClick={() => void toggleStore(store, true)}>{busyId === store.id ? "Saving…" : "Activate"}</button>}{store.status !== "SUSPENDED" && <button className="table-action" disabled={busyId === store.id} onClick={() => void toggleStore(store, false)}>{busyId === store.id ? "Saving…" : "Suspend"}</button>}</div></td></tr>)}
      </tbody></table></div>}
      <div className="table-footer"><span>Showing {from}–{to} of {total}</span><div><button className="page-btn" disabled={page <= 1 || state === "loading"} onClick={() => setPage((value) => value - 1)}>← Previous</button><button className="page-btn" disabled={page * PAGE_SIZE >= total || state === "loading"} onClick={() => setPage((value) => value + 1)}>Next →</button></div></div>
    </section>
  </AdminWorkspace>;
}
