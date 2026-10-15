import { Router } from "express";
import { authRequired } from "../auth";
import { dailySales } from "../controllers/report.controller";
import { asyncHandler } from "../middleware/async.middleware";
const router = Router();
router.get("/daily-sales", authRequired, asyncHandler(dailySales));
export default router;
