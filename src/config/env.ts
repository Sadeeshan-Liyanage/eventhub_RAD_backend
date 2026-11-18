import dotenv from "dotenv";
dotenv.config();

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
};

export const env = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: required("MONGO_URI"),
  jwtSecret: required("JWT_SECRET"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  // chatbot (Google Gemini). The key stays on the server and is never sent to the browser.
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
  geminiBaseUrl: process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta",
  // email notifications (any SMTP server). If SMTP_HOST is empty, emails are skipped and only logged.
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  emailFrom: process.env.EMAIL_FROM || "EventHub <no-reply@eventhub.local>",
  remindersEnabled: process.env.REMINDERS_ENABLED !== "false",
  // comma separated list of allowed origins
  clientUrls: (process.env.CLIENT_URL || "http://localhost:5173").split(",").map((s) => s.trim()),
  // base address used for links inside emails (your deployed frontend)
  appUrl: (process.env.APP_URL || (process.env.CLIENT_URL || "http://localhost:5173").split(",")[0]).trim().replace(/\/$/, ""),
};
