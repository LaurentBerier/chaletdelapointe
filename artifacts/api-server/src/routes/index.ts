import { deliverAccessEmails } from "../lib/access-email.js";
import { deliverBookingEmails } from "../lib/booking-email.js";
import management from "./management.js";
import community from "./community.js";
import blogComments from "./blog-comments.js";
import { Router, type IRouter } from "express";
import reviewsRouter from "./reviews.js";
import healthRouter from "./health.js";
import propertiesRouter from "./properties.js";
import reservationsRouter from "./reservations.js";
import calendarRouter from "./calendar.js";
import adminRouter from "./admin.js";
import { loadUser } from "../middlewares/auth.js";
import { requireDatabase } from "../middlewares/database.js";
import contactRouter from "./contact.js";

const router: IRouter = Router();

router.use(healthRouter);
// Contact remains available to visitors, without a database or an account.
router.use(contactRouter);
router.get("/auth/config", (_req, res) => {
  const { SUPABASE_URL: url, SUPABASE_PUBLISHABLE_KEY: key } = process.env;
  if (!url || !key) { res.status(503).json({ error: "Connexion indisponible." }); return; }
  res.json({ url, key });
});
router.use(requireDatabase);
router.get("/jobs/access-mail", async (req, res) => {
  res.set("Cache-Control", "private, no-store");
  if (!process.env.CRON_SECRET || req.get("Authorization") !== "Bearer " + process.env.CRON_SECRET) {
    res.sendStatus(401);
    return;
  }
  await Promise.all([deliverAccessEmails(), deliverBookingEmails()]);
  res.sendStatus(204);
});
router.use(loadUser);
router.use(community);
router.use(blogComments);
router.use(management);
router.use(reviewsRouter);
router.use(propertiesRouter);
router.use(reservationsRouter);
router.use(calendarRouter);
router.use(adminRouter);

export default router;
