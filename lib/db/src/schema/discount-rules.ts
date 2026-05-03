import { pgTable, uuid, integer, boolean, timestamp, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { seasonNameEnum, userGroupEnum } from "./enums";
import { propertiesTable } from "./properties";

export const discountRulesTable = pgTable(
  "discount_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => propertiesTable.id, { onDelete: "cascade" }),
    seasonName: seasonNameEnum("season_name").notNull(),
    applicableGroup: userGroupEnum("applicable_group").notNull(),
    requiresVip: boolean("requires_vip").notNull().default(false),
    discountPercentage: integer("discount_percentage").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("discount_rules_property_idx").on(t.propertyId),
    unique("discount_rules_unique").on(
      t.propertyId,
      t.seasonName,
      t.applicableGroup,
      t.requiresVip,
    ),
  ],
);

export const insertDiscountRuleSchema = createInsertSchema(discountRulesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertDiscountRule = z.infer<typeof insertDiscountRuleSchema>;
export type DiscountRule = typeof discountRulesTable.$inferSelect;
