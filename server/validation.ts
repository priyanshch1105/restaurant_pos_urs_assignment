import { z } from "zod";
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });
export const menuSchema = z.object({ name: z.string().trim().min(2).max(80), category: z.string().trim().min(2).max(40), price: z.number().finite().nonnegative(), available: z.boolean().default(true), active: z.boolean().optional() });
const orderItemsSchema = z.array(z.object({ menuItemId: z.string().min(1), quantity: z.number().int().min(1).max(50) })).min(1).max(100);
export const orderSchema = z.object({ type: z.enum(["Dine-in", "Takeaway"]), tableNumber: z.number().int().min(1).optional(), items: orderItemsSchema, discount: z.number().finite().min(0).max(100000).default(0) }).superRefine((value, ctx) => { if (value.type === "Dine-in" && value.tableNumber === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["tableNumber"], message: "Table number is required for dine-in orders." }); });
export const orderItemsUpdateSchema = z.object({ items: orderItemsSchema, discount: z.number().finite().min(0).max(100000).optional() });
export const statusSchema = z.object({ status: z.enum(["Pending", "Preparing", "Ready", "Completed"]) });
export const paymentSchema = z.object({ method: z.enum(["Cash", "UPI"]), amount: z.number().finite().positive() });
export const orderQuerySchema = z.object({
  search: z.string().trim().max(80).optional(),
  status: z.enum(["Pending", "Preparing", "Ready", "Completed"]).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
}).superRefine((value, ctx) => {
  if (value.from && value.to && value.from > value.to) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["to"], message: "The end date must not be before the start date." });
  }
});
export const settingsSchema = z.object({ taxRate: z.number().finite().min(0).max(100), maxDiscount: z.number().finite().min(0).max(100000) });
export const userCreateSchema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().email(), password: z.string().min(6) }).transform(value => ({ ...value, role: "Staff" as const }));
export const staffUpdateSchema = z.object({ name: z.string().trim().min(2).max(80).optional(), email: z.string().email().optional(), active: z.boolean().optional() }).refine(value => Object.keys(value).length > 0);
