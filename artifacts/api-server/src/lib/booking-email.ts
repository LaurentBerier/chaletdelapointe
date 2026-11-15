import { bookingHtml } from "./mail-design.js";
import nodemailer from "nodemailer";
import { and, eq, isNull, ne, or } from "drizzle-orm";
import { db, bookingEmailsTable as messages, reservationsTable as stays } from "../../../../lib/db/src/index.js";
import { logger } from "./logger.js";
export const cancellationSubject = "Chalet St-Mathieu · Votre réservation a été annulée";

export function reviewUrl() {
  const origin = process.env.WEBSITE_URL || (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`);
  return origin ? new URL("/tableau-de-bord?onglet=approbations", origin).href : undefined;
}

// Flushed after writes and when a participant opens their dashboard. A failed
// delivery stays queued; concurrent requests skip rows another sender holds.
export async function deliverBookingEmails(messageId?: string) {
  const smtp = process.env.SMTP_URL;
  const from = process.env.BOOKING_EMAIL_FROM;
  if (!smtp || !from) return;
  const options = new URL(smtp);
  options.searchParams.set("connectionTimeout", "5000");
  options.searchParams.set("greetingTimeout", "5000");
  options.searchParams.set("socketTimeout", "8000");
  const mailer = nodemailer.createTransport(options.href, { from });
  try {
    await db.transaction(async (tx) => {
      const batch = await tx.select({ message: messages }).from(messages)
        .innerJoin(stays, eq(stays.id, messages.reservationId)).where(and(isNull(messages.sentAt),
          messageId ? eq(messages.id, messageId) : undefined,
          // Do not send a delayed approval after the stay was cancelled.
          or(ne(stays.status, "cancelled"), eq(messages.subject, cancellationSubject))))
        .orderBy(messages.id).limit(20).for("update", { of: messages, skipLocked: true });
      for (const { message } of batch) {
        try {
          await mailer.sendMail({
            from, to: { name: "", address: message.recipient }, subject: message.subject,
            html: bookingHtml(message.subject,message.body,reviewUrl()), text: message.body, messageId: '<' + message.id + '@chalet-booking>',
          });
        } catch {
          logger.warn({ messageId: message.id }, "Booking email queued for retry");
          continue;
        }
        await tx.update(messages).set({ sentAt: new Date() }).where(eq(messages.id, message.id));
      }
    });
  } catch {
    logger.warn("Booking emails remain queued for retry");
  } finally {
    mailer.close();
  }
}
