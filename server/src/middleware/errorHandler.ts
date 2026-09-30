import { Request, Response, NextFunction } from "express";
import pino from "pino";

const logger = pino({
  name: "error-handler",
  redact: ["req.headers.authorization", "req.body.password", "req.body.current_password", "req.body.new_password"]
});

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const status = err.status || err.statusCode || 500;
  const code = err.code || "INTERNAL_SERVER_ERROR";
  
  // Safe sanitized user message
  let message = err.message || "An unexpected system error occurred.";
  if (status === 500 && process.env.NODE_ENV === "production") {
    message = "An internal server error occurred. Please contact support.";
  }

  logger.error({
    requestId: req.requestId,
    url: req.originalUrl,
    method: req.method,
    status,
    code,
    message: err.message,
    stack: err.stack
  });

  res.status(status).json({
    error: {
      code,
      message
    }
  });
}
