import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { env } from "../config";
import { UserRepository } from "../repositories/userRepository";
import { OrgRepository } from "../repositories/orgRepository";
import { MemberRepository } from "../repositories/memberRepository";
import { TokenRepository } from "../repositories/tokenRepository";
import { PolicyRepository } from "../repositories/policyRepository";
import { AuditRepository } from "../repositories/auditRepository";
import { JwtHelper } from "../utils/jwt";
import {
  RegisterInput,
  LoginInput,
  JoinOrgInput,
  ChangePasswordInput
} from "@trustshield/shared";

function setRefreshCookie(res: Response, refreshToken: string) {
  const isProd = env.NODE_ENV === "production";
  res.cookie("trustshield_refresh", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
}

function clearRefreshCookie(res: Response) {
  const isProd = env.NODE_ENV === "production";
  res.clearCookie("trustshield_refresh", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax"
  });
}

export class AuthController {
  public static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: RegisterInput = req.body;

      // 1. Check if user already exists
      const existingUser = await UserRepository.findByEmail(data.email);
      if (existingUser) {
        res.status(409).json({
          error: {
            code: "USER_EXISTS",
            message: "An account with this email address already exists."
          }
        });
        return;
      }

      // 2. Create organization
      const orgSlug = data.org_name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 50) + "-" + crypto.randomBytes(3).toString("hex");
      
      const inviteCode = "INV-" + crypto.randomBytes(6).toString("hex").toUpperCase();
      const org = await OrgRepository.create(data.org_name, orgSlug, inviteCode);

      // Seed default privacy policies for the new org
      await PolicyRepository.seedDefaults(org.id);

      // 3. Create user (bcrypt cost 12)
      const user = await UserRepository.create(data.email, data.password, data.full_name);

      // 4. Add member as org_admin
      await MemberRepository.addMember(org.id, user.id, "org_admin");

      // 5. Create refresh token and access token
      const familyId = crypto.randomUUID();
      const rawRefreshToken = JwtHelper.generateRefreshToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await TokenRepository.createRefreshToken({
        userId: user.id,
        organizationId: org.id,
        rawToken: rawRefreshToken,
        familyId,
        expiresAt,
        userAgent: req.headers["user-agent"],
        ip: req.ip
      });

      const accessToken = JwtHelper.signAccessToken({
        userId: user.id,
        organizationId: org.id,
        role: "org_admin"
      });

      setRefreshCookie(res, rawRefreshToken);

      await AuditRepository.logAction({
        organization_id: org.id,
        actor_user_id: user.id,
        action: "USER_REGISTER",
        resource_type: "user",
        resource_id: user.id,
        metadata: { email: user.email, org_name: org.name, role: "org_admin" },
        ip: req.ip,
        user_agent: req.headers["user-agent"]
      });

      res.status(201).json({
        access_token: accessToken,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: "org_admin",
          organization: {
            id: org.id,
            name: org.name,
            slug: org.slug,
            invite_code: inviteCode
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password }: LoginInput = req.body;

      const user = await UserRepository.findByEmail(email);

      // Generic login error messages to prevent username enumeration
      if (!user) {
        res.status(401).json({
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password."
          }
        });
        return;
      }

      // Check account lockout
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const remainingMinutes = Math.ceil(
          (new Date(user.locked_until).getTime() - Date.now()) / (1000 * 60)
        );
        res.status(423).json({
          error: {
            code: "ACCOUNT_LOCKED",
            message: `Account is temporarily locked due to multiple failed logins. Please try again in ${remainingMinutes} minute(s).`
          }
        });
        return;
      }

      // Verify password
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        const { locked, lockedUntil } = await UserRepository.recordFailedLogin(user.id);
        
        const orgInfo = await MemberRepository.getFirstOrgForUser(user.id);
        if (orgInfo) {
          await AuditRepository.logAction({
            organization_id: orgInfo.organization_id,
            actor_user_id: user.id,
            action: "LOGIN_FAILED",
            resource_type: "user",
            resource_id: user.id,
            metadata: { email, locked },
            ip: req.ip,
            user_agent: req.headers["user-agent"]
          });
        }

        if (locked) {
          res.status(423).json({
            error: {
              code: "ACCOUNT_LOCKED",
              message: "Account has been locked for 15 minutes due to 5 consecutive failed login attempts."
            }
          });
          return;
        }

        res.status(401).json({
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password."
          }
        });
        return;
      }

      // Reset failed login counter upon successful authentication
      await UserRepository.resetFailedLogin(user.id);

      // Get user organization membership
      const membership = await MemberRepository.getFirstOrgForUser(user.id);
      if (!membership) {
        res.status(403).json({
          error: {
            code: "NO_ORGANIZATION",
            message: "User is not associated with any active organization."
          }
        });
        return;
      }

      const org = await OrgRepository.findById(membership.organization_id);
      if (!org) {
        res.status(404).json({
          error: {
            code: "ORG_NOT_FOUND",
            message: "Organization not found."
          }
        });
        return;
      }

      // Generate rotated refresh token
      const familyId = crypto.randomUUID();
      const rawRefreshToken = JwtHelper.generateRefreshToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await TokenRepository.createRefreshToken({
        userId: user.id,
        organizationId: org.id,
        rawToken: rawRefreshToken,
        familyId,
        expiresAt,
        userAgent: req.headers["user-agent"],
        ip: req.ip
      });

      const accessToken = JwtHelper.signAccessToken({
        userId: user.id,
        organizationId: org.id,
        role: membership.role
      });

      setRefreshCookie(res, rawRefreshToken);

      await AuditRepository.logAction({
        organization_id: org.id,
        actor_user_id: user.id,
        action: "LOGIN_SUCCESS",
        resource_type: "user",
        resource_id: user.id,
        metadata: { role: membership.role },
        ip: req.ip,
        user_agent: req.headers["user-agent"]
      });

      res.json({
        access_token: accessToken,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: membership.role,
          organization: {
            id: org.id,
            name: org.name,
            slug: org.slug
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }

  public static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = req.cookies?.trustshield_refresh || req.body?.refresh_token;

      if (!rawRefreshToken) {
        res.status(401).json({
          error: {
            code: "REFRESH_TOKEN_REQUIRED",
            message: "Refresh token is missing."
          }
        });
        return;
      }

      const tokenRecord = await TokenRepository.findByRawToken(rawRefreshToken);

      if (!tokenRecord) {
        clearRefreshCookie(res);
        res.status(401).json({
          error: {
            code: "INVALID_REFRESH_TOKEN",
            message: "Refresh token invalid."
          }
        });
        return;
      }

      // Check if token was already revoked (Reuse Detection!)
      if (tokenRecord.revoked_at !== null) {
        // Compromise detected: Revoke entire token family
        await TokenRepository.revokeFamily(tokenRecord.family_id);
        clearRefreshCookie(res);

        await AuditRepository.logAction({
          organization_id: tokenRecord.organization_id,
          actor_user_id: tokenRecord.user_id,
          action: "TOKEN_REUSE_DETECTED",
          resource_type: "refresh_token",
          resource_id: tokenRecord.id,
          metadata: { family_id: tokenRecord.family_id, warning: "Revoked entire token family" },
          ip: req.ip,
          user_agent: req.headers["user-agent"]
        });

        res.status(403).json({
          error: {
            code: "TOKEN_COMPROMISED",
            message: "Token reuse detected. All active sessions have been invalidated for security."
          }
        });
        return;
      }

      // Check expiry
      if (new Date(tokenRecord.expires_at) < new Date()) {
        await TokenRepository.revokeToken(tokenRecord.id);
        clearRefreshCookie(res);
        res.status(401).json({
          error: {
            code: "TOKEN_EXPIRED",
            message: "Refresh token has expired."
          }
        });
        return;
      }

      // Revoke the old refresh token (Rotation)
      await TokenRepository.revokeToken(tokenRecord.id);

      // Issue new refresh token within the same family
      const newRawRefreshToken = JwtHelper.generateRefreshToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await TokenRepository.createRefreshToken({
        userId: tokenRecord.user_id,
        organizationId: tokenRecord.organization_id,
        rawToken: newRawRefreshToken,
        familyId: tokenRecord.family_id,
        expiresAt,
        userAgent: req.headers["user-agent"],
        ip: req.ip
      });

      // Get user membership role
      const member = await MemberRepository.findByOrgAndUser(
        tokenRecord.organization_id,
        tokenRecord.user_id
      );

      const role = member?.role || "user";
      const accessToken = JwtHelper.signAccessToken({
        userId: tokenRecord.user_id,
        organizationId: tokenRecord.organization_id,
        role
      });

      setRefreshCookie(res, newRawRefreshToken);

      res.json({
        access_token: accessToken
      });
    } catch (err) {
      next(err);
    }
  }

  public static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = req.cookies?.trustshield_refresh || req.body?.refresh_token;

      if (rawRefreshToken) {
        const tokenRecord = await TokenRepository.findByRawToken(rawRefreshToken);
        if (tokenRecord) {
          await TokenRepository.revokeToken(tokenRecord.id);

          await AuditRepository.logAction({
            organization_id: tokenRecord.organization_id,
            actor_user_id: tokenRecord.user_id,
            action: "USER_LOGOUT",
            resource_type: "user",
            resource_id: tokenRecord.user_id,
            ip: req.ip,
            user_agent: req.headers["user-agent"]
          });
        }
      }

      clearRefreshCookie(res);
      res.json({ success: true, message: "Logged out successfully." });
    } catch (err) {
      next(err);
    }
  }

  public static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const user = await UserRepository.findById(req.user.userId);
      const org = await OrgRepository.findById(req.user.organizationId);

      if (!user || !org) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "User or workspace not found" } });
        return;
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: req.user.role,
          organization: {
            id: org.id,
            name: org.name,
            slug: org.slug,
            settings: org.settings
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }

  public static async joinOrg(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, full_name, invite_code }: JoinOrgInput = req.body;

      // Validate invite code
      const org = await OrgRepository.findByInviteCode(invite_code);
      if (!org) {
        res.status(404).json({
          error: {
            code: "INVALID_INVITE_CODE",
            message: "The invitation code provided is invalid or has expired."
          }
        });
        return;
      }

      // Check if user already exists
      let user = await UserRepository.findByEmail(email);
      if (!user) {
        user = await UserRepository.create(email, password, full_name);
      } else {
        // If user already exists, verify password
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
          res.status(401).json({
            error: {
              code: "INVALID_CREDENTIALS",
              message: "An account with this email already exists, but the password provided is incorrect."
            }
          });
          return;
        }
      }

      // Check if already a member of this org
      const existingMember = await MemberRepository.findByOrgAndUser(org.id, user.id);
      if (existingMember) {
        res.status(409).json({
          error: {
            code: "ALREADY_MEMBER",
            message: "You are already a registered member of this organization."
          }
        });
        return;
      }

      // Add as regular user
      await MemberRepository.addMember(org.id, user.id, "user");

      const familyId = crypto.randomUUID();
      const rawRefreshToken = JwtHelper.generateRefreshToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await TokenRepository.createRefreshToken({
        userId: user.id,
        organizationId: org.id,
        rawToken: rawRefreshToken,
        familyId,
        expiresAt,
        userAgent: req.headers["user-agent"],
        ip: req.ip
      });

      const accessToken = JwtHelper.signAccessToken({
        userId: user.id,
        organizationId: org.id,
        role: "user"
      });

      setRefreshCookie(res, rawRefreshToken);

      await AuditRepository.logAction({
        organization_id: org.id,
        actor_user_id: user.id,
        action: "MEMBER_JOINED",
        resource_type: "organization",
        resource_id: org.id,
        metadata: { email: user.email, invite_code: invite_code.slice(0, 7) + "..." },
        ip: req.ip,
        user_agent: req.headers["user-agent"]
      });

      res.status(201).json({
        access_token: accessToken,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: "user",
          organization: {
            id: org.id,
            name: org.name,
            slug: org.slug
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }

  public static async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const { current_password, new_password }: ChangePasswordInput = req.body;
      const user = await UserRepository.findById(req.user.userId);

      if (!user) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found" } });
        return;
      }

      const match = await bcrypt.compare(current_password, user.password_hash);
      if (!match) {
        res.status(400).json({
          error: {
            code: "INVALID_CURRENT_PASSWORD",
            message: "The current password provided is incorrect."
          }
        });
        return;
      }

      await UserRepository.updatePassword(user.id, new_password);

      // Revoke all refresh tokens on password change for security
      await AuditRepository.logAction({
        organization_id: req.user.organizationId,
        actor_user_id: user.id,
        action: "PASSWORD_CHANGED",
        resource_type: "user",
        resource_id: user.id,
        ip: req.ip,
        user_agent: req.headers["user-agent"]
      });

      res.json({ success: true, message: "Password updated successfully." });
    } catch (err) {
      next(err);
    }
  }

  public static async getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const sessions = await TokenRepository.listActiveSessions(
        req.user.userId,
        req.user.organizationId
      );

      res.json({
        sessions: sessions.map(s => ({
          id: s.id,
          user_agent: s.user_agent,
          ip: s.ip,
          created_at: s.created_at,
          expires_at: s.expires_at
        }))
      });
    } catch (err) {
      next(err);
    }
  }

  public static async revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const { id } = req.params;
      const revoked = await TokenRepository.revokeSession(
        id,
        req.user.userId,
        req.user.organizationId
      );

      if (!revoked) {
        res.status(404).json({ error: { code: "SESSION_NOT_FOUND", message: "Session not found or already revoked." } });
        return;
      }

      res.json({ success: true, message: "Session revoked." });
    } catch (err) {
      next(err);
    }
  }
}
