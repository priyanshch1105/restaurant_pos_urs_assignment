import { Request, Response } from "express";
import { menuService } from "../services/menu.service";
export async function list(req: Request, res: Response) { res.json({ items: await menuService.list({ search: String(req.query.search || ""), category: String(req.query.category || ""), available: req.query.available === undefined ? undefined : req.query.available === "true", includeInactive: req.user?.role === "Admin" && req.query.includeInactive === "true" }) }); }
export async function create(req: Request, res: Response) { res.status(201).json({ item: await menuService.create(req.body, req.user!) }); }
export async function update(req: Request, res: Response) { const item = await menuService.update(String(req.params.id), req.body); if (!item) return res.status(404).json({ message: "Menu item not found." }); res.json({ item }); }
export async function deactivate(req: Request, res: Response) { const item = await menuService.deactivate(String(req.params.id), req.user!); if (!item) return res.status(404).json({ message: "Menu item not found." }); res.json({ item }); }
export async function reactivate(req: Request, res: Response) { const item = await menuService.reactivate(String(req.params.id)); if (!item) return res.status(404).json({ message: "Menu item not found." }); res.json({ item }); }
