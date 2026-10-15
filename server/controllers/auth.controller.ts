import { Request, Response } from "express";
import { authenticate } from "../services/auth.service";
import { createAuditLog, createUser, listUsers, updateStaffUser } from "../repositories/restaurant.repository";
import { hashPassword } from "../auth";
export async function login(req: Request, res: Response) { const result = await authenticate(req.body.email, req.body.password); if (!result) return res.status(401).json({ message: "Incorrect email or password." }); res.json(result); }
export function me(req: Request, res: Response) { res.json({ user: req.user }); }
export async function users(_req: Request, res: Response) { res.json({ users: await listUsers() }); }
export async function createStaff(req: Request, res: Response) { const user = await createUser({ id: `u${Date.now()}`, name: req.body.name, email: req.body.email.trim().toLowerCase(), role: req.body.role, passwordHash: await hashPassword(req.body.password) }); await createAuditLog({ actorId: req.user!.id, actorRole: req.user!.role, action: "user.created", entityType: "user", entityId: user.id, metadata: { role: user.role } }); res.status(201).json({ user }); }
export async function updateStaff(req: Request, res: Response) {
  if (req.body.active === false && req.params.id === req.user!.id) return res.status(400).json({ message: "You cannot deactivate your own account." });
  const updates = { ...req.body, ...(req.body.email ? { email: req.body.email.trim().toLowerCase() } : {}) };
  const staffId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const user = await updateStaffUser(staffId, updates);
  if (!user) return res.status(404).json({ message: "Staff account not found." });
  const action = updates.active === false ? "user.deactivated" : updates.active === true ? "user.reactivated" : "user.updated";
  await createAuditLog({ actorId: req.user!.id, actorRole: req.user!.role, action, entityType: "user", entityId: user.id, metadata: { role: user.role } });
  res.json({ user });
}
