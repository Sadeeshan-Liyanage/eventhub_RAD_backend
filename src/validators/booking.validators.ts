import { z } from "zod";

export const createBookingSchema = z.object({
  eventId: z.string().length(24, "Invalid event id"),
  seatNumbers: z
    .array(z.coerce.number().int().min(1))
    .min(1, "Select at least one seat")
    .max(8, "You can book up to 8 seats at a time"),

    payment: z
    .object({
    cardHolder: z.string().trim().min(2, "Card holder name is required"),
    cardNumber: z
      .string()
      .transform((v) => v.replace(/\s+/g, ""))
      .pipe(z.string().regex(/^\d{16}$/, "Card number must be 16 digits")),
    expiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Expiry must be MM/YY"),
    cvv: z.string().regex(/^\d{3,4}$/, "CVV must be 3 or 4 digits"),
  })
    .optional(),
});
