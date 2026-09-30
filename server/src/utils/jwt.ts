import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config";
import { UserRole } from "@trustshield/shared";

export interface TokenPayload {
  userId: string;
  organizationId: string;
  role: UserRole;
}

export class JwtHelper {
  public static signAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.ACCESS_TOKEN_TTL as any
    });
  }

  public static verifyAccessToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
    } catch {
      return null;
    }
  }

  public static generateRefreshToken(): string {
    return crypto.randomBytes(40).toString("hex");
  }
}
