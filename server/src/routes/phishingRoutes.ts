import { Router } from "express";
import { PhishingController } from "../controllers/phishingController";
import { authenticate } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { aiRateLimiter } from "../middleware/rateLimit";
import { PhishingInputSchema } from "@trustshield/shared";

export const phishingRouter = Router();

phishingRouter.post("/phishing/analyze", authenticate, aiRateLimiter, validateBody(PhishingInputSchema), PhishingController.analyze);
