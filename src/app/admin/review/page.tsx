"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminWorkspace from "@/components/admin/AdminWorkspace";
import { adminApi, ApiError, setToken, type MerchantStatus, type Store } from "@/lib/adminApi";
import { countValue, shortDate, statusText, text } from "@/lib/adminData";
import toast from "react-hot-toast";

type State = "loading" | "ready" | "error";
const REVIEW_PAGE_SIZE = 20;

function ReviewList({ title, description, items, state, error, retry, onAction, busyId, pending = false, total, page, onPage }: {
  title: string; description: string; items: Store[]; state: State; error: string; retry: () => void;
  onAction: (store: Store, activate: boolean) => void; busyId: string; pending?: boolean;
  total: number; page: number; onPage: (page: number) => void;
}) {
  return <section className="admin-panel review-list-panel"><div className="panel-heading"><div><h2>{title}</h2><p>{description}</p></div><span className="count-chip">{total} total</span></div>
    {state === "loading" && <div className="admin-loading"><span className="loading-orbit" />Loading sellers…</div>}
    {state === "error" && <div className="list-error" role="alert"><div><b>Could not load this seller list</b><p>{error}</p></div><button className="page-btn" onClick={retry}>Try again</button></div>}
    {state === "ready" && items.length === 0 && <div className="admin-empty"><b>No sellers in this queue</b><p>There are no stores to review right now.</p></div>}
    {state === "ready" && items.length > 0 && <div className="review-rows">{items.map((store) => <article className="review-row" key={store.id}><Link className="store-identity store-row-link" href={`/admin/stores/${encodeURIComponent(store.id)}`}><span className="store-avatar">{store.storeName.slice(0, 1).toUpperCase()}</span><span><b>{store.storeName}</b><small>{store.category || store.whatsappPhone}</small></span></Link><span className={`status-badge ${store.status.toLowerCase()}`}><i />{statusText(store.status)}</span><time>{shortDate(store.createdAt)}</time><div className="row-actions">{pending && <button className="table-action" disabled={busyId === store.id} onClick={() => onAction(store, false)}>Suspend</button>}<button className="table-action" disabled={busyId === store.id} onClick={() => onAction(store, true)}>{busyId === store.id ? "Saving…" : "Activate"}</button></div></article>)}</div>}
    <div className="table-footer review-pagination"><span>Showing {total === 0 ? 0 : (page - 1) * REVIEW_PAGE_SIZE + 1}–{Math.min(page * REVIEW_PAGE_SIZE, total)} of {total}</span><div><button className="page-btn" disabled={page <= 1 || state === "loading"} onClick={() => onPage(page - 1)}>← Previous</button><button className="page-btn" disabled={page * REVIEW_PAGE_SIZE >= total || state === "loading"} onClick={() => onPage(page + 1)}>Next →</button></div></div>
  </section>;
}

export default function ReviewPage() {
  const router = useRouter();
  const [review, setReview] = useState<Record<string, unknown> | null>(null);
  const [reviewState, setReviewState] = useState<State>("loading");
  const [reviewError, setReviewError] = useState("");
  const [reviewRetry, setReviewRetry] = useState(0);
  const [pending, setPending] = useState<Store[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingState, setPendingState] = useState<State>("loading");
  const [pendingError, setPendingError] = useState("");
  const [pendingRetry, setPendingRetry] = useState(0);
  const [suspended, setSuspended] = useState<Store[]>([]);
  const [suspendedTotal, setSuspendedTotal] = useState(0);
  const [suspendedPage, setSuspendedPage] = useState(1);
  const [suspendedState, setSuspendedState] = useState<State>("loading");
  const [suspendedError, setSuspendedError] = useState("");
  const [suspendedRetry, setSuspendedRetry] = useState(0);
  const [busyId, setBusyId] = useState("");

  const loadReview = useCallback(async () => {
    setReviewState("loading"); setReviewError("");
    try { setReview(await adminApi.review()); setReviewState("ready"); }
    catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) { setToken(null); router.replace("/admin/login"); return; }
      setReviewError(cause instanceof Error ? cause.message : "Could not load review metrics."); setReviewState("error");
    }
  }, [router]);
  const loadStores = useCallback(async (status: MerchantStatus, page: number, setter: (items: Store[]) => void, setTotal: (total: number) => void, setState: (state: State) => void, setError: (error: string) => void) => {
    setState("loading"); setError("");
    try { const result = await adminApi.stores({ page, pageSize: REVIEW_PAGE_SIZE, status }); setter(result.items); setTotal(result.total); setState("ready"); }
    catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) { setToken(null); router.replace("/admin/login"); return; }
      setError(cause instanceof Error ? cause.message : "Could not load stores."); setState("error");
    }
  }, [router]);

  useEffect(() => { void loadReview(); }, [loadReview, reviewRetry]);
  useEffect(() => { void loadStores("PENDING", pendingPage, setPending, setPendingTotal, setPendingState, setPendingError); }, [loadStores, pendingPage, pendingRetry]);
  useEffect(() => { void loadStores("SUSPENDED", suspendedPage, setSuspended, setSuspendedTotal, setSuspendedState, setSuspendedError); }, [loadStores, suspendedPage, suspendedRetry]);

  async function act(store: Store, activate: boolean) {
    let reason: string | undefined;
    if (!activate) {
      reason = window.prompt(`Enter a reason for suspending ${store.storeName} (3–500 characters):`)?.trim();
      if (!reason || reason.length < 3 || reason.length > 500) { if (reason) toast.error("The reason must be between 3 and 500 characters."); return; }
    }
    setBusyId(store.id);
    try {
      await adminApi.setStoreStatus(store.id, activate, reason);
      toast.success(activate ? "Store activated" : "Store suspended");
      setPendingPage(1); setSuspendedPage(1); setPendingRetry((value) => value + 1); setSuspendedRetry((value) => value + 1); setReviewRetry((value) => value + 1);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) { setToken(null); router.replace("/admin/login"); }
      else toast.error(cause instanceof Error ? cause.message : "Could not update the store.");
    } finally { setBusyId(""); }
  }

  const count = (...paths: string[]) => countValue(review, ...paths);
  const pendingCount = count("pendingSellers", "pendingStores", "pendingSellersCount", "pendingSellers.count", "pendingStores.count", "counts.pendingSellers", "counts.pendingSellers.count") ?? pendingTotal;
  const suspendedCount = count("suspendedSellers", "suspendedStores", "suspendedSellersCount", "suspendedSellers.count", "suspendedStores.count", "counts.suspendedSellers", "counts.suspendedSellers.count") ?? suspendedTotal;
  const pastDueCount = count("pastDueSubscriptions", "pastDueSubscriptionsCount", "subscriptionsPastDue", "counts.pastDueSubscriptions") ?? 0;
  const pendingPaymentCount = count("pendingPaymentOrders", "pendingPaymentOrdersCount", "ordersPendingPayment", "counts.pendingPaymentOrders") ?? 0;

  return <AdminWorkspace>
    <div className="admin-heading page-heading"><div><div className="admin-kicker">DAILY OPERATIONS</div><h1>Review & approvals</h1><p className="subtitle">Focus on sellers and payments that need attention.</p></div></div>
    <div className="review-metrics">
      <article className="admin-stat"><div className="admin-stat-head"><span className="stat-icon amber">P</span><span className="stat-trend">Needs review</span></div><strong>{reviewState === "ready" ? pendingCount : pendingState === "ready" ? pendingTotal : "—"}</strong><span>Pending sellers</span></article>
      <article className="admin-stat"><div className="admin-stat-head"><span className="stat-icon violet">S</span><span className="stat-trend">Restricted</span></div><strong>{reviewState === "ready" ? suspendedCount : suspendedState === "ready" ? suspendedTotal : "—"}</strong><span>Suspended sellers</span></article>
      <article className="admin-stat"><div className="admin-stat-head"><span className="stat-icon amber">$</span><span className="stat-trend">Subscriptions</span></div><strong>{reviewState === "ready" ? pastDueCount : "—"}</strong><span>Past due</span></article>
      <article className="admin-stat"><div className="admin-stat-head"><span className="stat-icon blue">O</span><span className="stat-trend">Payments</span></div><strong>{reviewState === "ready" ? pendingPaymentCount : "—"}</strong><span>Awaiting payment</span></article>
    </div>
    {reviewState === "error" && <div className="list-error" role="alert"><div><b>Review metrics could not be loaded</b><p>{reviewError}</p></div><button className="page-btn" onClick={() => setReviewRetry((value) => value + 1)}>Try again</button></div>}
    <div className="review-lists">
      <ReviewList title="Pending sellers" description="New sellers awaiting approval." items={pending} total={pendingTotal} page={pendingPage} onPage={setPendingPage} state={pendingState} error={pendingError} retry={() => setPendingRetry((value) => value + 1)} onAction={(store, activate) => void act(store, activate)} busyId={busyId} pending />
      <ReviewList title="Suspended sellers" description="Stores currently restricted from the marketplace." items={suspended} total={suspendedTotal} page={suspendedPage} onPage={setSuspendedPage} state={suspendedState} error={suspendedError} retry={() => setSuspendedRetry((value) => value + 1)} onAction={(store, activate) => void act(store, activate)} busyId={busyId} />
    </div>
  </AdminWorkspace>;
}
