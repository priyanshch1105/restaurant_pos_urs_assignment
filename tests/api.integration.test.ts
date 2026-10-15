import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../server/app";
import { hashPassword } from "../server/auth";
import { ensureUser, resetMemoryForTests } from "../server/store";

const app = createApp();
let server: Server;
let baseUrl = "";
let adminToken = "";
let staffToken = "";
let menuId = "";

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers || {}) }
  });
  const body = await response.json() as Record<string, any>;
  return { response, body };
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe("Restaurant POS API", () => {
  beforeAll(async () => {
    server = createServer(app);
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not expose a port.");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(async () => {
    resetMemoryForTests();
    adminToken = "";
    staffToken = "";
    await ensureUser({ id: "admin-1", name: "Admin", email: "admin@test.local", role: "Admin", passwordHash: await hashPassword("admin-pass") });
    await ensureUser({ id: "staff-1", name: "Staff", email: "staff@test.local", role: "Staff", passwordHash: await hashPassword("staff-pass") });

    const adminLogin = await request("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@test.local", password: "admin-pass" }) });
    const staffLogin = await request("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "staff@test.local", password: "staff-pass" }) });
    adminToken = adminLogin.body.token;
    staffToken = staffLogin.body.token;

    const menu = await request("/api/menu", {
      method: "POST",
      headers: auth(adminToken),
      body: JSON.stringify({ name: "Dosa", category: "Breakfast", price: 100, available: true })
    });
    menuId = menu.body.item.id;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });

  it("authenticates users and rejects missing or invalid JWTs", async () => {
    expect(adminToken).toEqual(expect.any(String));
    expect((await request("/api/auth/me", { headers: auth(adminToken) })).response.status).toBe(200);
    expect((await request("/api/auth/me")).response.status).toBe(401);
    expect((await request("/api/auth/me", { headers: auth("invalid-token") })).response.status).toBe(401);
  });

  it("enforces Admin-only menu management while Staff can view available items", async () => {
    expect((await request("/api/menu", {
      method: "POST",
      headers: auth(staffToken),
      body: JSON.stringify({ name: "Tea", category: "Drinks", price: 20, available: true })
    })).response.status).toBe(403);

    const list = await request("/api/menu", { headers: auth(staffToken) });
    expect(list.response.status).toBe(200);
    expect(list.body.items).toHaveLength(1);

    const edited = await request(`/api/menu/${menuId}`, {
      method: "PUT",
      headers: auth(adminToken),
      body: JSON.stringify({ price: 110 })
    });
    expect(edited.response.status).toBe(200);
    expect(edited.body.item.price).toBe(110);
    expect((await request(`/api/menu/${menuId}/deactivate`, { method: "PATCH", headers: auth(adminToken) })).response.status).toBe(200);
    const unavailable = await request("/api/menu", { headers: auth(staffToken) });
    expect(unavailable.body.items).toHaveLength(0);
    expect((await request(`/api/menu/${menuId}/reactivate`, { method: "PATCH", headers: auth(adminToken) })).response.status).toBe(200);
  });

  it("creates orders with server pricing, unique numbers, filters, and invoice data", async () => {
    expect((await request("/api/orders", {
      method: "POST",
      headers: auth(adminToken),
      body: JSON.stringify({ type: "Takeaway", items: [{ menuItemId: menuId, quantity: 1 }], discount: 0 })
    })).response.status).toBe(403);
    const first = await request("/api/orders", {
      method: "POST",
      headers: auth(staffToken),
      body: JSON.stringify({ type: "Takeaway", items: [{ menuItemId: menuId, quantity: 2 }], discount: 10 })
    });

    const second = await request("/api/orders", {
      method: "POST",
      headers: auth(staffToken),
      body: JSON.stringify({ type: "Dine-in", tableNumber: 4, items: [{ menuItemId: menuId, quantity: 1 }], discount: 0 })
    });
    expect(first.response.status).toBe(201);
    expect(second.response.status).toBe(201);
    expect(first.body.order.orderNumber).not.toBe(second.body.order.orderNumber);
    expect(first.body.order.subtotal).toBe(200);
    expect(first.body.order.total).toBe(199.5);

    const filtered = await request(`/api/orders?search=${encodeURIComponent(first.body.order.orderNumber)}&status=Pending&page=1&pageSize=1`, { headers: auth(staffToken) });
    expect(filtered.response.status).toBe(200);
    expect(filtered.body.orders).toHaveLength(1);
    expect(filtered.body.total).toBe(1);
    const dateFiltered = await request("/api/orders?from=2000-01-01&to=2000-01-02", { headers: auth(staffToken) });
    expect(dateFiltered.response.status).toBe(200);
    expect(dateFiltered.body.orders).toHaveLength(0);

    const invoice = await request(`/api/orders/${first.body.order.id}/invoice`, { headers: auth(staffToken) });
    expect(invoice.response.status).toBe(200);
    expect(invoice.body.order.total).toBe(first.body.order.total);
    expect(invoice.body.order.items[0].price).toBe(100);
  });

  it("allows Admin to manage tax and permitted discounts", async () => {
    const current = await request("/api/settings", { headers: auth(adminToken) });
    expect(current.response.status).toBe(200);
    const updated = await request("/api/settings", {
      method: "PATCH",
      headers: auth(adminToken),
      body: JSON.stringify({ taxRate: 7.5, maxDiscount: 250 })
    });
    expect(updated.response.status).toBe(200);
    expect(updated.body.settings).toEqual({ taxRate: 7.5, maxDiscount: 250 });
    expect((await request("/api/settings", { headers: auth(staffToken) })).response.status).toBe(403);
  });

  it("creates protected audit records for financial and order changes", async () => {
    const created = await request("/api/orders", {
      method: "POST",
      headers: auth(staffToken),
      body: JSON.stringify({ type: "Takeaway", items: [{ menuItemId: menuId, quantity: 1 }], discount: 0 })
    });
    const logs = await request("/api/audit-logs", { headers: auth(adminToken) });
    expect(logs.response.status).toBe(200);
    expect(logs.body.logs.some((log: { action: string; entityId: string }) => log.action === "order.created" && log.entityId === created.body.order.id)).toBe(true);
    expect((await request("/api/audit-logs", { headers: auth(staffToken) })).response.status).toBe(403);
  });

  it("validates status transitions, recalculates quantities, and prevents invalid payments", async () => {
    const created = await request("/api/orders", {
      method: "POST",
      headers: auth(staffToken),
      body: JSON.stringify({ type: "Takeaway", items: [{ menuItemId: menuId, quantity: 1 }], discount: 0 })
    });
    const id = created.body.order.id;

    expect((await request(`/api/orders/${id}/status`, { method: "PATCH", headers: auth(adminToken), body: JSON.stringify({ status: "Preparing" }) })).response.status).toBe(403);
    expect((await request(`/api/orders/${id}/payment`, { method: "POST", headers: auth(adminToken), body: JSON.stringify({ method: "Cash", amount: 100 }) })).response.status).toBe(403);
    expect((await request(`/api/orders/${id}/status`, { method: "PATCH", headers: auth(staffToken), body: JSON.stringify({ status: "Ready" }) })).response.status).toBe(500);
    const updated = await request(`/api/orders/${id}/items`, {
      method: "PATCH",
      headers: auth(staffToken),
      body: JSON.stringify({ items: [{ menuItemId: menuId, quantity: 3 }], discount: 0 })
    });
    expect(updated.body.order.subtotal).toBe(300);
    for (const nextStatus of ["Preparing", "Ready", "Completed"]) {
      expect((await request(`/api/orders/${id}/status`, { method: "PATCH", headers: auth(staffToken), body: JSON.stringify({ status: nextStatus }) })).response.status).toBe(200);
    }

    const invalidPayment = await request(`/api/orders/${id}/payment`, { method: "POST", headers: auth(staffToken), body: JSON.stringify({ method: "Cash", amount: 1 }) });
    expect(invalidPayment.response.status).toBe(500);
    const paid = await request(`/api/orders/${id}/payment`, { method: "POST", headers: auth(staffToken), body: JSON.stringify({ method: "Cash", amount: 315 }) });
    expect(paid.response.status).toBe(200);
    expect(paid.body.order.paymentStatus).toBe("Paid");
    expect(paid.body.order.paymentMethod).toBe("Cash");

    const duplicate = await request(`/api/orders/${id}/payment`, { method: "POST", headers: auth(staffToken), body: JSON.stringify({ method: "Cash", amount: 315 }) });
    expect(duplicate.response.status).toBe(500);
  });
});
