import { Types } from "mongoose";
import { env } from "../config/env";
import { Booking } from "../models/Booking";
import { Event } from "../models/Event";
import "../models/User"; 

import { sendEmail } from "./email.service";
import { TicketInfo, bookingCancelledMail, bookingConfirmedMail, eventCancelledMail, reminderMail, soldOutMail } from "./emailTemplates";


const safe = async (label: string, fn: () => Promise<void>) => {
  try {
    await fn();
  } catch (err) {
    console.error(`Email "${label}" failed:`, err instanceof Error ? err.message : err);
  }
};



const loadTicket = async (bookingId: Types.ObjectId | string): Promise<{ to: string; info: TicketInfo } | null> => {
  const b = await Booking.findById(bookingId).populate("user", "name email").populate("event", "title date venue");
  const user = b?.user as unknown as { name: string; email: string } | undefined;
  const event = b?.event as unknown as { title: string; date: Date; venue: string } | undefined;
  if (!b || !user?.email || !event) return null;
  return {
    to: user.email,
    info: {
      name: user.name,
      eventTitle: event.title,
      eventDate: event.date,
      venue: event.venue,
      seats: b.seatDetails.length ? b.seatDetails.map((d) => `${d.seatNumber} (${d.tier})`) : b.seatNumbers.map(String),
      total: b.totalAmount,
      ticketCode: b.ticketCode,
      ticketUrl: `${env.appUrl}/tickets/${b._id}`,
      bookingId: b._id.toString(),
    },
  };
};

export const notifyBookingConfirmed = (bookingId: Types.ObjectId | string) =>
  safe("booking confirmed", async () => {
    const t = await loadTicket(bookingId);
    if (t) await sendEmail(await bookingConfirmedMail(t.to, t.info));
  });

export const notifyBookingCancelled = (bookingId: Types.ObjectId | string) =>
  safe("booking cancelled", async () => {
    const t = await loadTicket(bookingId);
    if (t) await sendEmail(bookingCancelledMail(t.to, t.info));
  });



  export const notifyEventCancelled = (bookingIds: (Types.ObjectId | string)[]) =>
  safe("event cancelled", async () => {
    for (const id of bookingIds) {
      await safe("event cancelled (one guest)", async () => {
        const t = await loadTicket(id);
        if (t) await sendEmail(eventCancelledMail(t.to, t.info));
      });
    }
  });

export const notifyEventSoldOut = (eventId: Types.ObjectId | string) =>
  safe("sold out", async () => {
    const event = await Event.findById(eventId).populate("organizer", "name email");
    const organizer = event?.organizer as unknown as { name: string; email: string } | undefined;
    if (event && organizer?.email) {
      await sendEmail(soldOutMail(organizer.email, organizer.name, event.title, event.date, `${env.appUrl}/dashboard`));
    }
  });


  

export const sendDueReminders = async (): Promise<number> => {
  const now = new Date();
  const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const due = await Event.find({ status: "published", reminderSentAt: null, date: { $gt: now, $lte: soon } }).select("_id");

  let sent = 0;
  for (const { _id } of due) {
    const claimed = await Event.findOneAndUpdate({ _id, reminderSentAt: null }, { $set: { reminderSentAt: now } });
    if (!claimed) continue;
    const bookings = await Booking.find({ event: _id, status: "confirmed" }).select("_id");
    for (const b of bookings) {
      await safe("reminder", async () => {
        const t = await loadTicket(b._id);
        if (t && (await sendEmail(reminderMail(t.to, t.info)))) sent++;
      });
    }
  }
  return sent;
};



export const startReminderJob = () => {
  if (!env.remindersEnabled) return;
  const run = () => sendDueReminders().then((n) => n && console.log(`Sent ${n} reminder email(s)`)).catch((e) => console.error("Reminder job failed:", e));
  setTimeout(run, 30 * 1000); 
  setInterval(run, 15 * 60 * 1000);
};


