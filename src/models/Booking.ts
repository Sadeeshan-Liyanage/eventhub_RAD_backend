import { Schema, model, Types } from "mongoose";

export interface ISeatDetail {
  seatNumber: number;
  tier: string;
  price: number;
}

export interface IBooking {
  user: Types.ObjectId;
  event: Types.ObjectId;
  seatNumbers: number[];
  seatDetails: ISeatDetail[];
  quantity: number;
  totalAmount: number;
  status: "confirmed" | "cancelled";
  ticketCode: string;
  paymentRef: string;
  cardLast4: string;
  checkedInAt?: Date;
  checkedInBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const seatDetailSchema = new Schema<ISeatDetail>(
  {
    seatNumber: { type: Number, required: true },
    tier: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const bookingSchema = new Schema<IBooking>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    event: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    seatNumbers: { type: [Number], required: true },
    seatDetails: { type: [seatDetailSchema], default: [] },
    quantity: { type: Number, required: true, min: 1 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["confirmed", "cancelled"], default: "confirmed" },
    ticketCode: { type: String, required: true, unique: true },
    paymentRef: { type: String, required: true },
    cardLast4: { type: String, default: "" },
    
    checkedInAt: { type: Date },
    checkedInBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

bookingSchema.index({ event: 1, status: 1, createdAt: -1 });

export const Booking = model<IBooking>("Booking", bookingSchema);
