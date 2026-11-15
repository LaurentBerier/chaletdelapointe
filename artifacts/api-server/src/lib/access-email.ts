import nodemailer from "nodemailer";
import { and, asc, eq, isNull, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  db,
  accessEmails as mail,
  usersTable,
} from "../../../../lib/db/src/index.js";
import { chaletEmail } from "../../../../lib/shared/chalet-email.mjs";
import { logger } from "./logger.js";

const recipient = alias(usersTable, "recipient");
type Kind = typeof mail.$inferSelect.kind;

function letter(
  kind: Kind,
  requestId: string,
  name: string,
  email: string,
  origin: string,
) {
  const review = kind === "pending";
  const granted = kind === "granted";
  const title = review
    ? "Nouvelle demande d’accès aux réservations"
    : granted
      ? "Votre accès aux réservations est accepté"
      : "Votre demande d’accès aux réservations est refusée";
  const message = review
    ? name +
      " (" +
      email +
      ") souhaite pouvoir réserver le chalet. Ouvrez sa demande pour l’accepter ou la refuser."
    : "Bonjour " +
      name +
      ",\n\n" +
      (granted
        ? "Vous pouvez maintenant choisir vos dates dans le calendrier et soumettre une demande de séjour."
        : "L’administration du chalet a refusé votre demande d’accès aux réservations. Si vous avez des questions, répondez à ce courriel.");
  const href = new URL(
    review
      ? "/tableau-de-bord?onglet=comptes&demande=" + requestId
      : granted
        ? "/calendrier"
        : "/tableau-de-bord?onglet=profil",
    origin,
  ).href;
  const button = review
    ? "Examiner la demande"
    : granted
      ? "Choisir mes dates"
      : "Voir mon profil";
  const note = review
    ? "La décision se prend dans votre espace administrateur."
    : "Chalet de la Pointe · Lac Saint-Mathieu";
  return {
    subject: "Chalet de la Pointe · " + title,
    text: [title, message, button + " : " + href, note].join("\n\n"),
    html: chaletEmail({
      category: "Accès aux réservations",
      title,
      message,
      href,
      button,
      note,
      view: "pointe",
    }),
  };
}

// A row is locked only while its own message is sent; concurrent deliveries skip it.
// The retry time is persisted so a provider outage cannot erase a decision.
export async function deliverAccessEmails(requestId?: string) {
  const {
    SMTP_URL: smtp,
    BOOKING_EMAIL_FROM: from,
    WEBSITE_URL: origin,
  } = process.env;
  if (!smtp || !from || !origin) return;
  const options = new URL(smtp);
  options.searchParams.set("connectionTimeout", "5000");
  options.searchParams.set("greetingTimeout", "5000");
  options.searchParams.set("socketTimeout", "8000");
  const transport = nodemailer.createTransport(options.href);
  try {
    for (let i = 0; i < 10; i++) {
      const processed = await db.transaction(async (tx) => {
        const [row] = await tx
          .select({
            id: mail.id,
            requestId: mail.requestId,
            kind: mail.kind,
            attempts: mail.attempts,
            name: usersTable.name,
            email: usersTable.email,
            to: recipient.email,
            admin: recipient.isAdmin,
            disabled: recipient.isDisabled,
            activeRequest: usersTable.bookingAccessRequestId,
            state: usersTable.bookingAccess,
            memberDisabled: usersTable.isDisabled,
          })
          .from(mail)
          .innerJoin(usersTable, eq(mail.memberId, usersTable.id))
          .innerJoin(recipient, eq(mail.recipientId, recipient.id))
          .where(
            and(
              isNull(mail.sentAt),
              lte(mail.nextAttemptAt, sql`now()`),
              requestId ? eq(mail.requestId, requestId) : undefined,
            ),
          )
          .orderBy(asc(mail.nextAttemptAt), asc(mail.createdAt))
          .limit(1)
          .for("update", { of: mail, skipLocked: true });
        if (!row) return false;
        // Retired review links and suspended recipients no longer need a notification.
        if (
          !row.disabled &&
          (row.kind !== "pending" ||
            (row.admin &&
              !row.memberDisabled &&
              row.activeRequest === row.requestId &&
              row.state === "pending"))
        ) {
          try {
            await transport.sendMail({
              from,
              to: { name: "", address: row.to },
              ...letter(row.kind, row.requestId, row.name, row.email, origin),
              messageId: "<access-" + row.id + "@chaletdelapointe.com>",
            });
          } catch {
            await tx
              .update(mail)
              .set({
                attempts: row.attempts + 1,
                nextAttemptAt: new Date(
                  Date.now() +
                    60000 * Math.min(240, 2 ** Math.min(8, row.attempts)),
                ),
              })
              .where(eq(mail.id, row.id));
            logger.warn({ messageId: row.id }, "Access email queued for retry");
            return true;
          }
        }
        await tx
          .update(mail)
          .set({ sentAt: new Date() })
          .where(eq(mail.id, row.id));
        return true;
      });
      if (!processed) break;
    }
  } catch {
    logger.warn("Access emails remain queued for retry");
  } finally {
    transport.close();
  }
}
