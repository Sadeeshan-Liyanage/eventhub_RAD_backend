import { z } from "zod";

export const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1, "Message cannot be empty").max(500, "Message is too long (max 500 characters)"),
      })
    )
    .min(1)
    .max(12, "Conversation is too long"),
});
