import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import categoriesRouter from "./categories";
import mentorsRouter from "./mentors";
import packagesRouter from "./packages";
import bookingsRouter from "./bookings";
import paymentsRouter from "./payments";
import reviewsRouter from "./reviews";
import dashboardRouter from "./dashboard";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/users", usersRouter);
router.use("/categories", categoriesRouter);
router.use("/mentors", mentorsRouter);
router.use("/packages", packagesRouter);
router.use("/bookings", bookingsRouter);
router.use("/payments", paymentsRouter);
router.use("/reviews", reviewsRouter);

// Mount at /mentors so /:mentorId/packages and /:mentorId/reviews resolve correctly
router.use("/mentors", packagesRouter);
router.use("/mentors", reviewsRouter);

router.use("/dashboard", dashboardRouter);
router.use("/admin", adminRouter);

export default router;
