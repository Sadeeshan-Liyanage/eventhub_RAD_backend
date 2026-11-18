import { Request, Response } from "express";
import crypto from "crypto";
import { Event } from "../models/Event";
import { Booking } from "../models/Booking";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { sendSuccess } from "../utils/response";
import { getTiers, tierForSeat } from "../utils/tiers";
import { notifyBookingCancelled, notifyBookingConfirmed, notifyEventSoldOut } from "../services/notifications";

export const createBooking = asyncHandler(async (req: Request, res: Response) => {
  const { eventId, seatNumbers, payment } = req.body as {
    eventId: string;
    seatNumbers: number[];
    payment?: { cardHolder: string; cardNumber: string; expiry: string; cvv: string };
  };

  const seats = [...new Set(seatNumbers)].sort((a, b) => a - b);
  if (seats.length !== seatNumbers.length) throw new AppError(400, "Duplicate seats selected");

  const event = await Event.findById(eventId);
  if (!event) throw new AppError(404, "Event not found");
  if (event.status !== "published") throw new AppError(400, "This event is no longer available");
  if (event.date.getTime() <= Date.now()) throw new AppError(400, "This event has already started");
  if (seats.some((s) => s > event.totalSeats)) throw new AppError(400, "One or more seats do not exist");

  // price every seat by the ticket type it belongs to
  const tiers = getTiers(event);
  const seatDetails = seats.map((seatNumber) => {
    const tier = tierForSeat(tiers, seatNumber)!;
    return { seatNumber, tier: tier.name, price: tier.price };
  });
  const totalAmount = seatDetails.reduce((sum, d) => sum + d.price, 0);

  // --- Mock payment gateway (no real card data is stored) ---
  // Free tickets (total 0) need no payment at all.
  let paymentRef: string;
  let cardLast4 = "";
  if (totalAmount > 0) {
    if (!payment) throw new AppError(400, "Payment details are required for paid tickets");
    if (payment.cardNumber.endsWith("0000")) {
      throw new AppError(402, "Payment declined. Try a different card.");
    }
    paymentRef = `PAY-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
    cardLast4 = payment.cardNumber.slice(-4);
  } else {
    paymentRef = `FREE-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
  }

  // Atomic reservation: succeeds only if NONE of the seats are already booked.
  // This prevents two users booking the same seat at the same time.
  const reserved = await Event.findOneAndUpdate(
    { _id: eventId, status: "published", bookedSeats: { $nin: seats } },
    { $push: { bookedSeats: { $each: seats } } },
    { returnDocument: "after" }
  );
  if (!reserved) throw new AppError(409, "Some of the selected seats were just taken. Please pick other seats.");

  let booking;
  try {
    booking = await Booking.create({
      user: req.user!.id,
      event: event._id,
      seatNumbers: seats,
      seatDetails,
      quantity: seats.length,
      totalAmount,
      ticketCode: `TKT-${crypto.randomBytes(5).toString("hex").toUpperCase()}`,
      paymentRef,
      cardLast4,
    });
  } catch (err) {
    // the booking could not be saved, so release the seats we reserved
    await Event.updateOne({ _id: eventId }, { $pullAll: { bookedSeats: seats } });
    throw err;
  }

  const populated = await booking.populate("event", "title date venue imageUrl category");
  sendSuccess(res, { booking: populated }, 201, "Booking confirmed");

  // emails go out in the background so the user is never kept waiting
  void notifyBookingConfirmed(booking._id);
  if (reserved.bookedSeats.length >= reserved.totalSeats) void notifyEventSoldOut(event._id);
});

export const myBookings = asyncHandler(async (req: Request, res: Response) => {
  const bookings = await Booking.find({ user: req.user!.id })
    .populate("event", "title date venue imageUrl category status")
    .sort({ createdAt: -1 });
  sendSuccess(res, { bookings });
});

export const getBooking = asyncHandler(async (req: Request, res: Response) => {
  const booking = await Booking.findById(req.params.id)
    .populate("event", "title date venue imageUrl category organizer")
    .populate("user", "name email");
  if (!booking) throw new AppError(404, "Booking not found");

  const ownerId = (booking.user as any)._id.toString();
  const organizerId = (booking.event as any).organizer.toString();
  if (ownerId !== req.user!.id && organizerId !== req.user!.id) {
    throw new AppError(403, "You cannot view this booking");
  }
  sendSuccess(res, { booking });
});

export const cancelBooking = asyncHandler(async (req: Request, res: Response) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new AppError(404, "Booking not found");
  if (booking.user.toString() !== req.user!.id) throw new AppError(403, "You can only cancel your own bookings");
  if (booking.status === "cancelled") throw new AppError(400, "Booking is already cancelled");

  const event = await Event.findById(booking.event);
  if (event && event.date.getTime() <= Date.now()) {
    throw new AppError(400, "Past events cannot be cancelled");
  }

  booking.status = "cancelled";
  await booking.save();
  await Event.updateOne({ _id: booking.event }, { $pullAll: { bookedSeats: booking.seatNumbers } });
  sendSuccess(res, { booking }, 200, "Booking cancelled");
  void notifyBookingCancelled(booking._id);
});
