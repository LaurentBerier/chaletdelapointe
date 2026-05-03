import { pgEnum } from "drizzle-orm/pg-core";

export const userGroupEnum = pgEnum("user_group", [
  "proprietaire",
  "ancien_proprietaire",
  "famille",
  "ami",
  "public",
]);

export const seasonNameEnum = pgEnum("season_name", ["haute", "mi", "basse"]);

export const reservationStatusEnum = pgEnum("reservation_status", [
  "draft",
  "pending_payment",
  "confirmed",
  "cancelled",
  "expired",
]);

export const adminActionTypeEnum = pgEnum("admin_action_type", [
  "confirm",
  "cancel",
  "modify",
  "override",
  "create",
]);
