import { stayDates } from "../../../../lib/shared/stay-dates.js";
import { Router, type IRouter, type Request } from "express";
import { and, eq, desc, isNotNull } from "drizzle-orm";
import { db, reservationsTable, usersTable, bookingEmailsTable, type Reservation } from "../../../../lib/db/src/index.js";
import {
  QuoteReservationBody,
  QuoteReservationResponse,
  CreateReservationBody,
  GetReservationParams,
  GetReservationResponse,
  CancelReservationParams,
  CancelReservationResponse,
  ListMyReservationsResponse,
} from "../../../../lib/api-zod/src/index.js";
import { requireAuth } from "../middlewares/auth.js";
import { calculateReservationPrice, validateStay, PricingError } from "../lib/pricing.js";
import { deliverBookingEmails, reviewUrl } from "../lib/booking-email.js";
import { toIsoDate } from "../lib/dates.js";

const router: IRouter = Router();

function serializeReservation(r: Reservation) {
  return {
    ...r,
    startDate: toIsoDate(r.startDate),
    endDate: toIsoDate(r.endDate),
  };
}

function isOverlapError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: unknown; cause?: { code?: unknown }; message?: unknown };
  if (e.code === "23P01") return true;
  if (e.cause && typeof e.cause === "object" && e.cause.code === "23P01") return true;
  if (typeof e.message === "string" && e.message.includes("reservations_no_overlap")) return true;
  return false;
}

router.post("/reservations/quote", async (req: Request, res): Promise<void> => {
  const parsed = QuoteReservationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const { propertyId, startDate, endDate, guests } = parsed.data;
    const result = await calculateReservationPrice({
      propertyId,
      startDate: toIsoDate(startDate),
      endDate: toIsoDate(endDate),
      guests,
      user: req.user ?? null,
    });
    res.json(
      QuoteReservationResponse.parse({
        propertyId,
        startDate: toIsoDate(startDate),
        endDate: toIsoDate(endDate),
        ...result,
      }),
    );
  } catch (err) {
    if (err instanceof PricingError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    throw err;
  }
});

router.get("/reservations", requireAuth, async (req, res): Promise<void> => {
  await deliverBookingEmails();
  const rows = await db
    .select()
    .from(reservationsTable)
    .where(eq(reservationsTable.userId, req.user!.id))
    .orderBy(desc(reservationsTable.createdAt));
  res.json(ListMyReservationsResponse.parse(rows.map(serializeReservation)));
});

router.post("/reservations", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateReservationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { propertyId, startDate, endDate, guests, notes } = parsed.data;
  const startIso = toIsoDate(startDate);
  const endIso = toIsoDate(endDate);

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto" }).format(new Date());
  if (startIso < today || req.body.startDate !== startIso || req.body.endDate !== endIso) {
    res.status(400).json({ error: "Choisissez des dates valides à partir d’aujourd’hui." });
    return;
  }
  const owner = req.user!;
  try {
    const nights = await validateStay(propertyId, startIso, endIso, guests);
    const created = await db.transaction(async (tx) => {
      const approvers = await tx.select({ email: usersTable.email }).from(usersTable).where(and(
        eq(usersTable.group, "proprietaire"), eq(usersTable.canApprove, true), eq(usersTable.isDisabled, false), isNotNull(usersTable.authUserId)
      ));
      const review = reviewUrl();
      if (!approvers.length || !process.env.SMTP_URL || !process.env.BOOKING_EMAIL_FROM || !review) {
        throw new PricingError("Les approbations par courriel ne sont pas encore configurées.", 503);
      }
      const [stay] = await tx.insert(reservationsTable).values({
        propertyId, userId: owner.id, startDate: startIso, endDate: endIso,
        guests, nights, subtotal: 0, discountAmount: 0, total: 0, seasonBreakdown: [],
        status: "pending_approval", notes: notes ?? null,
      }).returning();
      await tx.insert(bookingEmailsTable).values(approvers.map(({ email }) => ({
        reservationId: stay.id, recipient: email, subject: "Chalet St-Mathieu · Demande à approuver",
        body: owner.name + " demande le chalet : " + stayDates(startIso,endIso) +
          " pour " + guests + (guests > 1 ? " voyageurs." : " voyageur.") + "\n\nExaminer la demande : " + review,
      })));
      return stay;
    });
    await deliverBookingEmails();
    res.status(201).json(GetReservationResponse.parse(serializeReservation(created)));
  } catch (err) {
    if (err instanceof PricingError) { res.status(err.status).json({ error: err.message }); return; }
    if (isOverlapError(err)) {
      res.status(409).json({ error: "Ces dates viennent d’être réservées. Choisissez un autre séjour." });
      return;
    }
    throw err;
  }
});

router.get("/reservations/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetReservationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select()
    .from(reservationsTable)
    .where(eq(reservationsTable.id, params.data.id))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Reservation not found" });
    return;
  }
  if (row.userId !== req.user!.id && !req.user!.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  res.json(GetReservationResponse.parse(serializeReservation(row)));
});

router.post("/reservations/:id/cancel", requireAuth, async (req, res): Promise<void> => {
  const params = CancelReservationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select()
    .from(reservationsTable)
    .where(eq(reservationsTable.id, params.data.id))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Reservation not found" });
    return;
  }
  if (row.userId !== req.user!.id && !req.user!.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (row.status === "cancelled") {
    res.json(CancelReservationResponse.parse(serializeReservation(row)));
    return;
  }
  const [updated] = await db
    .update(reservationsTable)
    .set({ status: "cancelled" })
    .where(eq(reservationsTable.id, row.id))
    .returning();
  res.json(CancelReservationResponse.parse(serializeReservation(updated)));
});

export default router;
