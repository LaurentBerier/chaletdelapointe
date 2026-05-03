import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import propertiesRouter from "./properties.js";
import reservationsRouter from "./reservations.js";
import calendarRouter from "./calendar.js";
import adminRouter from "./admin.js";
import { loadUser } from "../middlewares/auth.js";
import { requireDatabase } from "../middlewares/database.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(requireDatabase);
router.use(loadUser);
router.use(propertiesRouter);
router.use(reservationsRouter);
router.use(calendarRouter);
router.use(adminRouter);

export default router;
