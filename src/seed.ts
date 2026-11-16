import mongoose from "mongoose";
import { connectDB } from "./config/db";
import { User } from "./models/User";
import { Event } from "./models/Event";
import { Booking } from "./models/Booking";

const daysFromNow = (d: number, hour = 18) => {
  const date = new Date();
  date.setDate(date.getDate() + d);
  date.setHours(hour, 0, 0, 0);
  return date;
};

const run = async () => {
  await connectDB();
  await Promise.all([User.deleteMany({}), Event.deleteMany({}), Booking.deleteMany({})]);

  const organizer = await User.create({
    name: "Nimali Perera",
    email: "organizer@eventhub.test",
    password: "password123",
    role: "organizer",
  });
  await User.create({ name: "Kasun Silva", email: "user@eventhub.test", password: "password123", role: "user" });

  await Event.create([
    {
      title: "React & TypeScript Workshop",
      description: "A hands-on full-day workshop covering React hooks, Redux Toolkit and strict TypeScript patterns.",
      category: "workshop",
      venue: "BMICH, Colombo 07",
      date: daysFromNow(10, 9),
      ticketTypes: [{ name: "Standard", price: 3500, seats: 30 }, { name: "Premium (front row + lunch)", price: 5500, seats: 10 }],
      imageUrl: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200",
      organizer: organizer._id,
    },
    {
      title: "Colombo Jazz Night",
      description: "An evening of live jazz with local and international artists under the open sky.",
      category: "concert",
      venue: "Galle Face Green",
      date: daysFromNow(20, 19),
      ticketTypes: [{ name: "VIP", price: 9000, seats: 20 }, { name: "Gold", price: 6500, seats: 40 }, { name: "General", price: 4000, seats: 60 }],
      imageUrl: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=1200",
      organizer: organizer._id,
    },
    {
      title: "Sri Lanka Dev Meetup #12",
      description: "Lightning talks, networking and pizza. Share what you are building with the community.",
      category: "meetup",
      venue: "Co-working Space, Rajagiriya",
      date: daysFromNow(5, 17),
      ticketTypes: [{ name: "Free entry", price: 0, seats: 60 }],
      imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200",
      organizer: organizer._id,
    },
    {
      title: "Cloud & DevOps Conference 2026",
      description: "Two tracks on cloud-native architecture, CI/CD and observability with industry speakers.",
      category: "conference",
      venue: "Shangri-La Hotel, Colombo",
      date: daysFromNow(35, 8),
      ticketTypes: [{ name: "Student", price: 6000, seats: 60 }, { name: "Standard", price: 12000, seats: 100 }, { name: "Corporate", price: 20000, seats: 40 }],
      imageUrl: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1200",
      organizer: organizer._id,
    },
  ]);

  console.log("Seeded. Organizer: organizer@eventhub.test / password123  |  User: user@eventhub.test / password123");
  await mongoose.disconnect();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});


