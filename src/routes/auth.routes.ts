import { Router } from "express";
import rateLimit from "express-rate-limit";
import { register, login, refresh, logout, me } from "../controllers/auth.controller";
import { protect } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { registerSchema, loginSchema, refreshSchema } from "../validators/auth.validators";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Try again in a few minutes." },
});

router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/refresh", validate(refreshSchema), refresh);
router.post("/logout", protect, logout);
router.get("/me", protect, me);

export default router;
