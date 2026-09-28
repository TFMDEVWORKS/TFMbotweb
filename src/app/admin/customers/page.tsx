"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminWorkspace from "@/components/admin/AdminWorkspace";
import { adminApi, ApiError, setToken, type Customer } from "@/lib/adminApi";
import { money, pick, shortDate, text } from "@/lib/adminData";

const PAGE_SIZE = 20;

export default function CustomersPage() {
  const router = useRouter();
  const [items, setItems] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let alive = true;
    setState("loading"); setError("");
    adminApi.customers({ page, pageSize: PAGE_SIZE, search })
      .then((result) => { if (alive) { setItems(result.items); setTotal(result.total); setState("ready"); } })
      .catch((cause: unknown) => {
        if (!alive) return;
        if (cause instanceof ApiError && cause.status === 401) { setToken(null); router.replace("/admin/login"); return; }
        setError(cause instanceof Error ? cause.message : "Could not load customers."); setState("error");
      });
    return () => { alive = false; };
  }, [page, search, retry, router]);

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return <AdminWorkspace>
    <div className="admin-heading page-heading"><div><div className="admin-kicker">MARKETPLACE COMMUNITY</div><h1>Customers</h1><p className="subtitle">Find shoppers and review their marketplace activity.</p></div></div>
    <section className="admin-panel data-panel">
      <div className="panel-heading"><div><h2>All customers</h2><p>{total.toLocaleString()} registered shoppers</p></div><span className="count-chip">{total} total</span></div>
      <div className="list-toolbar"><label className="admin-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Search by name or phone" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} aria-label="Search customers by name or phone" /></label></div>
      {state === "loading" && <div className="admin-loading"><span className="loading-orbit" />Loading customers…</div>}
      {state === "error" && <div className="list-error" role="alert"><div><b>Customers could not be loaded</b><p>{error}</p></div><button className="page-btn" onClick={() => setRetry((value) => value + 1)}>Try again</button></div>}
      {state === "ready" && items.length === 0 && <div className="admin-empty"><span>⌕</span><b>No customers found</b><p>Try a different name or phone number.</p></div>}
      {state === "ready" && items.length > 0 && <div className="table-scroll"><table className="admin-table full-data-table"><thead><tr><th>CUSTOMER</th><th>JOINED</th><th>ORDERS</th><th>TOTAL SPENT</th></tr></thead><tbody>
        {items.map((customer) => {
          const name = text(pick(customer, "name", "fullName", "customerName"), "Customer");
          const phone = text(pick(customer, "phone", "phoneNumber", "whatsappPhone"));
          return <tr key={customer.id}><td><Link className="customer-identity" href={`/admin/orders?search=${encodeURIComponent(phone === "—" ? "" : phone)}`}><span className="store-avatar">{name.slice(0, 1).toUpperCase()}</span><span><b>{name}</b><small>{phone}</small></span></Link></td><td>{shortDate(customer.createdAt)}</td><td>{customer.orderCount}</td><td className="spent-value">{money(customer.totalSpentMinorUnits)}</td></tr>;
        })}
      </tbody></table></div>}
      <div className="table-footer"><span>Showing {from}–{to} of {total}</span><div><button className="page-btn" disabled={page <= 1 || state === "loading"} onClick={() => setPage((value) => value - 1)}>← Previous</button><button className="page-btn" disabled={page * PAGE_SIZE >= total || state === "loading"} onClick={() => setPage((value) => value + 1)}>Next →</button></div></div>
    </section>
  </AdminWorkspace>;
}
