import { Request, Response } from "express";
import { listAuditLogs } from "../repositories/restaurant.repository";

export async function list(_req: Request, res: Response) {
  res.json({ logs: await listAuditLogs() });
}
