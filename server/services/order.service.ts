import { calculateTotals, createAuditLog, createOrder, findMenuByIds, findOrderById, getRestaurantSettings, listOrders, recordPayment as persistPayment, updateOrder, Order } from "../repositories/restaurant.repository";

export async function createRestaurantOrder(input: {
  type: "Dine-in" | "Takeaway";
  tableNumber?: number;
  items: { menuItemId: string; quantity: number }[];
  discount: number;
}, actor: { id: string; role: "Admin" | "Staff" }) {
  if (!input.items.length) throw new Error("Add at least one menu item to create an order.");
  if (new Set(input.items.map(item => item.menuItemId)).size !== input.items.length) throw new Error("Each menu item can only appear once in an order.");

  const menu = await findMenuByIds(input.items.map(item => item.menuItemId));
  if (menu.length !== input.items.length || menu.some(item => !item.active || !item.available)) {
    throw new Error("One or more selected items are unavailable.");
  }

  const lines = input.items.map(line => {
    const item = menu.find(menuItem => menuItem.id === line.menuItemId)!;
    return {
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity: line.quantity,
      lineTotal: Number((item.price * line.quantity).toFixed(2))
    };
  });

  const settings = await getRestaurantSettings();
  if (input.discount > settings.maxDiscount) throw new Error(`Discount cannot exceed ${settings.maxDiscount}.`);
  const totals = calculateTotals(lines, settings.taxRate, input.discount);

  const order = await createOrder({
    orderNumber: `RP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    type: input.type,
    tableNumber: input.type === "Dine-in" ? input.tableNumber : undefined,
    items: lines,
    status: "Pending",
    ...totals,
    taxRate: settings.taxRate,
    paymentStatus: "Pending",
    createdAt: new Date().toISOString()
  });
  await createAuditLog({ actorId: actor.id, actorRole: actor.role, action: "order.created", entityType: "order", entityId: order.id, metadata: { orderNumber: order.orderNumber, total: order.total } });
  return order;
}

export async function updateOrderStatus(id: string, status: Order["status"], actor: { id: string; role: "Admin" | "Staff" }) {
  const order = await findOrderById(id);
  if (!order) return null;

  const workflow: Order["status"][] = ["Pending", "Preparing", "Ready", "Completed"];
  const currentIndex = workflow.indexOf(order.status);
  const nextIndex = workflow.indexOf(status);

  if (nextIndex !== currentIndex + 1) throw new Error(`Order status must move from ${order.status} to ${workflow[currentIndex + 1] || "remain completed"}.`);

  const updated = await updateOrder(id, { status });
  if (updated) await createAuditLog({ actorId: actor.id, actorRole: actor.role, action: "order.status_changed", entityType: "order", entityId: id, metadata: { from: order.status, to: status } });
  return updated;
}

export async function recordPayment(id: string, method: "Cash" | "UPI", amount: number, receivedBy: string, actor: { id: string; role: "Admin" | "Staff" }) {
  const order = await findOrderById(id);
  if (!order) return null;
  if (order.paymentStatus === "Paid") {
    throw new Error("Payment is already recorded for this order.");
  }
  if (amount < order.total) throw new Error("Payment cannot be less than the order total.");
  const updated = await persistPayment(id, { method, amount: Number(amount.toFixed(2)), receivedBy });
  if (updated) await createAuditLog({ actorId: actor.id, actorRole: actor.role, action: "payment.recorded", entityType: "order", entityId: id, metadata: { method, amount: updated.paymentAmount } });
  return updated;
}

export async function updateOrderItems(id: string, input: { items: { menuItemId: string; quantity: number }[]; discount?: number }, actor: { id: string; role: "Admin" | "Staff" }) {
  const order = await findOrderById(id);
  if (!order) return null;
  if (order.paymentStatus === "Paid" || order.status === "Completed") throw new Error("Paid or completed orders cannot be edited.");
  if (new Set(input.items.map(item => item.menuItemId)).size !== input.items.length) throw new Error("Each menu item can only appear once in an order.");
  const menu = await findMenuByIds(input.items.map(item => item.menuItemId));
  if (menu.length !== input.items.length || menu.some(item => !item.active || !item.available)) throw new Error("One or more selected items are unavailable.");
  const lines = input.items.map(line => {
    const item = menu.find(menuItem => menuItem.id === line.menuItemId)!;
    return { menuItemId: item.id, name: item.name, price: item.price, quantity: line.quantity, lineTotal: Number((item.price * line.quantity).toFixed(2)) };
  });
  const settings = await getRestaurantSettings();
  const discount = input.discount ?? order.discount;
  if (discount > settings.maxDiscount) throw new Error(`Discount cannot exceed ${settings.maxDiscount}.`);
  const totals = calculateTotals(lines, order.taxRate, discount);
  const updated = await updateOrder(id, { items: lines, ...totals });
  if (updated) await createAuditLog({ actorId: actor.id, actorRole: actor.role, action: "order.items_updated", entityType: "order", entityId: id, metadata: { itemCount: lines.length, total: updated.total } });
  return updated;
}

export async function getOrderById(id: string) { return findOrderById(id); }
export async function searchOrders(query: { search?: string; status?: Order["status"]; from?: string; to?: string; page: number; pageSize: number }) { return listOrders(query); }
export { listOrders };
