import { Request, Response } from "express";
import { Event } from "../models/Event";
import { Booking } from "../models/Booking";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { sendSuccess } from "../utils/response";

const describe = (b: any) => ({
  bookingId: b._id,
  name: b.user?.name ?? "",
  email: b.user?.email ?? "",
  seats: b.seatDetails?.length
    ? b.seatDetails.map((d: { seatNumber: number; tier: string }) => `${d.seatNumber} (${d.tier})`)
    : b.seatNumbers.map(String),
  quantity: b.quantity,
  ticketCode: b.ticketCode,
  checkedInAt: b.checkedInAt ?? null,
});



export const checkIn = asyncHandler(async (req: Request, res: Response) => {
  const { eventId, ticketCode } = req.body as { eventId: string; ticketCode: string };

  const event = await Event.findById(eventId);
  if (!event) throw new AppError(404, "Event not found");
  if (event.organizer.toString() !== req.user!.id) throw new AppError(403, "You can only check in guests for your own events");


  
  const admitted = await Booking.findOneAndUpdate(
    { ticketCode, event: event._id, status: "confirmed", checkedInAt: null },
    { $set: { checkedInAt: new Date(), checkedInBy: req.user!.id } },
    { returnDocument: "after" }
  ).populate("user", "name email");

  if (admitted) {
    return sendSuccess(res, { status: "admitted", message: "Ticket is valid. Let them in.", ticket: describe(admitted) });
  }

  
  const booking = await Booking.findOne({ ticketCode }).populate("user", "name email").populate("event", "title");
  if (!booking) {
    return sendSuccess(res, { status: "not_found", message: "No ticket with this code exists." });
  }
  if ((booking.event as any)._id.toString() !== event._id.toString()) {
    return sendSuccess(res, {
      status: "wrong_event",
      message: `This ticket is for a different event: "${(booking.event as any).title}".`,
    });
  }
  if (booking.status === "cancelled") {
    return sendSuccess(res, { status: "cancelled", message: "This ticket was cancelled.", ticket: describe(booking) });
  }
  return sendSuccess(res, { status: "already_used", message: "This ticket has already been used.", ticket: describe(booking) });
});



export const undoCheckIn = asyncHandler(async (req: Request, res: Response) => {
  const booking = await Booking.findById(req.body.bookingId);
  if (!booking) throw new AppError(404, "Booking not found");

  const event = await Event.findById(booking.event);
  if (!event || event.organizer.toString() !== req.user!.id) {
    throw new AppError(403, "You can only manage your own events");
  }
  if (!booking.checkedInAt) throw new AppError(400, "This ticket is not checked in");

  await Booking.updateOne({ _id: booking._id }, { $unset: { checkedInAt: 1, checkedInBy: 1 } });
  sendSuccess(res, null, 200, "Check-in undone");
});


