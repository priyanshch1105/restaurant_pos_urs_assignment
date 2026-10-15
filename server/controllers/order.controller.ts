import { Request, Response } from "express";
import { searchOrders, createRestaurantOrder, updateOrderStatus, recordPayment, updateOrderItems, getOrderById } from "../services/order.service";
import { orderQuerySchema } from "../validators/order.validator";
export async function list(req: Request, res: Response) {
  const parsed = orderQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ message: "Invalid order filters.", issues: parsed.error.flatten() });
  res.json(await searchOrders(parsed.data));
}
export async function detail(req: Request, res: Response) { const order = await getOrderById(String(req.params.id)); if (!order) return res.status(404).json({ message: "Order not found." }); res.json({ order }); }
export const invoice = detail;
export async function create(req: Request, res: Response) { res.status(201).json({ order: await createRestaurantOrder(req.body, req.user!) }); }
export async function status(req: Request, res: Response) { const order = await updateOrderStatus(String(req.params.id), req.body.status, req.user!); if (!order) return res.status(404).json({ message: "Order not found." }); res.json({ order }); }
export async function payment(req: Request, res: Response) { const order = await recordPayment(String(req.params.id), req.body.method, req.body.amount, req.user!.id, req.user!); if (!order) return res.status(404).json({ message: "Order not found or payment has already been recorded." }); res.json({ order }); }
export async function items(req: Request, res: Response) { const order = await updateOrderItems(String(req.params.id), req.body, req.user!); if (!order) return res.status(404).json({ message: "Order not found." }); res.json({ order }); }
