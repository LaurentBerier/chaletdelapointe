import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { reservationsTable } from "./reservations.js";

// One row per recipient. Persist the message in the same transaction as the decision.
export const bookingEmailsTable = pgTable("booking_emails", {
  id: uuid("id").primaryKey().defaultRandom(),
  reservationId: uuid("reservation_id").notNull().references(() => reservationsTable.id),
  recipient: text("recipient").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
});
