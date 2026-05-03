import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, type User } from "../../../../lib/db/src/index.js";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export async function loadUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const raw = req.header("x-user-id");
  if (!raw || typeof raw !== "string") {
    next();
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, raw)).limit(1);
  if (user) req.user = user;
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required (set X-User-Id header)" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (!req.user.isAdmin) {
    res.status(403).json({ error: "Admin privileges required" });
    return;
  }
  next();
}
