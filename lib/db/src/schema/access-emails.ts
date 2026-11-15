import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";

export const accessEmails = pgTable(
  "access_emails",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id").notNull(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    kind: text("kind", {
      enum: [
        "pending",
        "granted",
        "denied",
        "registration_pending",
        "registration_approved",
        "registration_denied",
      ],
    }).notNull(),
    bookingAllowed: boolean("booking_allowed"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    attempts: integer("attempts").notNull().default(0),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (t) => [unique().on(t.requestId, t.kind, t.recipientId)],
);
