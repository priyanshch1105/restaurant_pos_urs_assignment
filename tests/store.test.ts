import { beforeEach, describe, expect, it } from "vitest";
import { calculateTotals, createMenu, resetMemoryForTests } from "../server/store";
import { createRestaurantOrder, updateOrderItems, updateOrderStatus } from "../server/services/order.service";

describe("restaurant totals", () => {
  it("calculates tax after discount", () => { expect(calculateTotals([{ menuItemId: "m1", name: "Dosa", price: 100, quantity: 2, lineTotal: 200 }], 5, 20)).toEqual({ subtotal: 200, tax: 9, discount: 20, total: 189 }); });
  it("does not allow discount above subtotal", () => { expect(calculateTotals([{ menuItemId: "m1", name: "Dosa", price: 100, quantity: 1, lineTotal: 100 }], 5, 999).total).toBe(0); });
  it("rounds tax and final totals to two decimals", () => { expect(calculateTotals([{ menuItemId: "m1", name: "Rice", price: 10.01, quantity: 3, lineTotal: 30.03 }], 5, 0)).toEqual({ subtotal: 30.03, tax: 1.5, discount: 0, total: 31.53 }); });
});

describe("order workflow", () => {
  beforeEach(() => { resetMemoryForTests(); });
  const staff = { id: "staff-test", role: "Staff" as const };

  it("uses database menu prices and recalculates after quantity changes", async () => {
    const menu = await createMenu({ name: "Dosa", category: "Breakfast", price: 100, available: true });
    const order = await createRestaurantOrder({ type: "Takeaway", items: [{ menuItemId: menu.id, quantity: 1 }], discount: 0 }, staff);
    expect(order.subtotal).toBe(100);
    const updated = await updateOrderItems(order.id, { items: [{ menuItemId: menu.id, quantity: 2 }], discount: 0 }, staff);
    expect(updated?.subtotal).toBe(200);
    expect(updated?.total).toBe(210);
  });

  it("accepts only sequential status transitions", async () => {
    const menu = await createMenu({ name: "Tea", category: "Drinks", price: 20, available: true });
    const order = await createRestaurantOrder({ type: "Takeaway", items: [{ menuItemId: menu.id, quantity: 1 }], discount: 0 }, staff);
    await expect(updateOrderStatus(order.id, "Ready", staff)).rejects.toThrow("must move");
    await updateOrderStatus(order.id, "Preparing", staff);
    await expect(updateOrderStatus(order.id, "Pending", staff)).rejects.toThrow("must move");
  });
});
