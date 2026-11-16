import { Router, type IRouter } from "express";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, reservationsTable as stays, usersTable } from "../../../../lib/db/src/index.js";
import { GetPublicCalendarParams } from "../../../../lib/api-zod/src/index.js";
import { toIsoDate } from "../lib/dates.js";

const router: IRouter = Router();

router.get("/calendar/:propertyId", async (req, res) => {
  const params = GetPublicCalendarParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Chalet invalide." }); return; }
  const rows = await db.select({
    propertyId: stays.propertyId, startDate: stays.startDate, endDate: stays.endDate,
    status: stays.status, ...(req.user?.group === "proprietaire" ? {
      ownerName: usersTable.name, bookerGroup: usersTable.group, color: usersTable.calendarColorSlot,
    } : {}),
  }).from(stays).innerJoin(usersTable, eq(stays.userId, usersTable.id))
    .where(and(eq(stays.propertyId, params.data.propertyId),
      inArray(stays.status, ["pending_payment", "pending_approval", "confirmed"])))
    .orderBy(asc(stays.startDate));
  res.json(rows.map(({ propertyId, startDate, endDate, ownerName, bookerGroup, color, status }) => ({
    propertyId, startDate: toIsoDate(startDate), endDate: toIsoDate(endDate),
    status: status === "confirmed" ? "confirmed" : "held",
    ...(ownerName ? { ownerName } : {}),
    ...(bookerGroup === "proprietaire" && color ? { ownerColorSlot: color } : {}),
  })));
});
export default router;
