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
import adminAuthRouter from "./admin-auth";
import adminRouter from "./admin";
import chatRouter from "./chat";
import disputesRouter from "./disputes";
import payoutsRouter from "./payouts";
import availabilityRouter from "./availability";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/users", usersRouter);
router.use("/categories", categoriesRouter);
router.use("/mentors", mentorsRouter);
router.use("/packages", packagesRouter);
router.use("/bookings", bookingsRouter);
router.use("/payments", paymentsRouter);
router.use("/reviews", reviewsRouter);

// Mount at /mentors so /:mentorId/packages, /:mentorId/reviews, /:mentorId/availability, /:mentorId/slots resolve correctly
router.use("/mentors", packagesRouter);
router.use("/mentors", reviewsRouter);
router.use("/mentors", availabilityRouter);

router.use("/dashboard", dashboardRouter);
router.use("/chat", chatRouter);
router.use("/disputes", disputesRouter);
router.use("/payouts", payoutsRouter);
router.use("/notifications", notificationsRouter);

// Admin auth (login/logout/me) — no session required
router.use("/admin", adminAuthRouter);

// Admin data routes — protected by session middleware inside adminRouter
router.use("/admin", adminRouter);

export default router;
