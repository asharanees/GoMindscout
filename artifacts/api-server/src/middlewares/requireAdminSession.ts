import type { Request, Response, NextFunction } from "express";

export function requireAdminSession(req: Request, res: Response, next: NextFunction) {
  const session = (req as any).signedCookies?.admin_session;
  if (session !== "authenticated") {
    res.status(401).json({ error: "Admin authentication required" });
    return;
  }
  next();
}
