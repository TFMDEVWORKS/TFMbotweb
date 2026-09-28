"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AdminWorkspace from "@/components/admin/AdminWorkspace";
import { adminApi, ApiError, setToken } from "@/lib/adminApi";
import { asRecord, money, pick, rows, shortDate, statusText, text } from "@/lib/adminData";

export default function OrderDetailsPage() {
  const { orderCode } = useParams<{ orderCode: string }>();
  const router = useRouter();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  const load = useCallback(async () => {
    setState("loading"); setError("");
    try { setData(await adminApi.order(orderCode)); setState("ready"); }
    catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) { setToken(null); router.replace("/admin/login"); return; }
      setError(cause instanceof Error ? cause.message : "Could not load order details."); setState("error");
    }
  }, [orderCode, router]);

  useEffect(() => { void load(); }, [load, retry]);

  const root = asRecord(data);
  const order = asRecord(pick(root, "order") ?? root);
  const store = asRecord(pick(root, "store", "order.store"));
  const merchant = asRecord(pick(root, "merchant", "store.merchant", "order.merchant"));
  const customer = asRecord(pick(root, "customer", "order.customer"));
  const payment = asRecord(pick(root, "payment", "order.payment"));
  const receipt = asRecord(pick(root, "receipt", "order.receipt"));
  const items = rows(pick(root, "items", "order.items", "lineItems"));
  const events = rows(pick(root, "statusTimeline", "statusEvents", "timeline", "events", "order.statusTimeline", "order.statusEvents"));
  const code = text(pick(order, "orderCode", "code"), orderCode);
  const storeId = text(pick(store, "merchantId", "id") ?? pick(merchant, "id"), "");
  const customerPhone = text(pick(customer, "phone", "phoneNumber", "whatsappPhone") ?? pick(order, "customerPhone"));
  const deliveryNotes = text(pick(order, "deliveryNotes") ?? pick(customer, "deliveryNotes"), "");
  const receiptUrl = pick(receipt, "url", "fileUrl", "imageUrl") ?? (typeof pick(root, "receipt") === "string" ? pick(root, "receipt") : undefined);

  return <AdminWorkspace>
    <div className="detail-back"><Link href="/admin/orders">← Back to orders</Link></div>
    {state === "loading" && <section className="admin-panel"><div className="admin-loading"><span className="loading-orbit" />Loading order details…</div></section>}
    {state === "error" && <section className="admin-panel"><div className="list-error" role="alert"><div><b>Order details could not be loaded</b><p>{error}</p></div><button className="page-btn" onClick={() => setRetry((value) => value + 1)}>Try again</button></div></section>}
    {state === "ready" && <>
      <div className="admin-heading page-heading detail-heading"><div><div className="admin-kicker">ORDER DETAILS</div><h1>{code}</h1><p className="subtitle">Placed {shortDate(pick(order, "createdAt"))}</p></div><span className={`status-badge order-${text(pick(order, "status")).toLowerCase()}`}><i />{statusText(pick(order, "status"))}</span></div>
      <div className="order-detail-grid">
        <div className="order-detail-main">
          <section className="admin-panel detail-panel"><div className="panel-heading"><div><h2>Items</h2><p>Products included in this order.</p></div><span className="count-chip">{items.length} items</span></div>
            {items.length === 0 ? <div className="admin-empty"><b>No line items found</b></div> : <div className="order-items">{items.map((item, index) => {
              const product = asRecord(pick(item, "product"));
              const title = text(pick(item, "productName", "name") ?? pick(product, "name", "productName"), "Product");
              const image = pick(item, "productImage", "imageUrl", "image") ?? pick(product, "imageUrl", "image");
              const quantity = Number(pick(item, "quantity") ?? 1);
              const unitPrice = pick(item, "unitPriceMinorUnits", "priceMinorUnits", "unitPrice") ?? pick(product, "priceMinorUnits", "price");
              return <article className="order-item" key={text(pick(item, "id"), `${title}-${index}`)}>{typeof image === "string" && <img src={image} alt="" loading="lazy" />}<div className="order-item-name"><b>{title}</b><small>Qty {quantity}</small></div><strong>{money(Number(unitPrice) * quantity)}</strong></article>;
            })}</div>}
            <dl className="totals-list"><div><dt>Subtotal</dt><dd>{money(pick(order, "subtotalMinorUnits", "subtotal"))}</dd></div><div><dt>Delivery fee</dt><dd>{money(pick(order, "deliveryFeeMinorUnits", "deliveryFee"))}</dd></div><div className="grand-total"><dt>Total</dt><dd>{money(pick(order, "totalMinorUnits", "total"))}</dd></div></dl>
          </section>
          <section className="admin-panel detail-panel"><div className="panel-heading"><div><h2>Payment & receipt</h2><p>Payment details recorded for this order.</p></div></div><dl className="detail-fields"><div><dt>Provider</dt><dd>{text(pick(payment, "provider", "method"))}</dd></div><div><dt>Reference</dt><dd>{text(pick(payment, "reference", "transactionReference", "id"))}</dd></div><div><dt>Status</dt><dd>{statusText(pick(payment, "status") ?? pick(order, "paymentStatus"))}</dd></div><div><dt>Amount</dt><dd>{money(pick(payment, "amountMinorUnits", "amount") ?? pick(order, "totalMinorUnits", "total"))}</dd></div><div><dt>Paid at</dt><dd>{shortDate(pick(payment, "paidAt") ?? pick(order, "paidAt"))}</dd></div></dl>
            {typeof receiptUrl === "string" && <a className="receipt-link" href={receiptUrl} target="_blank" rel="noreferrer">View payment receipt <span aria-hidden="true">↗</span></a>}
          </section>
          <section className="admin-panel detail-panel"><div className="panel-heading"><div><h2>Status timeline</h2><p>Order status changes and notes.</p></div></div>
            {events.length === 0 ? <div className="admin-empty"><b>No status events found</b><p>Timeline events will appear here when available.</p></div> : <ol className="status-timeline">{events.map((event, index) => <li key={text(pick(event, "id"), `${text(pick(event, "status"))}-${index}`)}><span className="timeline-dot" /><div><b>{statusText(pick(event, "status", "toStatus", "event"))}</b><p>{text(pick(event, "note", "notes", "description"), "Status updated")}</p><time>{shortDate(pick(event, "createdAt", "timestamp", "at"))}</time></div></li>)}</ol>}
          </section>
        </div>
        <aside className="order-detail-side">
          <section className="admin-panel detail-panel"><div className="panel-heading"><div><h2>Store & merchant</h2></div></div><div className="contact-card"><b>{text(pick(store, "storeName", "name") ?? pick(order, "storeName"), "Store")}</b><small>{text(pick(store, "category"))}</small><a href={`https://wa.me/${text(pick(merchant, "whatsappPhone", "phone") ?? pick(store, "whatsappPhone")).replace(/\D/g, "")}`} target="_blank" rel="noreferrer">{text(pick(merchant, "whatsappPhone", "phone") ?? pick(store, "whatsappPhone"))}</a>{storeId && <Link className="text-link" href={`/admin/stores/${encodeURIComponent(storeId)}`}>Open store details</Link>}</div></section>
          <section className="admin-panel detail-panel"><div className="panel-heading"><div><h2>Customer & delivery</h2></div></div><div className="contact-card"><b>{text(pick(customer, "name", "fullName") ?? pick(order, "customerName"), "Customer")}</b><a href={`https://wa.me/${customerPhone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">{customerPhone}</a><div><small>Delivery address</small><p>{text(pick(order, "deliveryAddress", "shippingAddress") ?? pick(customer, "deliveryAddress", "address"))}</p></div>{deliveryNotes && <div><small>Delivery notes</small><p>{deliveryNotes}</p></div>}</div></section>
        </aside>
      </div>
    </>}
  </AdminWorkspace>;
}
