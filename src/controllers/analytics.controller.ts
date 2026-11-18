import { Request, Response } from "express";
import { Types } from "mongoose";
import { Event } from "../models/Event";
import { Booking } from "../models/Booking";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { sendSuccess } from "../utils/response";
import { getTiers } from "../utils/tiers";



export const overview = asyncHandler(async (req: Request, res: Response) => {
  const events = await Event.find({ organizer: req.user!.id });
  const eventIds = events.map((e) => e._id as Types.ObjectId);

  const bookings = await Booking.find({ event: { $in: eventIds }, status: "confirmed" })
    .select("event user createdAt totalAmount quantity")
    .lean();


    
  let revenue = 0;
  let ticketsSold = 0;
  const participants = new Set<string>();
  const perEventStats = new Map<string, { revenue: number; bookings: number }>();
  for (const b of bookings) {
    revenue += b.totalAmount;
    ticketsSold += b.quantity;
    participants.add(b.user.toString());
    const key = b.event.toString();
    const row = perEventStats.get(key) ?? { revenue: 0, bookings: 0 };
    row.revenue += b.totalAmount;
    row.bookings += 1;
    perEventStats.set(key, row);
  }

  

  const perEvent = events.map((e) => {
    const stats = perEventStats.get(e._id.toString());
    const sold = e.bookedSeats.length;
    let start = 0;
    const tiers = getTiers(e).map((t) => {
      const from = start + 1;
      const to = start + t.seats;
      start = to;
      const tierSold = e.bookedSeats.filter((n) => n >= from && n <= to).length;
      return { name: t.name, price: t.price, seats: t.seats, sold: tierSold, revenue: tierSold * t.price };
    });
    return {
      tiers,
      eventId: e._id,
      title: e.title,
      date: e.date,
      status: e.status,
      price: e.price,
      capacity: e.totalSeats,
      ticketsSold: sold,
      revenue: stats?.revenue || 0,
      bookings: stats?.bookings || 0,
      occupancy: Math.round((sold / e.totalSeats) * 100),
    };
  });

  

  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);

  const dailyMap = new Map<string, { revenue: number; tickets: number }>();
  for (const b of bookings) {
    if (new Date(b.createdAt) < since) continue;
    const key = new Date(b.createdAt).toISOString().slice(0, 10);
    const row = dailyMap.get(key) ?? { revenue: 0, tickets: 0 };
    row.revenue += b.totalAmount;
    row.tickets += b.quantity;
    dailyMap.set(key, row);
  }
  const daily: { date: string; revenue: number; tickets: number }[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const row = dailyMap.get(key);
    daily.push({ date: key, revenue: row?.revenue || 0, tickets: row?.tickets || 0 });
  }

  const totalCapacity = events.reduce((sum, e) => sum + e.totalSeats, 0);
  const totalSold = events.reduce((sum, e) => sum + e.bookedSeats.length, 0);

  sendSuccess(res, {
    totals: {
      revenue,
      ticketsSold,
      bookings: bookings.length,
      uniqueParticipants: participants.size,
      events: events.length,
      averageOccupancy: totalCapacity ? Math.round((totalSold / totalCapacity) * 100) : 0,
    },
    perEvent,
    daily,
  });
});



export const participants = asyncHandler(async (req: Request, res: Response) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new AppError(404, "Event not found");
  if (event.organizer.toString() !== req.user!.id) throw new AppError(403, "You can only view your own events");

  const bookings = await Booking.find({ event: event._id, status: "confirmed" })
    .populate("user", "name email")
    .sort({ createdAt: -1 });

  sendSuccess(res, {
    event: {
      id: event._id,
      title: event.title,
      date: event.date,
      capacity: event.totalSeats,
      sold: event.bookedSeats.length,
     
      
      checkedIn: bookings.filter((b) => b.checkedInAt).reduce((sum, b) => sum + b.quantity, 0),
    },
    participants: bookings.map((b) => ({
      bookingId: b._id,
      name: (b.user as any).name,
      email: (b.user as any).email,
      seats: b.seatNumbers,
      seatLabels: b.seatDetails.length
        ? b.seatDetails.map((d) => `${d.seatNumber} (${d.tier})`)
        : b.seatNumbers.map(String),
      amount: b.totalAmount,
      ticketCode: b.ticketCode,
      quantity: b.quantity,
      checkedInAt: b.checkedInAt ?? null,
      bookedAt: b.createdAt,
    })),
  });
});

