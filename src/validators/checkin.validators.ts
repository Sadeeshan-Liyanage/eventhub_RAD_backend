import { z } from "zod";

export const checkInSchema = z.object({
  eventId: z.string().length(24, "Invalid event id"),

  
  ticketCode: z
    .string()
    .trim()
    .min(4, "Enter the ticket code")
    .max(40, "Ticket code is too long")
    .transform((v) => v.toUpperCase()),
});

export const undoCheckInSchema = z.object({
  bookingId: z.string().length(24, "Invalid booking id"),
});
