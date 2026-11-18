import { Schema, model, Types } from "mongoose";

export const EVENT_CATEGORIES = ["workshop", "concert", "meetup", "conference", "other"] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export interface ITicketType {
  name: string;
  price: number;
  seats: number;
}

export interface IEvent {
  title: string;
  description: string;
  category: EventCategory;
  venue: string;
  date: Date;
  price: number; // lowest ticket price (derived from ticketTypes)
  totalSeats: number; // sum of all ticket type seats (derived)
  ticketTypes: ITicketType[];
  bookedSeats: number[];
  imageUrl?: string;
  organizer: Types.ObjectId;
  status: "published" | "cancelled";
  reminderSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ticketTypeSchema = new Schema<ITicketType>(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    price: { type: Number, required: true, min: 0 },
    seats: { type: Number, required: true, min: 1, max: 1000 },
  },
  { _id: false }
);

const eventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 4000 },
    category: { type: String, enum: EVENT_CATEGORIES, required: true },
    venue: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    price: { type: Number, required: true, min: 0 },
    totalSeats: { type: Number, required: true, min: 1, max: 1000 },
    ticketTypes: { type: [ticketTypeSchema], default: [] },
    bookedSeats: { type: [Number], default: [] },
    imageUrl: { type: String, trim: true },
    organizer: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: ["published", "cancelled"], default: "published" },
    reminderSentAt: { type: Date },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// keep price/totalSeats in sync with the ticket types
eventSchema.pre("validate", function () {
  if (this.ticketTypes && this.ticketTypes.length > 0) {
    this.totalSeats = this.ticketTypes.reduce((sum, t) => sum + t.seats, 0);
    this.price = Math.min(...this.ticketTypes.map((t) => t.price));
  }
});

eventSchema.virtual("availableSeats").get(function () {
  // populated events may only contain a few fields (e.g. in bookings), so guard against missing ones
  if (this.totalSeats == null || !this.bookedSeats) return undefined;
  return this.totalSeats - this.bookedSeats.length;
});

eventSchema.index({ title: "text", description: "text", venue: "text" });
eventSchema.index({ date: 1, category: 1 });

export const Event = model<IEvent>("Event", eventSchema);
