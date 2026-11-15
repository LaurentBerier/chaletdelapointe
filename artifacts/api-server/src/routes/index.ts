import { Router, type IRouter } from "express";
import reviewsRouter from "./reviews.js";
import healthRouter from "./health.js";
import propertiesRouter from "./properties.js";
import reservationsRouter from "./reservations.js";
import calendarRouter from "./calendar.js";
import adminRouter from "./admin.js";
import { loadUser } from "../middlewares/auth.js";
import { requireDatabase } from "../middlewares/database.js";

const router: IRouter = Router();

router.use(healthRouter);
router.get("/auth/config", (_req, res) => {
  const { SUPABASE_URL: url, SUPABASE_PUBLISHABLE_KEY: key } = process.env;
  if (!url || !key) { res.status(503).json({ error: "Connexion indisponible." }); return; }
  res.json({ url, key });
});
router.use(requireDatabase);
router.use(loadUser);
router.use(reviewsRouter);
router.use(propertiesRouter);
router.use(reservationsRouter);
router.use(calendarRouter);
router.use(adminRouter);

export default router;
