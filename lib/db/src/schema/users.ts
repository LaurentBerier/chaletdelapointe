import { bookingAccessStates } from "../booking-access.js";
import { pgTable, text, uuid, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { userGroupEnum } from "./enums.js";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  authUserId: uuid("auth_user_id").unique(),
  canApprove: boolean("can_approve").notNull().default(false),
  canCancelOthers: boolean("can_cancel_others").notNull().default(false),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  group: userGroupEnum("group").notNull().default("public"),
  calendarColorSlot: integer("calendar_color_slot").unique(),
  isVip: boolean("is_vip").notNull().default(false),
  hasPassword: boolean("has_password").notNull().default(false),
  accountStatus: text("account_status", {
    enum: ["pending", "approved", "denied"],
  })
    .notNull()
    .default("approved"),
  declaredRelation: text("declared_relation", {
    enum: ["proprietaire", "ancien_proprietaire", "ami_famille", "location"],
  }),
  registrationRequestId: uuid("registration_request_id").unique(),
  bookingAccess: text("booking_access", { enum: bookingAccessStates })
    .notNull()
    .default("none"),
  bookingAccessRequestId: uuid("booking_access_request_id"),
  bookingAccessRequestedAt: timestamp("booking_access_requested_at", {
    withTimezone: true,
  }),
  isDisabled: boolean("is_disabled").notNull().default(false),
  isReservationAdmin: boolean("is_reservation_admin").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  calendarColorSlot: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
