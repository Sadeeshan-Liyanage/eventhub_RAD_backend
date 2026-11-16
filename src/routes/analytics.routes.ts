import { Router } from "express";
import { overview, participants } from "../controllers/analytics.controller";
import { protect, authorize } from "../middleware/auth";

const router = Router();

router.use(protect, authorize("organizer"));
router.get("/overview", overview);
router.get("/events/:id/participants", participants);

export default router;

