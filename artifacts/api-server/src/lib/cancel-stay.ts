import { eq } from "drizzle-orm";
import type { Response } from "express";
import { db, reservationsTable as stays, usersTable, adminActionsTable, bookingEmailsTable, type User } from "../../../../lib/db/src/index.js";
import { AdminCancelReservationResponse } from "../../../../lib/api-zod/src/index.js";
import { stayDates } from "../../../../lib/shared/stay-dates.js";
import { cancellationSubject, deliverBookingEmails } from "./booking-email.js";
import { cancelsOthersStays, isCancellableStay, managesStays } from "../../../../lib/shared/reservation-roles.js";

// Both routes require an approved, enabled account. Check ownership while the
// stay is locked so cancellation, audit and notification form one operation.
export async function cancelStay(res: Response, id: string, actor: User, reason?: string | null) {
  const result = await db.transaction(async (tx) => {
    const [stay] = await tx.select().from(stays).where(eq(stays.id, id)).for("update");
    if (!stay) return { code: 404, error: "Réservation introuvable." } as const;
    const ownStay = stay.userId === actor.id;
    if (!ownStay && !cancelsOthersStays(actor))
      return { code: 403, error: "Vous pouvez seulement annuler vos propres séjours." } as const;
    if (stay.status === "cancelled") return { stay };
    if (!isCancellableStay(stay.status))
      return { code: 409, error: "Ce séjour est déjà refusé ou expiré." } as const;

    const [updated] = await tx.update(stays).set({ status: "cancelled" }).where(eq(stays.id, id)).returning();
    await tx.insert(adminActionsTable).values({
      adminUserId: actor.id, actionType: "cancel", reservationId: id,
      reason: reason ?? null, details: {
        previousStatus: stay.status,
        cancelledBy: ownStay ? "booker" : managesStays(actor) ? "administrator" : "delegate",
      },
    });
    if (stay.status === "draft") return { stay: updated };

    const [booker] = await tx.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, stay.userId));
    const [message] = await tx.insert(bookingEmailsTable).values({
      reservationId: id, recipient: booker.email, subject: cancellationSubject,
      body: (ownStay
        ? "Votre réservation au Chalet de la Pointe a été annulée à votre demande."
        : "L’administration du Chalet de la Pointe a annulé votre réservation.") + "\n\nSéjour : " +
        stayDates(stay.startDate, stay.endDate) + ".\n\nSi vous avez des questions, vous pouvez répondre à ce courriel.",
    }).returning({ id: bookingEmailsTable.id });
    return { stay: updated, messageId: message.id };
  });
  if (result.code) { res.status(result.code).json({ error: result.error }); return; }
  if (result.messageId) await deliverBookingEmails(result.messageId);
  if (result.stay.userId !== actor.id && !managesStays(actor)) {
    const { id, startDate, endDate, guests, status } = result.stay;
    res.json({ id, startDate, endDate, guests, status });
    return;
  }
  res.json(AdminCancelReservationResponse.parse(result.stay));
}
