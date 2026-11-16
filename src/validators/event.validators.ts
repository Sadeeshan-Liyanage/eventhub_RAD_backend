import { z } from "zod";
import { EVENT_CATEGORIES } from "../models/Event";

const ticketTypeSchema = z.object({
  name: z.string().trim().min(1, "Ticket type name is required").max(40),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  seats: z.coerce.number().int("Seats must be a whole number").min(1, "Each ticket type needs at least 1 seat").max(1000),
});

const ticketTypes = z
  .array(ticketTypeSchema)
  .min(1, "Add at least one ticket type")
  .max(5, "You can add up to 5 ticket types")
  .refine((t) => new Set(t.map((x) => x.name.toLowerCase())).size === t.length, {
    message: "Ticket type names must be different",
  })
  .refine((t) => t.reduce((sum, x) => sum + x.seats, 0) <= 1000, {
    message: "Total seats cannot exceed 1000",
  });

const base = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(120),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(4000),
  category: z.enum(EVENT_CATEGORIES),
  venue: z.string().trim().min(2, "Venue is required"),
  date: z.coerce.date(),
  ticketTypes,
  imageUrl: z
    .string()
    .trim()
    .refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//i.test(v), {
      message: "Image must be a web link (https://…) or a path like /images/photo.jpg",
    })
    .optional(),
});

export const createEventSchema = base.refine((d) => d.date.getTime() > Date.now(), {
  message: "Event date must be in the future",
  path: ["date"],
});

export const updateEventSchema = base.partial();



