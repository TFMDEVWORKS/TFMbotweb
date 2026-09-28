"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminWorkspace from "@/components/admin/AdminWorkspace";
import { adminApi, ApiError, setToken, type Order, type OrderStatus } from "@/lib/adminApi";
import { money, pick, shortDate, statusText, text } from "@/lib/adminData";

const PAGE_SIZE = 20;
const orderStatuses: OrderStatus[] = ["CART", "PENDING_PAYMENT", "PAID", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];

export default function OrdersPage() {
  const router = useRouter();
  const [items, setItems] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | OrderStatus>("ALL");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const initialSearch = new URLSearchParams(window.location.search).get("search");
    if (initialSearch) setSearch(initialSearch);
  }, []);
  useEffect(() => {
    let alive = true;
    setState("loading"); setError("");
    adminApi.orders({ page, pageSize: PAGE_SIZE, status: status === "ALL" ? undefined : status, search })
      .then((result) => { if (alive) { setItems(result.items); setTotal(result.total); setState("ready"); } })
      .catch((cause: unknown) => {
        if (!alive) return;
        if (cause instanceof ApiError && cause.status === 401) { setToken(null); router.replace("/admin/login"); return; }
        setError(cause instanceof Error ? cause.message : "Could not load orders."); setState("error");
      });
    return () => { alive = false; };
  }, [page, status, search, retry, router]);

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return <AdminWorkspace>
    <div className="admin-heading page-heading"><div><div className="admin-kicker">MARKETPLACE ACTIVITY</div><h1>Orders</h1><p className="subtitle">Track customer purchases and payment progress.</p></div></div>
    <section className="admin-panel data-panel">
      <div className="panel-heading"><div><h2>All orders</h2><p>{total.toLocaleString()} marketplace orders</p></div><span className="count-chip">{total} total</span></div>
      <div className="list-toolbar"><label className="admin-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Search code, customer, phone or store" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} aria-label="Search orders" /></label><select aria-label="Filter by order status" value={status} onChange={(event) => { setStatus(event.target.value as typeof status); setPage(1); }}><option value="ALL">All statuses</option>{orderStatuses.map((value) => <option key={value} value={value}>{statusText(value)}</option>)}</select></div>
      {state === "loading" && <div className="admin-loading"><span className="loading-orbit" />Loading orders…</div>}
      {state === "error" && <div className="list-error" role="alert"><div><b>Orders could not be loaded</b><p>{error}</p></div><button className="page-btn" onClick={() => setRetry((value) => value + 1)}>Try again</button></div>}
      {state === "ready" && items.length === 0 && <div className="admin-empty"><span>#</span><b>No orders found</b><p>Try a different search or status filter.</p></div>}
      {state === "ready" && items.length > 0 && <div className="table-scroll"><table className="admin-table full-data-table"><thead><tr><th>ORDER</th><th>STORE</th><th>CUSTOMER</th><th>STATUS</th><th>TOTAL</th><th className="optional-column">DELIVERY</th><th>CREATED</th><th className="optional-column">PAID AT</th></tr></thead><tbody>
        {items.map((order) => <tr key={order.id}><td><Link className="table-primary-link" href={`/admin/orders/${encodeURIComponent(order.orderCode)}`}>{order.orderCode}</Link></td><td>{text(pick(order, "storeName", "store.name"))}</td><td><span className="table-person"><b>{text(pick(order, "customerName", "customer.name"), "Customer")}</b><small>{text(pick(order, "customerPhone", "customer.phone"))}</small></span></td><td><span className={`status-badge order-${order.status.toLowerCase()}`}><i />{statusText(order.status)}</span></td><td className="spent-value">{money(order.totalMinorUnits)}</td><td className="optional-column">{money(order.deliveryFeeMinorUnits ?? 0)}</td><td>{shortDate(order.createdAt)}</td><td className="optional-column">{shortDate(order.paidAt)}</td></tr>)}
      </tbody></table></div>}
      <div className="table-footer"><span>Showing {from}–{to} of {total}</span><div><button className="page-btn" disabled={page <= 1 || state === "loading"} onClick={() => setPage((value) => value - 1)}>← Previous</button><button className="page-btn" disabled={page * PAGE_SIZE >= total || state === "loading"} onClick={() => setPage((value) => value + 1)}>Next →</button></div></div>
    </section>
  </AdminWorkspace>;
}
