import { Request, Response, NextFunction } from "express";
import { UserRole } from "@trustshield/shared";

const ROLE_HIERARCHY: Record<UserRole, number> = {
  user: 1,
  analyst: 2,
  org_admin: 3
};

export function requireRole(minimumRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required before role verification."
        }
      });
      return;
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minimumRole] || 0;

    if (userLevel < requiredLevel) {
      res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: `Access denied. Requires '${minimumRole}' privileges, but current role is '${req.user.role}'.`
        }
      });
      return;
    }

    next();
  };
}
