import { pgTable, uuid, date, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { seasonNameEnum } from "./enums";
import { propertiesTable } from "./properties";

export const pricingSeasonsTable = pgTable(
  "pricing_seasons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => propertiesTable.id, { onDelete: "cascade" }),
    seasonName: seasonNameEnum("season_name").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    basePricePerNight: integer("base_price_per_night").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("pricing_seasons_property_idx").on(t.propertyId),
    index("pricing_seasons_dates_idx").on(t.propertyId, t.startDate, t.endDate),
  ],
);

export const insertPricingSeasonSchema = createInsertSchema(pricingSeasonsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertPricingSeason = z.infer<typeof insertPricingSeasonSchema>;
export type PricingSeason = typeof pricingSeasonsTable.$inferSelect;
