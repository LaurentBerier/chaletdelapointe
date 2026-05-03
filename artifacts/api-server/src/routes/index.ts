import { Router, type IRouter } from "express";
import healthRouter from "./health";
import propertiesRouter from "./properties";
import reservationsRouter from "./reservations";
import calendarRouter from "./calendar";
import adminRouter from "./admin";
import { loadUser } from "../middlewares/auth";
import { requireDatabase } from "../middlewares/database";

const router: IRouter = Router();

router.use(healthRouter);
router.use(requireDatabase);
router.use(loadUser);
router.use(propertiesRouter);
router.use(reservationsRouter);
router.use(calendarRouter);
router.use(adminRouter);

export default router;
