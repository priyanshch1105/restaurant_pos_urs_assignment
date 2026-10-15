import { Request, Response } from "express";
import { createAuditLog, getRestaurantSettings, updateRestaurantSettings } from "../repositories/restaurant.repository";

export async function getSettings(_req: Request, res: Response) {
  res.json({ settings: await getRestaurantSettings() });
}

export async function updateSettings(req: Request, res: Response) {
  const before = await getRestaurantSettings();
  const settings = await updateRestaurantSettings(req.body);
  await createAuditLog({ actorId: req.user!.id, actorRole: req.user!.role, action: "settings.updated", entityType: "restaurant_settings", entityId: "restaurant", metadata: { before, after: settings } });
  res.json({ settings });
}
