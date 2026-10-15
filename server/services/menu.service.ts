import { createAuditLog, createMenu, listMenu, updateMenu, MenuItem } from "../repositories/restaurant.repository";
export const menuService = {
  list: (query: { search?: string; category?: string; available?: boolean; includeInactive?: boolean }) => listMenu(query),
  create: async (data: Omit<MenuItem, "id" | "active">, actor: { id: string; role: "Admin" | "Staff" }) => { const item = await createMenu(data); await createAuditLog({ actorId: actor.id, actorRole: actor.role, action: "menu.created", entityType: "menu", entityId: item.id, metadata: { name: item.name, price: item.price } }); return item; },
  update: (id: string, data: Partial<Omit<MenuItem, "id">>) => updateMenu(id, data),
  deactivate: async (id: string, actor: { id: string; role: "Admin" | "Staff" }) => { const item = await updateMenu(id, { active: false, available: false }); if (item) await createAuditLog({ actorId: actor.id, actorRole: actor.role, action: "menu.deactivated", entityType: "menu", entityId: id, metadata: { name: item.name } }); return item; },
  reactivate: (id: string) => updateMenu(id, { active: true })
};
