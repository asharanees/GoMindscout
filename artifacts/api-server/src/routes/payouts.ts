import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, payoutRequestsTable, bookingsTable, mentorProfilesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, getUserByClerkId } from "../lib/auth";

const router = Router();

function payoutToResponse(p: any) {
  return {
    id: p.id,
    mentorId: p.mentorId,
    amount: Number(p.amount),
    method: p.method,
    status: p.status,
    accountDetails: p.accountDetails ?? null,
    adminNote: p.adminNote ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

// GET /api/payouts - mentor's own payout requests + withdrawable balance
router.get("/", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);

  try {
    const user = await getUserByClerkId(userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.userId, user.id)).limit(1);
    if (!mentor) { res.status(404).json({ error: "No mentor profile" }); return; }

    // Calculate withdrawable balance: payout_released (new flow) + completed (legacy) bookings minus pending/approved payout requests
    const releasedBookings = await db.select().from(bookingsTable)
      .where(and(
        eq(bookingsTable.mentorId, mentor.id),
        sql`${bookingsTable.status} IN ('payout_released', 'completed')`
      ));
    const totalReleased = releasedBookings.reduce((s, b) => s + Number(b.mentorEarning ?? 0), 0);

    const pendingPayouts = await db.select().from(payoutRequestsTable)
      .where(and(eq(payoutRequestsTable.mentorId, mentor.id), sql`${payoutRequestsTable.status} IN ('pending','approved')`));
    const pendingAmount = pendingPayouts.reduce((s, p) => s + Number(p.amount), 0);

    const paidOut = await db.select().from(payoutRequestsTable)
      .where(and(eq(payoutRequestsTable.mentorId, mentor.id), eq(payoutRequestsTable.status, "paid_out")));
    const paidOutAmount = paidOut.reduce((s, p) => s + Number(p.amount), 0);

    const withdrawable = Math.max(0, totalReleased - pendingAmount - paidOutAmount);

    const allRequests = await db.select().from(payoutRequestsTable)
      .where(eq(payoutRequestsTable.mentorId, mentor.id))
      .orderBy(sql`${payoutRequestsTable.createdAt} DESC`);

    res.json({
      withdrawableBalance: Math.round(withdrawable * 100) / 100,
      pendingBalance: Math.round(pendingAmount * 100) / 100,
      requests: allRequests.map(payoutToResponse),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching payouts");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/payouts/request - mentor requests payout
router.post("/request", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const { amount, method, accountDetails } = req.body;

  if (!amount || amount <= 0) {
    res.status(400).json({ error: "Valid amount required" });
    return;
  }
  if (!accountDetails || !accountDetails.trim()) {
    res.status(400).json({ error: "Account details are required for payout processing" });
    return;
  }

  try {
    const user = await getUserByClerkId(userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.userId, user.id)).limit(1);
    if (!mentor) { res.status(404).json({ error: "No mentor profile" }); return; }

    const [request] = await db.insert(payoutRequestsTable).values({
      mentorId: mentor.id,
      amount: amount.toString(),
      method: method ?? "bank_transfer",
      accountDetails: accountDetails.trim(),
      status: "pending",
    }).returning();

    res.status(201).json(payoutToResponse(request));
  } catch (err) {
    req.log.error({ err }, "Error creating payout request");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
