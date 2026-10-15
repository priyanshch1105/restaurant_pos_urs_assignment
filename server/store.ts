import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { MenuModel } from "./models/menu.model";
import { OrderModel } from "./models/order.model";
import { UserModel } from "./models/user.model";
import { SettingsModel } from "./models/settings.model";
import { AuditLogModel } from "./models/audit-log.model";

export type Role = "Admin" | "Staff";
export type OrderStatus = "Pending" | "Preparing" | "Ready" | "Completed";
export type OrderType = "Dine-in" | "Takeaway";
export type PaymentMethod = "Cash" | "UPI";

export type MenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  available: boolean;
  active: boolean;
};

export type OrderLine = {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  lineTotal: number;
};

export type Order = {
  id: string;
  orderNumber: string;
  type: OrderType;
  tableNumber?: number;
  items: OrderLine[];
  status: OrderStatus;
  subtotal: number;
  taxRate: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod?: PaymentMethod;
  paymentStatus: "Pending" | "Paid";
  paymentAmount?: number;
  paidAt?: string;
  receivedBy?: string;
  createdAt: string;
};

export type User = { id: string; name: string; email: string; passwordHash?: string; password?: string; role: Role; active?: boolean };
export type AuditLog = { id: string; actorId: string; actorRole: Role; action: string; entityType: string; entityId: string; metadata: Record<string, unknown>; createdAt: string };

const defaultSettings = () => ({ taxRate: Number(process.env.TAX_RATE || 5), maxDiscount: Number(process.env.MAX_DISCOUNT || 100000) });
const memory = { menu: [] as MenuItem[], orders: [] as Order[], users: [] as User[], audits: [] as AuditLog[], settings: defaultSettings() };
let mongoReady = false;
let mongoError = "";

export async function connectDb() {
  if (!process.env.MONGODB_URI || mongoReady) return mongoReady;
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    mongoReady = true;
    mongoError = "";
    return true;
  } catch (error) {
    mongoError = error instanceof Error ? error.message : String(error);
    console.error("MongoDB connection failed; persistent operations are disabled.", mongoError);
    return false;
  }
}
export const usingMongo = () => mongoReady;
export function databaseStatus() {
  return {
    configured: Boolean(process.env.MONGODB_URI),
    connected: mongoReady,
    readyState: mongoose.connection.readyState,
    error: mongoError || undefined
  };
}
function requireDatabase() {
  if (process.env.MONGODB_URI && !mongoReady) {
    throw new Error(`MongoDB is not connected. ${mongoError || "Check MONGODB_URI and MongoDB network access."}`);
  }
}
const mapMenu = (doc: any): MenuItem => ({ id: String(doc._id), name: doc.name, category: doc.category, price: doc.price, available: doc.available, active: doc.active });
const mapOrder = (doc: any): Order => ({ id: String(doc._id), orderNumber: doc.orderNumber, type: doc.type, tableNumber: doc.tableNumber, items: doc.items.map((item: any) => ({ menuItemId: item.menuItemId, name: item.name, price: item.price, quantity: item.quantity, lineTotal: item.lineTotal })), status: doc.status, subtotal: doc.subtotal, taxRate: doc.taxRate, tax: doc.tax, discount: doc.discount, total: doc.total, paymentMethod: doc.paymentMethod, paymentStatus: doc.paymentStatus, paymentAmount: doc.paymentAmount, paidAt: doc.paidAt ? new Date(doc.paidAt).toISOString() : undefined, receivedBy: doc.receivedBy, createdAt: new Date(doc.createdAt).toISOString() });

export async function listMenu(query?: { search?: string; category?: string; available?: boolean; includeInactive?: boolean }) {
  requireDatabase();
  if (mongoReady) {
    const filter: any = query?.includeInactive ? {} : { active: true };
    if (query?.search) filter.$or = [{ name: new RegExp(query.search, "i") }, { category: new RegExp(query.search, "i") }];
    if (query?.category && query.category !== "All") filter.category = query.category;
    if (query?.available !== undefined) filter.available = query.available;
    return (await MenuModel.find(filter).sort({ category: 1, name: 1 })).map(mapMenu);
  }
  return memory.menu.filter(item => (query?.includeInactive || item.active) && (query?.available === undefined || item.available === query.available) && (!query?.search || `${item.name} ${item.category}`.toLowerCase().includes(query.search.toLowerCase())) && (!query?.category || query.category === "All" || item.category === query.category));
}
export async function listAllMenu() { return mongoReady ? (await MenuModel.find().sort({ category: 1, name: 1 })).map(mapMenu) : memory.menu; }
export async function createMenu(data: Omit<MenuItem, "id" | "active">) { requireDatabase(); if (mongoReady) return mapMenu(await MenuModel.create(data)); const item = { ...data, id: `m${Date.now()}`, active: true }; memory.menu.unshift(item); return item; }
export async function updateMenu(id: string, data: Partial<Omit<MenuItem, "id">>) { requireDatabase(); if (mongoReady) { const doc = await MenuModel.findByIdAndUpdate(id, data, { new: true }); return doc ? mapMenu(doc) : null; } const item = memory.menu.find(x => x.id === id); if (!item) return null; Object.assign(item, data); return item; }
export async function findMenuByIds(ids: string[]) { const menu = await listAllMenu(); return menu.filter(item => ids.includes(item.id)); }
export type OrderQuery = { search?: string; status?: OrderStatus; from?: string; to?: string; page: number; pageSize: number };
export async function listOrders(query?: OrderQuery) {
  const options = query || { page: 1, pageSize: 20 };
  if (mongoReady) {
    const filter: any = {};
    if (options.search) filter.orderNumber = new RegExp(options.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    if (options.status) filter.status = options.status;
    if (options.from || options.to) {
      filter.createdAt = {};
      if (options.from) filter.createdAt.$gte = new Date(`${options.from}T00:00:00.000Z`);
      if (options.to) filter.createdAt.$lt = new Date(Date.parse(`${options.to}T00:00:00.000Z`) + 86400000);
    }
    const [total, docs] = await Promise.all([
      OrderModel.countDocuments(filter),
      OrderModel.find(filter).sort({ createdAt: -1 }).skip((options.page - 1) * options.pageSize).limit(options.pageSize)
    ]);
    return { orders: docs.map(mapOrder), total, page: options.page, pageSize: options.pageSize, totalPages: Math.ceil(total / options.pageSize) };
  }
  const fromTime = options.from ? Date.parse(`${options.from}T00:00:00.000Z`) : undefined;
  const toTime = options.to ? Date.parse(`${options.to}T23:59:59.999Z`) : undefined;
  const filtered = [...memory.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).filter(order =>
    (!options.search || order.orderNumber.toLowerCase().includes(options.search.toLowerCase())) &&
    (!options.status || order.status === options.status) &&
    (fromTime === undefined || Date.parse(order.createdAt) >= fromTime) &&
    (toTime === undefined || Date.parse(order.createdAt) <= toTime)
  );
  const start = (options.page - 1) * options.pageSize;
  return { orders: filtered.slice(start, start + options.pageSize), total: filtered.length, page: options.page, pageSize: options.pageSize, totalPages: Math.ceil(filtered.length / options.pageSize) };
}
export async function findOrderById(id: string) { if (mongoReady) { const doc = await OrderModel.findById(id); return doc ? mapOrder(doc) : null; } return memory.orders.find(order => order.id === id) ?? null; }
export async function createOrder(data: Omit<Order, "id">) { requireDatabase(); if (mongoReady) return mapOrder(await OrderModel.create(data)); const order = { ...data, id: `o${Date.now()}` }; memory.orders.unshift(order); return order; }
export async function updateOrder(id: string, data: Partial<Order>) { requireDatabase(); if (mongoReady) { const doc = await OrderModel.findByIdAndUpdate(id, data, { new: true }); return doc ? mapOrder(doc) : null; } const order = memory.orders.find(x => x.id === id); if (!order) return null; Object.assign(order, data); return order; }
export async function recordPayment(id: string, payment: { method: PaymentMethod; amount: number; receivedBy: string }) {
  requireDatabase();
  if (mongoReady) {
    const doc = await OrderModel.findOneAndUpdate(
      { _id: id, paymentStatus: "Pending", total: { $lte: payment.amount } },
      { $set: { paymentMethod: payment.method, paymentAmount: payment.amount, paymentStatus: "Paid", paidAt: new Date(), receivedBy: payment.receivedBy } },
      { new: true }
    );
    return doc ? mapOrder(doc) : null;
  }
  const order = memory.orders.find(x => x.id === id);
  if (!order || order.paymentStatus === "Paid" || payment.amount < order.total) return null;
  Object.assign(order, { paymentMethod: payment.method, paymentAmount: payment.amount, paymentStatus: "Paid" as const, paidAt: new Date().toISOString(), receivedBy: payment.receivedBy });
  return order;
}
export async function findUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (mongoReady) return UserModel.findOne({ email: normalizedEmail }).lean() as unknown as Promise<User | null>;
  return memory.users.find(user => user.email.toLowerCase() === normalizedEmail) ?? null;
}
export async function ensureUser(user: User) { if (mongoReady) { const existing = await UserModel.findOne({ email: user.email }); if (!existing) await UserModel.create(user); } else if (!memory.users.some(x => x.email === user.email)) memory.users.push(user); }
export async function listUsers() { requireDatabase(); if (mongoReady) { const users = await UserModel.find({}, { password: 0, passwordHash: 0 }).lean(); return users.map(user => ({ id: String(user._id), name: user.name, email: user.email, role: user.role, active: user.active !== false })); } return memory.users.map(({ password, passwordHash, ...user }) => ({ ...user, active: user.active !== false })); }
export async function createUser(user: User) { requireDatabase(); const activeUser = { ...user, active: true }; if (mongoReady) { const doc = await UserModel.create(activeUser); return { id: String(doc._id), name: doc.name, email: doc.email, role: doc.role, active: true }; } memory.users.push(activeUser); const { password, passwordHash, ...safeUser } = activeUser; return safeUser; }
export async function updateStaffUser(id: string, data: { name?: string; email?: string; active?: boolean }) {
  requireDatabase();
  if (mongoReady) {
    const doc = await UserModel.findOneAndUpdate({ _id: id, role: "Staff" }, { $set: data }, { new: true, runValidators: true });
    return doc ? { id: String(doc._id), name: doc.name, email: doc.email, role: doc.role, active: doc.active !== false } : null;
  }
  const user = memory.users.find(item => item.id === id && item.role === "Staff");
  if (!user) return null;
  Object.assign(user, data);
  return { id: user.id, name: user.name, email: user.email, role: user.role, active: user.active !== false };
}
export async function getRestaurantSettings() { requireDatabase(); if (mongoReady) { const doc = await SettingsModel.findOne({ key: "restaurant" }).lean() as { taxRate: number; maxDiscount: number } | null; return doc ? { taxRate: doc.taxRate, maxDiscount: doc.maxDiscount } : defaultSettings(); } return { ...memory.settings }; }
export async function updateRestaurantSettings(settings: { taxRate: number; maxDiscount: number }) { requireDatabase(); if (mongoReady) { const doc = await SettingsModel.findOneAndUpdate({ key: "restaurant" }, { key: "restaurant", ...settings }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean() as { taxRate: number; maxDiscount: number } | null; return doc ? { taxRate: doc.taxRate, maxDiscount: doc.maxDiscount } : settings; } memory.settings = { ...settings }; return settings; }
export async function createAuditLog(log: Omit<AuditLog, "id" | "createdAt">) { requireDatabase(); if (mongoReady) { const doc = await AuditLogModel.create(log); return { id: String(doc._id), ...log, createdAt: doc.createdAt.toISOString() }; } const audit = { ...log, id: `a${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date().toISOString() }; memory.audits.unshift(audit); return audit; }
export async function listAuditLogs() { requireDatabase(); if (mongoReady) { const docs = await AuditLogModel.find().sort({ createdAt: -1 }).limit(200).lean(); return docs.map(doc => ({ id: String(doc._id), actorId: doc.actorId, actorRole: doc.actorRole, action: doc.action, entityType: doc.entityType, entityId: doc.entityId, metadata: doc.metadata || {}, createdAt: new Date(doc.createdAt).toISOString() })); } return memory.audits.slice(0, 200); }
export function calculateTotals(items: OrderLine[], taxRate: number, discount: number) {
  const subtotal = Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
  const safeDiscount = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const tax = Number(((subtotal - safeDiscount) * taxRate / 100).toFixed(2));
  const total = Number((subtotal - safeDiscount + tax).toFixed(2));
  return { subtotal, tax, discount: safeDiscount, total: total > 0 ? total : 0 };
}
export function resetMemoryForTests() {
  memory.menu.length = 0;
  memory.orders.length = 0;
  memory.users.length = 0;
  memory.audits.length = 0;
  memory.settings = defaultSettings();
}
