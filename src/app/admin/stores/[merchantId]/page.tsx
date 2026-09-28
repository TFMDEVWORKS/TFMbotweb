"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import AdminWorkspace from "@/components/admin/AdminWorkspace";
import { adminApi, ApiError, setToken } from "@/lib/adminApi";
import { asRecord, money, number, pick, rows, shortDate, statusText, text } from "@/lib/adminData";
import toast from "react-hot-toast";

const statusLabels: Record<string, string> = { ACTIVE: "Active", PENDING: "Pending", SUSPENDED: "Suspended" };
const readable = (value: unknown) => text(value).replaceAll("_", " ");
type StoreEditForm = { storeName: string; category: string; description: string; email: string; ownerPhone: string; location: string; deliveryZones: string; deliveryFeeGHS: string };
const emptyEditForm: StoreEditForm = { storeName: "", category: "", description: "", email: "", ownerPhone: "", location: "", deliveryZones: "", deliveryFeeGHS: "" };
const formString = (value: unknown) => Array.isArray(value) ? value.map((item) => text(item)).join(", ") : text(value, "");

export default function StoreDetailsPage() {
  const params = useParams<{ merchantId: string }>();
  const router = useRouter();
  const merchantId = params.merchantId;
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<StoreEditForm>(emptyEditForm);
  const [originalEditForm, setOriginalEditForm] = useState<StoreEditForm>(emptyEditForm);
  const [editIssues, setEditIssues] = useState<string[]>([]);
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    setState("loading"); setError("");
    try { setData(await adminApi.store(merchantId)); setState("ready"); }
    catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) { setToken(null); router.replace("/admin/login"); return; }
      setError(cause instanceof Error ? cause.message : "Could not load store details."); setState("error");
    }
  }, [merchantId, router]);

  useEffect(() => { void load(); }, [load, retry]);

  const entity = asRecord(data);
  const merchant = asRecord(pick(entity, "merchant", "seller"));
  const store = asRecord(pick(entity, "store", "merchant.store"));
  const stats = asRecord(pick(entity, "stats", "store.stats"));
  const subscription = asRecord(pick(entity, "subscription", "merchant.subscription", "store.subscription"));
  const payout = asRecord(pick(entity, "payout", "payoutDetails", "merchant.payout", "store.payout"));
  const payoutType = text(pick(payout, "type", "method", "provider"), "").toLowerCase();
  const accountNumber = text(pick(payout, "accountNumber", "number", "phoneNumber"), "");
  const bankPayout = payoutType.includes("bank") || Boolean(pick(payout, "bankName", "bank"));
  const payoutNumber = bankPayout
    ? `•••• ${text(pick(payout, "last4", "accountLast4"), accountNumber.replace(/\D/g, "").slice(-4) || "—")}`
    : text(pick(payout, "phoneNumber", "number", "accountNumber"));
  const name = text(pick(store, "storeName", "name") ?? pick(merchant, "storeName", "name") ?? pick(entity, "storeName", "name"), "Store details");
  const status = text(pick(merchant, "status") ?? pick(store, "status") ?? pick(entity, "status"), "PENDING").toUpperCase();
  const products = rows(pick(entity, "products", "store.products"));
  const orders = rows(pick(entity, "orders", "recentOrders", "store.orders"));
  const details: [string, unknown][] = [
    ["WhatsApp", pick(store, "whatsappPhone", "phone") ?? pick(merchant, "whatsappPhone", "phone")],
    ["Owner phone", pick(merchant, "ownerPhone", "phoneNumber", "whatsappPhone")],
    ["Email", pick(store, "email") ?? pick(merchant, "email")],
    ["Location", pick(store, "location", "address", "city")],
    ["Delivery zones", pick(store, "deliveryZones")],
    ["Delivery fee", pick(store, "deliveryFeeMinorUnits") !== undefined ? money(pick(store, "deliveryFeeMinorUnits")) : pick(store, "deliveryFee")],
    ["Joined", shortDate(pick(store, "createdAt") ?? pick(merchant, "createdAt") ?? pick(entity, "createdAt"))],
  ];

  function startEditing() {
    const feeMinor = pick(store, "deliveryFeeMinorUnits");
    const feeValue = feeMinor !== undefined && feeMinor !== null && feeMinor !== ""
      ? (Number(feeMinor) / 100).toFixed(2)
      : formString(pick(store, "deliveryFee"));
    const current: StoreEditForm = {
      storeName: formString(pick(store, "storeName", "name") ?? pick(merchant, "storeName", "name") ?? pick(entity, "storeName", "name")),
      category: formString(pick(store, "category") ?? pick(merchant, "category")),
      description: formString(pick(store, "description") ?? pick(merchant, "description")),
      email: formString(pick(store, "email") ?? pick(merchant, "email")),
      ownerPhone: formString(pick(merchant, "ownerPhone", "phoneNumber") ?? pick(store, "ownerPhone")),
      location: formString(pick(store, "location", "address", "city")),
      deliveryZones: formString(pick(store, "deliveryZones")),
      deliveryFeeGHS: feeValue,
    };
    setEditForm(current); setOriginalEditForm(current); setEditIssues([]); setEditError(""); setShowEdit(true);
  }

  function validateEdit(values: StoreEditForm): string[] {
    const errors: string[] = [];
    const required = values.storeName.trim();
    if (required.length < 2 || required.length > 120) errors.push("Store name must be 2–120 characters.");
    const category = values.category.trim();
    if (category && (category.length < 2 || category.length > 60)) errors.push("Category must be 2–60 characters.");
    if (values.description.length > 1000) errors.push("Description must be no more than 1000 characters.");
    const email = values.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Enter a valid email address.");
    const phone = values.ownerPhone.trim();
    if (phone && (!/^[\d+ -]{9,15}$/.test(phone) || !/\d/.test(phone))) errors.push("Owner phone must be 9–15 characters using digits, +, spaces or hyphens.");
    const location = values.location.trim();
    if (location && (location.length < 3 || location.length > 200)) errors.push("Store location must be 3–200 characters.");
    const zones = values.deliveryZones.trim();
    if (zones && (zones.length < 2 || zones.length > 300)) errors.push("Delivery zones must be 2–300 characters.");
    const fee = values.deliveryFeeGHS.trim();
    if (fee && (!/^\d+(\.\d{1,2})?$/.test(fee) || !Number.isFinite(Number(fee)) || Number(fee) < 0 || Number(fee) > 10000)) errors.push("Delivery fee must be between 0 and 10,000 GHS (up to 2 decimal places).");
    return errors;
  }

  async function saveStoreEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const issues = validateEdit(editForm);
    if (issues.length) { setEditIssues(issues); setEditError("Please correct the highlighted details."); return; }
    const toPayload = (form: StoreEditForm) => ({
      storeName: form.storeName.trim(),
      category: form.category.trim() || null,
      description: form.description.trim() || null,
      email: form.email.trim() || null,
      ownerPhone: form.ownerPhone.trim() || null,
      location: form.location.trim() || null,
      deliveryZones: form.deliveryZones.trim() || null,
      deliveryFeeMinorUnits: form.deliveryFeeGHS.trim() ? Math.round(Number(form.deliveryFeeGHS) * 100) : null,
    });
    const current = toPayload(editForm);
    const original = toPayload(originalEditForm);
    const changed = Object.fromEntries(Object.entries(current).filter(([key, value]) => value !== original[key as keyof typeof original]));
    if (!Object.keys(changed).length) { setShowEdit(false); toast.success("No store details changed"); return; }
    setSavingEdit(true); setEditIssues([]); setEditError("");
    try {
      const response = asRecord(await adminApi.updateStore(merchantId, changed as Record<string, string | number | null>));
      setData((previous) => {
        const prev = asRecord(previous);
        const responseMerchant = asRecord(pick(response, "merchant", "seller"));
        const responseStore = asRecord(pick(response, "store"));
        const changes = changed as Record<string, string | number | null>;
        return { ...prev, ...response, merchant: { ...asRecord(pick(prev, "merchant", "seller")), ...responseMerchant, ...(changes.ownerPhone !== undefined ? { ownerPhone: changes.ownerPhone } : {}) }, store: { ...asRecord(pick(prev, "store")), ...responseStore, ...changes } };
      });
      setShowEdit(false); toast.success("Store details updated");
      void load();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) { setToken(null); router.replace("/admin/login"); }
      else if (cause instanceof ApiError && cause.status === 400) { setEditIssues(cause.issues); setEditError(cause.message); }
      else if (cause instanceof ApiError && cause.status === 409) setEditError("This seller hasn’t finished onboarding yet. Ask them to complete setup before editing store details.");
      else setEditError(cause instanceof Error ? cause.message : "Could not update store details.");
    } finally { setSavingEdit(false); }
  }

  async function toggleStatus(activate: boolean) {
    let reason: string | undefined;
    if (!activate) {
      reason = window.prompt(`Enter a reason for suspending ${name} (3–500 characters):`)?.trim();
      if (!reason || reason.length < 3 || reason.length > 500) { if (reason) toast.error("The reason must be between 3 and 500 characters."); return; }
    }
    setBusy(true);
    try {
      await adminApi.setStoreStatus(merchantId, activate, reason);
      await load();
      toast.success(activate ? "Store activated" : "Store suspended");
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) { setToken(null); router.replace("/admin/login"); }
      else toast.error(cause instanceof Error ? cause.message : "Could not update the store.");
    } finally { setBusy(false); }
  }

  async function deleteStore() {
    if (deleteText !== "DELETE") return;
    setBusy(true);
    try {
      await adminApi.deleteStore(merchantId);
      toast.success("Store permanently deleted");
      router.replace("/admin/stores");
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) { setToken(null); router.replace("/admin/login"); }
      else toast.error(cause instanceof Error ? cause.message : "Could not delete the store.");
    } finally { setBusy(false); }
  }

  return <AdminWorkspace>
    <div className="detail-back"><Link href="/admin/stores">← Back to stores</Link></div>
    {state === "loading" && <section className="admin-panel"><div className="admin-loading"><span className="loading-orbit" />Loading store details…</div></section>}
    {state === "error" && <section className="admin-panel"><div className="list-error" role="alert"><div><b>Store details could not be loaded</b><p>{error}</p></div><button className="page-btn" onClick={() => setRetry((value) => value + 1)}>Try again</button></div></section>}
    {state === "ready" && <>
      <div className="admin-heading page-heading detail-heading"><div><div className="admin-kicker">STORE PROFILE</div><h1>{name}</h1><p className="subtitle">{text(pick(store, "category") ?? pick(merchant, "category"), "Marketplace seller")} · {text(pick(store, "whatsappPhone") ?? pick(merchant, "whatsappPhone"))}</p></div><div className="detail-actions"><span className={`status-badge ${status.toLowerCase()}`}><i />{statusLabels[status] ?? statusText(status)}</span><button className="btn btn-primary btn-sm" onClick={startEditing}>Edit details</button>{status !== "ACTIVE" && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void toggleStatus(true)}>Activate store</button>}{status !== "SUSPENDED" && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void toggleStatus(false)}>Suspend store</button>}</div></div>
      <div className="detail-stats">
        <article className="admin-stat"><strong>{number(pick(stats, "products", "productCount"), products.length)}</strong><span>Products</span></article>
        <article className="admin-stat"><strong>{number(pick(stats, "orders", "orderCount"), orders.length)}</strong><span>Orders</span></article>
        <article className="admin-stat"><strong>{number(pick(stats, "paidOrders", "paidOrderCount"), orders.filter((order) => text(order.status).toUpperCase() === "PAID").length)}</strong><span>Paid orders</span></article>
        <article className="admin-stat"><strong className="revenue-value">{money(pick(stats, "revenueMinorUnits", "revenue", "totalRevenueMinorUnits"))}</strong><span>Store revenue</span></article>
      </div>
      <div className="detail-grid">
        <section className="admin-panel detail-panel"><div className="panel-heading"><div><h2>Storefront</h2><p>Public-facing details and delivery setup.</p></div></div><dl className="detail-fields">{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{Array.isArray(value) ? value.map((item) => text(item)).join(", ") : text(value)}</dd></div>)}<div className="description-field"><dt>Description</dt><dd>{text(pick(store, "description") ?? pick(merchant, "description"))}</dd></div></dl></section>
        <section className="admin-panel detail-panel"><div className="panel-heading"><div><h2>Subscription & payouts</h2><p>Plan status and payout destination.</p></div></div><dl className="detail-fields">
          <div><dt>Plan</dt><dd>{readable(pick(subscription, "planName", "plan", "name") ?? pick(store, "subscriptionPlan"))}</dd></div>
          <div><dt>Status</dt><dd>{statusText(pick(subscription, "status") ?? pick(store, "subscriptionStatus"))}</dd></div>
          <div><dt>Period ends</dt><dd>{shortDate(pick(subscription, "currentPeriodEnd", "periodEnd", "endsAt"))}</dd></div>
          <div><dt>Payout type</dt><dd>{readable(pick(payout, "type", "method", "provider"))}</dd></div>
          <div><dt>Bank / network</dt><dd>{text(pick(payout, "bankName", "network", "bank"))}</dd></div>
          <div><dt>Account</dt><dd>{text(pick(payout, "accountName", "accountHolderName", "accountName"))}</dd></div>
          <div><dt>Account number</dt><dd>{payoutNumber}</dd></div>
          {status === "SUSPENDED" && <div className="description-field"><dt>Suspension reason</dt><dd>{text(pick(merchant, "suspensionReason", "suspendedReason") ?? pick(store, "suspensionReason") ?? pick(entity, "suspensionReason"))}</dd></div>}
        </dl></section>
      </div>
      <section className="admin-panel detail-panel"><div className="panel-heading"><div><h2>Products</h2><p>Products currently listed by this store.</p></div><span className="count-chip">{products.length} shown</span></div>
        {products.length === 0 ? <div className="admin-empty"><b>No products found</b><p>This store has no products to display.</p></div> : <div className="product-grid">{products.map((product, index) => {
          const firstImage = rows(pick(product, "images"))[0];
          const image = pick(product, "imageUrl", "image", "image.url") ?? pick(firstImage, "url", "imageUrl", "path");
          const productName = text(pick(product, "name", "productName"), "Product");
          return <article className="product-card" key={text(pick(product, "id"), `${productName}-${index}`)}>{typeof image === "string" && <img src={image} alt="" loading="lazy" />}<div><b>{productName}</b><small>{text(pick(product, "availability", "status", "isAvailable"))}</small><strong>{money(pick(product, "priceMinorUnits", "price"))}</strong></div></article>;
        })}</div>}
      </section>
      <section className="admin-panel detail-panel"><div className="panel-heading"><div><h2>Recent orders</h2><p>Recent customer orders from this store.</p></div><span className="count-chip">{orders.length} shown</span></div>
        {orders.length === 0 ? <div className="admin-empty"><b>No orders found</b><p>Orders from this store will appear here.</p></div> : <div className="table-scroll"><table className="admin-table full-data-table"><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>DATE</th><th>STATUS</th><th>TOTAL</th></tr></thead><tbody>{orders.map((order, index) => {
          const orderCode = text(pick(order, "orderCode", "code", "id"));
          return <tr key={text(pick(order, "id"), `${orderCode}-${index}`)}><td><Link className="table-primary-link" href={`/admin/orders/${encodeURIComponent(orderCode)}`}>{orderCode}</Link></td><td>{text(pick(order, "customerName", "customer.name", "customerPhone", "customer.phone"))}</td><td>{shortDate(pick(order, "createdAt"))}</td><td><span className={`status-badge order-${text(pick(order, "status")).toLowerCase()}`}><i />{statusText(pick(order, "status"))}</span></td><td>{money(pick(order, "totalMinorUnits", "total"))}</td></tr>;
        })}</tbody></table></div>}
      </section>
      <section className="danger-zone"><div><div className="admin-kicker danger-kicker">DANGER ZONE</div><h2>Delete this store</h2><p>Permanently deletes this store and its orders, payments, receipts and products. This cannot be undone.</p></div><button className="danger-button" onClick={() => { setDeleteText(""); setShowDelete(true); }}>Delete store</button></section>
    </>}
    {showDelete && <div className="modal-backdrop" role="presentation"><section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-title"><button className="modal-close" aria-label="Close" onClick={() => setShowDelete(false)}>×</button><div className="admin-kicker danger-kicker">PERMANENT ACTION</div><h2 id="delete-title">Delete {name}?</h2><p>This permanently deletes the store, products, orders, payments and receipts. Type <strong>DELETE</strong> to confirm.</p><label htmlFor="delete-confirmation">Confirmation</label><input id="delete-confirmation" autoComplete="off" value={deleteText} onChange={(event) => setDeleteText(event.target.value)} placeholder="Type DELETE" /><div className="modal-actions"><button className="btn btn-ghost btn-sm" onClick={() => setShowDelete(false)}>Cancel</button><button className="danger-button" disabled={deleteText !== "DELETE" || busy} onClick={() => void deleteStore()}>{busy ? "Deleting…" : "Permanently delete"}</button></div></section></div>}
    {showEdit && <div className="modal-backdrop store-edit-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !savingEdit) setShowEdit(false); }}><section className="store-edit-drawer" role="dialog" aria-modal="true" aria-labelledby="store-edit-title"><header className="store-edit-header"><div><div className="admin-kicker">STORE PROFILE</div><h2 id="store-edit-title">Edit store details</h2><p>Changes are saved to this seller’s storefront profile.</p></div><button className="modal-close" aria-label="Close edit form" disabled={savingEdit} onClick={() => setShowEdit(false)}>×</button></header><form onSubmit={(event) => void saveStoreEdit(event)} noValidate><div className="store-edit-fields">
      <label className="store-edit-field" htmlFor="edit-store-name">Store name<input id="edit-store-name" value={editForm.storeName} maxLength={120} onChange={(event) => setEditForm({ ...editForm, storeName: event.target.value })} required /></label>
      <label className="store-edit-field" htmlFor="edit-category">Category<input id="edit-category" value={editForm.category} maxLength={60} onChange={(event) => setEditForm({ ...editForm, category: event.target.value })} /></label>
      <label className="store-edit-field store-edit-wide" htmlFor="edit-description">Description<textarea id="edit-description" value={editForm.description} maxLength={1000} rows={4} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} /><small>{editForm.description.length}/1000 characters</small></label>
      <label className="store-edit-field" htmlFor="edit-email">Email<input id="edit-email" type="email" value={editForm.email} onChange={(event) => setEditForm({ ...editForm, email: event.target.value })} /></label>
      <label className="store-edit-field" htmlFor="edit-owner-phone">Owner phone<input id="edit-owner-phone" type="tel" value={editForm.ownerPhone} maxLength={15} onChange={(event) => setEditForm({ ...editForm, ownerPhone: event.target.value })} /></label>
      <label className="store-edit-field store-edit-wide" htmlFor="edit-location">Store location<input id="edit-location" value={editForm.location} maxLength={200} onChange={(event) => setEditForm({ ...editForm, location: event.target.value })} /></label>
      <label className="store-edit-field" htmlFor="edit-zones">Delivery zones<input id="edit-zones" value={editForm.deliveryZones} maxLength={300} onChange={(event) => setEditForm({ ...editForm, deliveryZones: event.target.value })} placeholder="e.g. Osu, Cantonments" /></label>
      <label className="store-edit-field" htmlFor="edit-fee">Delivery fee <span>(GHS)</span><input id="edit-fee" type="number" min="0" max="10000" step="0.01" value={editForm.deliveryFeeGHS} onChange={(event) => setEditForm({ ...editForm, deliveryFeeGHS: event.target.value })} placeholder="0.00" /></label>
      </div>{editError && <div className="store-edit-error" role="alert"><b>{editError}</b>{editIssues.length > 0 && <ul>{editIssues.map((issue, index) => <li key={`${issue}-${index}`}>{issue}</li>)}</ul>}</div>}<footer className="store-edit-footer"><button type="button" className="btn btn-ghost" disabled={savingEdit} onClick={() => setShowEdit(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={savingEdit}>{savingEdit ? "Saving…" : "Save changes"}</button></footer></form></section></div>}
  </AdminWorkspace>;
}
