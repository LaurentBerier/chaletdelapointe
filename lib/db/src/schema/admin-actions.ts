import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { adminActionTypeEnum } from "./enums.js";
import { usersTable } from "./users.js";
import { reservationsTable } from "./reservations.js";

export const adminActionsTable = pgTable(
  "admin_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adminUserId: uuid("admin_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),
    actionType: adminActionTypeEnum("action_type").notNull(),
    reservationId: uuid("reservation_id").references(() => reservationsTable.id, {
      onDelete: "set null",
    }),
    reason: text("reason"),
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("admin_actions_admin_idx").on(t.adminUserId),
    index("admin_actions_reservation_idx").on(t.reservationId),
  ],
);

export const insertAdminActionSchema = createInsertSchema(adminActionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAdminAction = z.infer<typeof insertAdminActionSchema>;
export type AdminAction = typeof adminActionsTable.$inferSelect;
