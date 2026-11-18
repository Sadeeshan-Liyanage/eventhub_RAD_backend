import { Router } from "express";
import {
  listEvents,
  getEvent,
  myEvents,
  createEvent,
  updateEvent,
  cancelEvent,
  deleteEvent,
} from "../controllers/event.controller";
import { protect, authorize } from "../middleware/auth";
import { validate, validateQuery } from "../middleware/validate";
import { createEventSchema, updateEventSchema, listEventsQuerySchema } from "../validators/event.validators";

const router = Router();

router.get("/", validateQuery(listEventsQuerySchema), listEvents);
router.get("/mine", protect, authorize("organizer"), myEvents); 

router.get("/:id", getEvent);

router.post("/", protect, authorize("organizer"), validate(createEventSchema), createEvent);
router.put("/:id", protect, authorize("organizer"), validate(updateEventSchema), updateEvent);
router.patch("/:id/cancel", protect, authorize("organizer"), cancelEvent);
router.delete("/:id", protect, authorize("organizer"), deleteEvent);

export default router;
