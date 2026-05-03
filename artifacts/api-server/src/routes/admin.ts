import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, reservationsTable, usersTable, type Reservation } from "@workspace/db";
import {
  AdminListReservationsResponse,
  AdminConfirmReservationParams,
  AdminConfirmReservationBody,
  AdminConfirmReservationResponse,
  AdminCancelReservationParams,
  AdminCancelReservationBody,
  AdminCancelReservationResponse,
  AdminModifyReservationParams,
  AdminModifyReservationBody,
  AdminModifyReservationResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth.js";
import { logAdminAction } from "../lib/admin-log.js";
import { calculateReservationPrice, PricingError } from "../lib/pricing.js";
import { toIsoDate } from "../lib/dates.js";

const router: IRouter = Router();

function serialize(r: Reservation) {
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

router.get("/admin/reservations", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(reservationsTable)
    .orderBy(desc(reservationsTable.createdAt));
  res.json(AdminListReservationsResponse.parse(rows.map(serialize)));
});

router.post("/admin/reservations/:id/confirm", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminConfirmReservationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = AdminConfirmReservationBody.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [existing] = await db
    .select()
    .from(reservationsTable)
    .where(eq(reservationsTable.id, params.data.id))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "Reservation not found" });
    return;
  }
  try {
    const [updated] = await db
      .update(reservationsTable)
      .set({ status: "confirmed" })
      .where(eq(reservationsTable.id, existing.id))
      .returning();
    await logAdminAction({
      adminUserId: req.user!.id,
      actionType: "confirm",
      reservationId: updated.id,
      reason: body.data.reason ?? null,
      details: { previousStatus: existing.status },
    });
    res.json(AdminConfirmReservationResponse.parse(serialize(updated)));
  } catch (err) {
    if (isOverlapError(err)) {
      res.status(409).json({ error: "Cannot confirm: dates conflict with another reservation" });
      return;
    }
    throw err;
  }
});

router.post("/admin/reservations/:id/cancel", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminCancelReservationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = AdminCancelReservationBody.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [existing] = await db
    .select()
    .from(reservationsTable)
    .where(eq(reservationsTable.id, params.data.id))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "Reservation not found" });
    return;
  }
  const [updated] = await db
    .update(reservationsTable)
    .set({ status: "cancelled" })
    .where(eq(reservationsTable.id, existing.id))
    .returning();
  await logAdminAction({
    adminUserId: req.user!.id,
    actionType: "cancel",
    reservationId: updated.id,
    reason: body.data.reason ?? null,
    details: { previousStatus: existing.status },
  });
  res.json(AdminCancelReservationResponse.parse(serialize(updated)));
});

router.patch("/admin/reservations/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminModifyReservationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = AdminModifyReservationBody.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [existing] = await db
    .select()
    .from(reservationsTable)
    .where(eq(reservationsTable.id, params.data.id))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "Reservation not found" });
    return;
  }

  const newStartDate = body.data.startDate ? toIsoDate(body.data.startDate) : toIsoDate(existing.startDate);
  const newEndDate = body.data.endDate ? toIsoDate(body.data.endDate) : toIsoDate(existing.endDate);
  const newGuests = body.data.guests ?? existing.guests;
  const newStatus = body.data.status ?? existing.status;
  const newNotes = body.data.notes !== undefined ? body.data.notes : existing.notes;

  const datesChanged =
    newStartDate !== toIsoDate(existing.startDate) || newEndDate !== toIsoDate(existing.endDate);

  let priced = {
    nights: existing.nights,
    subtotal: existing.subtotal,
    discountAmount: existing.discountAmount,
    total: existing.total,
    seasonBreakdown: existing.seasonBreakdown,
  };

  if (datesChanged) {
    try {
      const [reservationUser] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, existing.userId))
        .limit(1);
      const result = await calculateReservationPrice({
        propertyId: existing.propertyId,
        startDate: newStartDate,
        endDate: newEndDate,
        guests: newGuests,
        user: reservationUser ?? null,
      });
      priced = {
        nights: result.nights,
        subtotal: result.subtotal,
        discountAmount: result.discountAmount,
        total: result.total,
        seasonBreakdown: result.seasonBreakdown,
      };
    } catch (err) {
      if (err instanceof PricingError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      throw err;
    }
  }

  try {
    const [updated] = await db
      .update(reservationsTable)
      .set({
        startDate: newStartDate,
        endDate: newEndDate,
        guests: newGuests,
        status: newStatus,
        notes: newNotes,
        ...priced,
      })
      .where(eq(reservationsTable.id, existing.id))
      .returning();

    await logAdminAction({
      adminUserId: req.user!.id,
      actionType: "modify",
      reservationId: updated.id,
      reason: body.data.reason ?? null,
      details: {
        before: {
          startDate: toIsoDate(existing.startDate),
          endDate: toIsoDate(existing.endDate),
          guests: existing.guests,
          status: existing.status,
        },
        after: {
          startDate: newStartDate,
          endDate: newEndDate,
          guests: newGuests,
          status: newStatus,
        },
      },
    });
    res.json(AdminModifyReservationResponse.parse(serialize(updated)));
  } catch (err) {
    if (isOverlapError(err)) {
      res.status(409).json({ error: "These dates conflict with another reservation" });
      return;
    }
    throw err;
  }
});

export default router;
