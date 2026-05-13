import { Router } from "express";
import { register, login, refresh, forgotPassword, resetPassword } from "../controllers/auth.controller";
import { googleAuthRedirect, googleAuthCallback } from "../controllers/google.controller";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/google", googleAuthRedirect);
router.get("/google/callback", googleAuthCallback);

export default router;
