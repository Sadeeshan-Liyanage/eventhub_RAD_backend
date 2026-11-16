import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import authRoutes from "./routes/auth.routes";
import eventRoutes from "./routes/event.routes";
import bookingRoutes from "./routes/booking.routes";
import analyticsRoutes from "./routes/analytics.routes";
import { notFound, errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => {


      if (!origin || env.clientUrls.includes(origin)) return cb(null, true);
      cb(new Error("Not allowed by CORS"));
    },
  })
);
app.use(express.json({ limit: "1mb" }));
if (env.nodeEnv !== "test") app.use(morgan("dev"));

app.get("/", (_req, res) => {
  res.json({ success: true, message: "EventHub API is running" });
});
app.get("/api/health", (_req, res) => {
  res.json({ success: true, status: "ok", time: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/analytics", analyticsRoutes);


app.use(notFound);
app.use(errorHandler);

export default app;


