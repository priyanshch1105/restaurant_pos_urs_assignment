import { Router } from "express";
import { authRequired, allowRoles } from "../auth";
import { asyncHandler } from "../middleware/async.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { settingsSchema } from "../validation";
import { getSettings, updateSettings } from "../controllers/settings.controller";

const router = Router();
router.use(authRequired, allowRoles("Admin"));
router.get("/", asyncHandler(getSettings));
router.patch("/", validateBody(settingsSchema), asyncHandler(updateSettings));
export default router;
