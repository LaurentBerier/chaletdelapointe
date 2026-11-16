import { eq } from "drizzle-orm";
import type { Response } from "express";
import { db, reservationsTable as stays, usersTable, adminActionsTable, bookingEmailsTable } from "../../../../lib/db/src/index.js";
import { AdminCancelReservationResponse } from "../../../../lib/api-zod/src/index.js";
import { stayDates } from "../../../../lib/shared/stay-dates.js";
import { cancellationSubject, deliverBookingEmails } from "./booking-email.js";

// Called only after the route verifies the reservation management permission.
export async function cancelStayAsAdmin(res: Response, id: string, adminId: string, reason?: string | null) {
  const result = await db.transaction(async (tx) => {
    const [stay] = await tx.select().from(stays).where(eq(stays.id, id)).for("update");
    if (!stay) return { code: 404, error: "Réservation introuvable." } as const;
    if (stay.status === "cancelled") return { stay };
    if (stay.status === "rejected" || stay.status === "expired")
      return { code: 409, error: "Ce séjour est déjà refusé ou expiré." } as const;

    const [updated] = await tx.update(stays).set({ status: "cancelled" }).where(eq(stays.id, id)).returning();
    await tx.insert(adminActionsTable).values({
      adminUserId: adminId, actionType: "cancel", reservationId: id,
      reason: reason ?? null, details: { previousStatus: stay.status },
    });
    if (stay.status === "draft") return { stay: updated };

    const [booker] = await tx.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, stay.userId));
    const [message] = await tx.insert(bookingEmailsTable).values({
      reservationId: id, recipient: booker.email, subject: cancellationSubject,
      body: "L’administration du Chalet de la Pointe a annulé votre réservation.\n\nSéjour : " +
        stayDates(stay.startDate, stay.endDate) + ".\n\nSi vous avez des questions, vous pouvez répondre à ce courriel.",
    }).returning({ id: bookingEmailsTable.id });
    return { stay: updated, messageId: message.id };
  });
  if (result.code) { res.status(result.code).json({ error: result.error }); return; }
  if (result.messageId) await deliverBookingEmails(result.messageId);
  res.json(AdminCancelReservationResponse.parse(result.stay));
}
