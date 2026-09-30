import rateLimit from "express-rate-limit";

export const loginRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many login attempts. Please wait 1 minute before trying again."
    }
  }
});

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many API requests. Please slow down."
    }
  }
});

export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  keyGenerator: (req) => {
    return req.user?.userId || req.ip || "anonymous";
  },
  message: {
    error: {
      code: "AI_RATE_LIMIT_EXCEEDED",
      message: "AI processing quota exceeded for this minute. Please wait a moment."
    }
  }
});
