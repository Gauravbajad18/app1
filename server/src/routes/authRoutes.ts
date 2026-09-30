import { Router } from "express";
import { AuthController } from "../controllers/authController";
import { authenticate } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { loginRateLimiter } from "../middleware/rateLimit";
import {
  RegisterSchema,
  LoginSchema,
  JoinOrgSchema,
  ChangePasswordSchema
} from "@trustshield/shared";

export const authRouter = Router();

authRouter.post("/register", validateBody(RegisterSchema), AuthController.register);
authRouter.post("/login", loginRateLimiter, validateBody(LoginSchema), AuthController.login);
authRouter.post("/refresh", AuthController.refresh);
authRouter.post("/logout", AuthController.logout);
authRouter.get("/me", authenticate, AuthController.getMe);
authRouter.post("/join", validateBody(JoinOrgSchema), AuthController.joinOrg);
authRouter.patch("/password", authenticate, validateBody(ChangePasswordSchema), AuthController.changePassword);
authRouter.get("/sessions", authenticate, AuthController.getSessions);
authRouter.delete("/sessions/:id", authenticate, AuthController.revokeSession);
