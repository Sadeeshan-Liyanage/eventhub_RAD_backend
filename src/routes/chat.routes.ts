import { Router } from "express";
import rateLimit from "express-rate-limit";
import { chat } from "../controllers/chat.controller";
import { optionalAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { chatSchema } from "../validators/chat.validators";

const router = Router();

// every message costs an AI call, so keep it limited per visitor
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "You're sending messages too fast. Please wait a moment." },
});

router.post("/", chatLimiter, optionalAuth, validate(chatSchema), chat);

export default router;
