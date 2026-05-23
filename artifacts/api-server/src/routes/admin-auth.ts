import { Router } from "express";
import { requireAdminSession } from "../middlewares/requireAdminSession";

const router = Router();

const COOKIE_NAME = "admin_session";
const COOKIE_OPTS = {
  httpOnly: true,
  signed: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 8 * 60 * 60 * 1000, // 8 hours
};

// POST /api/admin/login
router.post("/login", (req, res) => {
  const { username, password } = req.body ?? {};

  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;

  if (!adminUser || !adminPass) {
    res.status(503).json({ error: "Admin credentials not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD environment secrets." });
    return;
  }

  if (username === adminUser && password === adminPass) {
    res.cookie(COOKIE_NAME, "authenticated", COOKIE_OPTS);
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Invalid username or password" });
  }
});

// POST /api/admin/logout
router.post("/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ success: true });
});

// GET /api/admin/me - check if admin session is active
router.get("/me", requireAdminSession, (req, res) => {
  res.json({ authenticated: true });
});

export default router;
