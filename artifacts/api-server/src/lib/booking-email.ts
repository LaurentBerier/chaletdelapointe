import { bookingHtml } from "./mail-design.js";
import nodemailer from "nodemailer";
import { eq, isNull } from "drizzle-orm";
import { db, bookingEmailsTable as messages } from "../../../../lib/db/src/index.js";
import { logger } from "./logger.js";

export function reviewUrl() {
  const origin = process.env.WEBSITE_URL || (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`);
  return origin ? new URL("/tableau-de-bord?onglet=approbations", origin).href : undefined;
}

// Flushed after writes and when a participant opens their dashboard. A failed
// delivery stays queued; concurrent requests skip rows another sender holds.
export async function deliverBookingEmails() {
  const smtp = process.env.SMTP_URL;
  const from = process.env.BOOKING_EMAIL_FROM;
  if (!smtp || !from) return;
  const mailer = nodemailer.createTransport(smtp, { from });
  try {
    await db.transaction(async (tx) => {
      const batch = await tx.select().from(messages).where(isNull(messages.sentAt))
        .orderBy(messages.id).limit(20).for("update", { skipLocked: true });
      for (const message of batch) {
        try {
          await mailer.sendMail({
            from, to: message.recipient, subject: message.subject,
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
  }
}
