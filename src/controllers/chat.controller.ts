import { Request, Response } from "express";
import { env } from "../config/env";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { sendSuccess } from "../utils/response";
import { buildSystemPrompt } from "../services/chatContext";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const chat = asyncHandler(async (req: Request, res: Response) => {
  if (!env.geminiApiKey) {
    throw new AppError(503, "The assistant is not set up yet. Ask the site owner to add a GEMINI_API_KEY.");
  }

  let messages = req.body.messages as ChatMessage[];
  // Gemini needs the conversation to start with a user message
  while (messages.length && messages[0].role !== "user") messages = messages.slice(1);
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    throw new AppError(400, "The last message must come from the user");
  }

  const systemPrompt = await buildSystemPrompt(req.user?.id);

  let response: globalThis.Response;
  try {
    response = await fetch(`${env.geminiBaseUrl}/models/${env.geminiModel}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.geminiApiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
      }),
      signal: AbortSignal.timeout(25000),
    });
  } catch (err) {
    console.error("Gemini request failed:", err);
    throw new AppError(502, "The assistant could not be reached. Please try again.");
  }

  if (!response.ok) {
    const detail = await response.text();
    console.error(`Gemini error ${response.status} (model ${env.geminiModel}):`, detail.slice(0, 500));
    if (response.status === 429) throw new AppError(429, "The assistant is busy right now. Please try again in a minute.");
    if (response.status === 404) throw new AppError(502, "The assistant model is not available. The site owner should check GEMINI_MODEL.");
    throw new AppError(502, "The assistant had a problem. Please try again.");
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const reply = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();

  sendSuccess(res, { reply: reply || "Sorry, I couldn't come up with an answer. Could you rephrase your question?" });
});
