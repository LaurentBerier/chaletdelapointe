import {
  pgTable, uuid, date, integer, text, jsonb, timestamp, index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { reservationStatusEnum } from "./enums";
import { propertiesTable } from "./properties";
import { usersTable } from "./users";

export interface SeasonBreakdownEntry {
  seasonName: "haute" | "mi" | "basse";
  nights: number;
  basePricePerNight: number;
  effectivePricePerNight: number;
  subtotal: number;
}

export const reservationsTable = pgTable(
  "reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => propertiesTable.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    guests: integer("guests").notNull().default(1),
    nights: integer("nights").notNull(),
    subtotal: integer("subtotal").notNull(),
    discountAmount: integer("discount_amount").notNull().default(0),
    total: integer("total").notNull(),
    seasonBreakdown: jsonb("season_breakdown").$type<SeasonBreakdownEntry[]>().notNull(),
    status: reservationStatusEnum("status").notNull().default("pending_payment"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("reservations_property_idx").on(t.propertyId),
    index("reservations_user_idx").on(t.userId),
    index("reservations_status_idx").on(t.status),
    index("reservations_dates_idx").on(t.propertyId, t.startDate, t.endDate),
  ],
);

export const insertReservationSchema = createInsertSchema(reservationsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertReservation = z.infer<typeof insertReservationSchema>;
export type Reservation = typeof reservationsTable.$inferSelect;
