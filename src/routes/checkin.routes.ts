import { Router } from "express";
import { checkIn, undoCheckIn } from "../controllers/checkin.controller";
import { protect, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { checkInSchema, undoCheckInSchema } from "../validators/checkin.validators";

const router = Router();

router.use(protect, authorize("organizer"));
router.post("/", validate(checkInSchema), checkIn);
router.post("/undo", validate(undoCheckInSchema), undoCheckIn);

export default router;
