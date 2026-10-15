import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { findUserByEmail, Role } from "./store";
import { UserModel } from "./models/user.model";
import { env } from "./config/env";

export type AuthUser = { id: string; name: string; email: string; role: Role };
export function signToken(user: AuthUser) { return jwt.sign(user, env.jwtSecret, { expiresIn: "8h" }); }
export async function verifyCredentials(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user || user.active === false) return null;

  const matchesHash = user.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;
  const matchesLegacyPassword = user.password === password;
  if (!matchesHash && !matchesLegacyPassword) return null;

  const userId = user.id || String((user as UserWithMongoId)._id || "");
  if (matchesLegacyPassword && !user.passwordHash && userId) {
    const passwordHash = await bcrypt.hash(password, 10);
    if (process.env.MONGODB_URI) {
      await UserModel.updateOne({ _id: userId }, { $set: { passwordHash }, $unset: { password: 1 } });
    }
  }

  return { id: userId, name: user.name, email: user.email, role: user.role } satisfies AuthUser;
}

type UserWithMongoId = { _id?: unknown };
export async function authRequired(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ message: "Authentication required." });
  try {
    const tokenUser = jwt.verify(header.slice(7), env.jwtSecret) as AuthUser;
    const currentUser = await findUserByEmail(tokenUser.email);
    if (!currentUser || currentUser.active === false) return res.status(401).json({ message: "User account is no longer active." });
    req.user = { id: currentUser.id || String((currentUser as UserWithMongoId)._id || tokenUser.id), name: currentUser.name, email: currentUser.email, role: currentUser.role };
    next();
  } catch {
    return res.status(401).json({ message: "Session expired. Please sign in again." });
  }
}
export function allowRoles(...roles: Role[]) { return (req: Request, res: Response, next: NextFunction) => { if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ message: "You do not have permission for this action." }); next(); }; }
export async function hashPassword(password: string) { return bcrypt.hash(password, 10); }

declare global { namespace Express { interface Request { user?: AuthUser } } }
