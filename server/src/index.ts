import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import pino from "pino";
import { env } from "./config";
import { requestIdMiddleware } from "./middleware/requestId";
import { apiRateLimiter } from "./middleware/rateLimit";
import { errorHandler } from "./middleware/errorHandler";
import { RetentionCleanupJob } from "./jobs/retentionCleanup";

// Routers
import { authRouter } from "./routes/authRoutes";
import { scanRouter } from "./routes/scanRoutes";
import { gatewayRouter } from "./routes/gatewayRoutes";
import { phishingRouter } from "./routes/phishingRoutes";
import { fraudRouter } from "./routes/fraudRoutes";
import { incidentRouter } from "./routes/incidentRoutes";
import { reportRouter } from "./routes/reportRoutes";
import { policyRouter } from "./routes/policyRoutes";
import { memberRouter } from "./routes/memberRoutes";
import { auditRouter } from "./routes/auditRoutes";
import { dashboardRouter } from "./routes/dashboardRoutes";

// Seed runner
import { seedDatabase } from "./db/seed";

const logger = pino({ name: "trustshield-server" });
export const app = express();

// Trust reverse proxy (Render / Cloudflare)
app.set("trust proxy", 1);

// Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", env.CORS_ORIGIN, "https://*.supabase.co", "https://generativelanguage.googleapis.com"]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// CORS configuration supporting credentials for cross-site cookie rotation
const allowedOrigins = [
  env.CORS_ORIGIN,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173"
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || origin.endsWith(".vercel.app") || origin.endsWith(".onrender.com")) {
        return callback(null, true);
      }
      return callback(new Error("CORS policy violation: origin not allowed"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"]
  })
);

app.use(cookieParser());
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(requestIdMiddleware);

// Health Check Endpoint (Render & Monitoring)
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "TrustShield AI Command Center API",
    version: "1.0.0",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Apply Global Rate Limiting
app.use("/api", apiRateLimiter);

// Mount Feature Routers
app.use("/api/auth", authRouter);
app.use("/api", scanRouter);
app.use("/api", gatewayRouter);
app.use("/api", phishingRouter);
app.use("/api", fraudRouter);
app.use("/api", incidentRouter);
app.use("/api", reportRouter);
app.use("/api", policyRouter);
app.use("/api", memberRouter);
app.use("/api", auditRouter);
app.use("/api", dashboardRouter);

// 404 handler for unmatched routes
app.use("*", (req, res) => {
  res.status(404).json({
    error: {
      code: "ROUTE_NOT_FOUND",
      message: `The endpoint '${req.originalUrl}' does not exist on this server.`
    }
  });
});

// Centralized Error Handler
app.use(errorHandler);

// Start server if not running inside test runner
if (process.env.NODE_ENV !== "test") {
  // Run seed script to ensure sample organizations and default policies exist
  seedDatabase().catch((err) => {
    logger.warn({ err: err.message }, "Notice: Initial seed had warnings, proceeding.");
  });

  // Run 24h retention cleanup job
  setInterval(() => {
    RetentionCleanupJob.run();
  }, 24 * 60 * 60 * 1000);

  app.listen(env.PORT, () => {
    logger.info(`🛡️ TrustShield AI server listening on port ${env.PORT} [${env.NODE_ENV}]`);
  });
}
