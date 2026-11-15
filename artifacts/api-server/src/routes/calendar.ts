import { Router, type IRouter } from "express";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, reservationsTable as stays, usersTable } from "../../../../lib/db/src/index.js";
import { GetPublicCalendarParams } from "../../../../lib/api-zod/src/index.js";

const router: IRouter = Router();

router.get("/calendar/:propertyId", async (req, res) => {
  const params = GetPublicCalendarParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Chalet invalide." }); return; }
  const rows = await db.select({
    propertyId: stays.propertyId, startDate: stays.startDate, endDate: stays.endDate,
    status: stays.status, ...(req.user?.group === "proprietaire" ? { ownerName: usersTable.name } : {}),
  }).from(stays).innerJoin(usersTable, eq(stays.userId, usersTable.id))
    .where(and(eq(stays.propertyId, params.data.propertyId),
      inArray(stays.status, ["pending_payment", "pending_approval", "confirmed"])))
    .orderBy(asc(stays.startDate));
  res.json(rows.map(({ ownerName, status, ...dates }) => ({
    ...dates, status: status === "confirmed" ? "confirmed" : "held",
    ...(status === "confirmed" && ownerName ? { ownerName } : {}),
  })));
});
export default router;
