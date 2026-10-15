"use client";

import { useEffect, useState } from "react";
import { api, money, Order } from "@/lib/api";

export default function InvoicePage() {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("order");
    if (!id) { setError("No order was selected."); return; }
    api<{ order: Order }>(`/api/orders/${encodeURIComponent(id)}/invoice`).then(result => setOrder(result.order)).catch(err => setError(err instanceof Error ? err.message : "Unable to load invoice."));
  }, []);
  if (error) return <main className="invoice-page"><p className="alert error">{error}</p></main>;
  if (!order) return <main className="invoice-page"><p>Loading bill…</p></main>;
  return <main className="invoice-page" id="print-invoice"><header className="invoice-header"><div><span className="eyebrow">Rivermint restaurant ops</span><h1>Order bill</h1></div><button className="primary-button no-print" onClick={() => window.print()}>Print Bill</button></header><section className="invoice-meta"><div><strong>{order.orderNumber}</strong><span>{new Date(order.createdAt).toLocaleString("en-IN")}</span></div><div><span>{order.type}</span>{order.tableNumber && <span>Table {order.tableNumber}</span>}<span>{order.paymentStatus}{order.paymentMethod ? ` · ${order.paymentMethod}` : ""}</span></div></section><table className="invoice-table"><thead><tr><th>Item</th><th>Unit price</th><th>Qty</th><th>Line total</th></tr></thead><tbody>{order.items.map(item => <tr key={item.menuItemId}><td>{item.name}</td><td>{money(item.price)}</td><td>{item.quantity}</td><td>{money(item.lineTotal)}</td></tr>)}</tbody></table><section className="invoice-totals"><div><span>Subtotal</span><strong>{money(order.subtotal)}</strong></div><div><span>Discount</span><strong>-{money(order.discount)}</strong></div><div><span>Tax ({order.taxRate}%)</span><strong>{money(order.tax)}</strong></div><div className="invoice-total"><span>Total</span><strong>{money(order.total)}</strong></div></section>{order.paymentAmount !== undefined && <p className="invoice-payment">Recorded payment: {money(order.paymentAmount)}{order.paidAt ? ` on ${new Date(order.paidAt).toLocaleString("en-IN")}` : ""}</p>}</main>;
}
