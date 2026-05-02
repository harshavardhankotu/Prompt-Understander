import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import categoriesRouter from "./categories";
import usersRouter from "./users";
import requirementsRouter from "./requirements";
import bidsRouter from "./bids";
import reviewsRouter from "./reviews";
import notificationsRouter from "./notifications";
import subscriptionsRouter from "./subscriptions";
import dashboardRouter from "./dashboard";
import disputesRouter from "./disputes";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(categoriesRouter);
router.use(usersRouter);
router.use(requirementsRouter);
router.use(bidsRouter);
router.use(reviewsRouter);
router.use(notificationsRouter);
router.use(subscriptionsRouter);
router.use(dashboardRouter);
router.use(disputesRouter);

export default router;
