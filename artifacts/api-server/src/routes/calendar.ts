import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "../../../../lib/db/src/index.js";
import { GetPublicCalendarParams, GetPublicCalendarResponse } from "../../../../lib/api-zod/src/index.js";
import { toIsoDate } from "../lib/dates.js";

const router: IRouter = Router();

router.get("/calendar/:propertyId", async (req, res): Promise<void> => {
  const params = GetPublicCalendarParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const result = await db.execute<{
    property_id: string;
    start_date: string | Date;
    end_date: string | Date;
  }>(
    sql`SELECT property_id, start_date, end_date FROM calendar_public WHERE property_id = ${params.data.propertyId} ORDER BY start_date`,
  );
  const rows = result.rows.map((r) => ({
    propertyId: r.property_id,
    startDate: toIsoDate(r.start_date),
    endDate: toIsoDate(r.end_date),
  }));
  res.json(GetPublicCalendarResponse.parse(rows));
});

export default router;
