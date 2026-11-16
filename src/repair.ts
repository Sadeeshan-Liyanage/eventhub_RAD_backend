

import mongoose from "mongoose";
import { connectDB } from "./config/db";
import { Booking } from "./models/Booking";
import { Event } from "./models/Event";

const run = async () => {
  await connectDB();
  const bookings = await Booking.find({ status: "confirmed" });
  let fixed = 0;
  for (const b of bookings) {
    const res = await Event.updateOne(
      { _id: b.event, bookedSeats: { $not: { $all: b.seatNumbers } } },
      { $addToSet: { bookedSeats: { $each: b.seatNumbers } } }
    );
    if (res.modifiedCount > 0) fixed++;
  }
  console.log(`Checked ${bookings.length} confirmed bookings, repaired ${fixed}.`);
  await mongoose.disconnect();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

