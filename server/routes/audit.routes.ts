import { Router } from "express";
import { authRequired, allowRoles } from "../auth";
import { asyncHandler } from "../middleware/async.middleware";
import { list } from "../controllers/audit.controller";

const router = Router();
router.get("/", authRequired, allowRoles("Admin"), asyncHandler(list));
export default router;
