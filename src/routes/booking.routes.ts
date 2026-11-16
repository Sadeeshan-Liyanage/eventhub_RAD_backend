import { Router } from "express";
import { createBooking, myBookings, getBooking, cancelBooking } from "../controllers/booking.controller";
import { protect } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createBookingSchema } from "../validators/booking.validators";

const router = Router();

router.use(protect);
router.post("/", validate(createBookingSchema), createBooking);
router.get("/mine", myBookings);
router.get("/:id", getBooking);
router.patch("/:id/cancel", cancelBooking);

export default router;
