import { Request, Response, NextFunction } from "express";
import { z } from "zod";

export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!schema || typeof schema.safeParse !== "function") {
      next();
      return;
    }
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request payload validation failed.",
          details: result.error.flatten().fieldErrors
        }
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!schema || typeof schema.safeParse !== "function") {
      next();
      return;
    }
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({
        error: {
          code: "QUERY_VALIDATION_ERROR",
          message: "Query parameters validation failed.",
          details: result.error.flatten().fieldErrors
        }
      });
      return;
    }
    req.query = result.data as any;
    next();
  };
}
