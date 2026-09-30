import { Request, Response, NextFunction } from "express";
import { JwtHelper, TokenPayload } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      requestId?: string;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  let token: string | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  }

  if (!token) {
    res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required. Bearer token missing."
      }
    });
    return;
  }

  const payload = JwtHelper.verifyAccessToken(token);
  if (!payload) {
    res.status(401).json({
      error: {
        code: "TOKEN_EXPIRED",
        message: "Access token is invalid or expired."
      }
    });
    return;
  }

  req.user = payload;
  next();
}
