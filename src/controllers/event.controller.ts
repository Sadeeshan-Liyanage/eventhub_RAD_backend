import { Request, Response } from "express";
import { QueryFilter } from "mongoose";
import { Event, IEvent } from "../models/Event";
import { Booking } from "../models/Booking";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { sendSuccess } from "../utils/response";
import { getTiers, sameTiers } from "../utils/tiers";
import { ListEventsQuery } from "../validators/event.validators";

export const listEvents = asyncHandler(async (_req: Request, res: Response) => {
  // already validated and converted by validateQuery
  const { q, category, minPrice, maxPrice, from, to, sort, includePast, page, limit } = res.locals.query as ListEventsQuery;

  const filter: QueryFilter<IEvent> = { status: "published" };
  if (includePast !== "true") filter.date = { $gte: new Date() };
  if (q) filter.$text = { $search: q };
  if (category && category !== "all") filter.category = category;
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }
  if (from) filter.date = { ...(filter.date as object), $gte: from };
  if (to) filter.date = { ...(filter.date as object), $lte: to };

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    date: { date: 1 },
    "price-asc": { price: 1 },
    "price-desc": { price: -1 },
    newest: { createdAt: -1 },
  };

  const [events, total] = await Promise.all([
    Event.find(filter)
      .populate("organizer", "name")
      .sort(sortMap[sort] || sortMap.date)
      .skip((page - 1) * limit)
      .limit(limit),
    Event.countDocuments(filter),
  ]);

  sendSuccess(res, { events, page, pages: Math.ceil(total / limit), total });
});

export const getEvent = asyncHandler(async (req: Request, res: Response) => {
  const event = await Event.findById(req.params.id).populate("organizer", "name email");
  if (!event) throw new AppError(404, "Event not found");
  sendSuccess(res, { event });
});

export const myEvents = asyncHandler(async (req: Request, res: Response) => {
  const events = await Event.find({ organizer: req.user!.id }).sort({ date: -1 });
  sendSuccess(res, { events });
});

export const createEvent = asyncHandler(async (req: Request, res: Response) => {
  const event = await Event.create({ ...req.body, organizer: req.user!.id });
  sendSuccess(res, { event }, 201, "Event created");
});

const findOwnedEvent = async (id: string, userId: string) => {
  const event = await Event.findById(id);
  if (!event) throw new AppError(404, "Event not found");
  if (event.organizer.toString() !== userId) throw new AppError(403, "You can only manage your own events");
  return event;
};

export const updateEvent = asyncHandler(async (req: Request, res: Response) => {
  const event = await findOwnedEvent(req.params.id as string, req.user!.id);

  if (req.body.ticketTypes !== undefined) {
    if (sameTiers(getTiers(event), req.body.ticketTypes)) {
      delete req.body.ticketTypes; // nothing changed
    } else if (event.bookedSeats.length > 0) {
      throw new AppError(409, "Ticket types and prices cannot change after tickets have been sold");
    }
  }

  event.set(req.body);
  await event.save();
  sendSuccess(res, { event }, 200, "Event updated");
});

export const cancelEvent = asyncHandler(async (req: Request, res: Response) => {
  const event = await findOwnedEvent(req.params.id as string, req.user!.id);
  event.status = "cancelled";
  await event.save();
  await Booking.updateMany({ event: event._id, status: "confirmed" }, { status: "cancelled" });
  sendSuccess(res, { event }, 200, "Event cancelled and bookings marked as cancelled");
});

export const deleteEvent = asyncHandler(async (req: Request, res: Response) => {
  const event = await findOwnedEvent(req.params.id as string, req.user!.id);
  const sold = await Booking.countDocuments({ event: event._id, status: "confirmed" });
  if (sold > 0) throw new AppError(409, "This event has confirmed bookings. Cancel it instead of deleting.");
  await Booking.deleteMany({ event: event._id });
  await event.deleteOne();
  sendSuccess(res, null, 200, "Event deleted");
});
