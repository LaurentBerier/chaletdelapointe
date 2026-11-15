import { bookingAccessStates } from "../booking-access.js";
import { pgTable, text, uuid, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { userGroupEnum } from "./enums.js";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  authUserId: uuid("auth_user_id").unique(),
  canApprove: boolean("can_approve").notNull().default(false),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  group: userGroupEnum("group").notNull().default("public"),
  isVip: boolean("is_vip").notNull().default(false),
  hasPassword: boolean("has_password").notNull().default(false),
  bookingAccess: text("booking_access", { enum: bookingAccessStates }).notNull().default("none"),
  bookingAccessRequestedAt: timestamp("booking_access_requested_at", { withTimezone: true }),
  isDisabled: boolean("is_disabled").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
