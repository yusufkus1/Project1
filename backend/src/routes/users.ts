import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { getMe, updateMe, changePassword, getStats } from "../controllers/user.controller";

const router = Router();

router.use(authenticate);
router.get("/me", getMe);
router.patch("/me", updateMe);
router.patch("/me/password", changePassword);
router.get("/me/stats", getStats);

export default router;
