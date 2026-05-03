import { db, adminActionsTable } from "../../../../lib/db/src/index.js";

export async function logAdminAction(args: {
  adminUserId: string;
  actionType: "confirm" | "cancel" | "modify" | "override" | "create";
  reservationId?: string | null;
  reason?: string | null;
  details?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(adminActionsTable).values({
    adminUserId: args.adminUserId,
    actionType: args.actionType,
    reservationId: args.reservationId ?? null,
    reason: args.reason ?? null,
    details: args.details ?? {},
  });
}
