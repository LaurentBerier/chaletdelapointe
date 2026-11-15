import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, reservationsTable as stays, usersTable, adminActionsTable, bookingEmailsTable } from "../../../../lib/db/src/index.js";
import { requireAuth, requireApprover } from "../middlewares/auth.js";
import { deliverBookingEmails } from "../lib/booking-email.js";
import { GetReservationParams } from "../../../../lib/api-zod/src/index.js";

const router: IRouter = Router();
router.get("/me", requireAuth, (req, res) => {
  const { id, name, canApprove, isAdmin } = req.user!;
  res.json({ id, name, canApprove, isAdmin });
});

router.get("/reviews", requireApprover, async (_req, res) => {
  await deliverBookingEmails();
  res.json(await db.select({
    id: stays.id, startDate: stays.startDate, endDate: stays.endDate,
    guests: stays.guests, ownerName: usersTable.name, status: stays.status,
  }).from(stays).innerJoin(usersTable, eq(usersTable.id, stays.userId))
    .orderBy(desc(stays.createdAt)));
});

router.post("/reviews/:id", requireApprover, async (req, res) => {
  const params = GetReservationParams.safeParse(req.params);
  const decision = req.body?.decision;
  if (!params.success || !["approve", "reject"].includes(decision)) {
    res.status(400).json({ error: "Décision invalide." }); return;
  }
  const approved = decision === "approve";
  const status = approved ? "confirmed" : "rejected";
  const updated = await db.transaction(async (tx) => {
    const [stay] = await tx.update(stays).set({ status }).where(and(
      eq(stays.id, params.data.id), eq(stays.status, "pending_approval")
    )).returning();
    if (!stay) return false;
    const [owner] = await tx.select().from(usersTable).where(eq(usersTable.id, stay.userId));
    await tx.insert(adminActionsTable).values({
      adminUserId: req.user!.id, actionType: approved ? "confirm" : "cancel",
      reservationId: stay.id, details: { decision, previousStatus: "pending_approval" },
    });
    const subject = "Chalet St-Mathieu · Demande " + (approved ? "approuvée" : "refusée");
    await tx.insert(bookingEmailsTable).values({
      reservationId: stay.id, recipient: owner.email, subject,
      body: subject + "\nDu " + stay.startDate + " au " + stay.endDate + ".",
    });
    return true;
  });
  if (!updated) { res.status(409).json({ error: "Cette demande a déjà été traitée ou retirée." }); return; }
  await deliverBookingEmails();
  res.json({ status });
});
export default router;
