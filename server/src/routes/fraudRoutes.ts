import { Router } from "express";
import multer from "multer";
import { FraudController } from "../controllers/fraudController";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { validateBody } from "../middleware/validate";
import { aiRateLimiter } from "../middleware/rateLimit";
import { TransactionSchema, FraudReviewSchema } from "@trustshield/shared";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

export const fraudRouter = Router();

fraudRouter.post("/fraud/score", authenticate, aiRateLimiter, validateBody(TransactionSchema), FraudController.scoreSingle);
fraudRouter.post("/fraud/upload", authenticate, upload.single("file"), FraudController.uploadCsv);
fraudRouter.get("/fraud/transactions", authenticate, requireRole("analyst"), FraudController.listTransactions);
fraudRouter.patch("/fraud/transactions/:id/review", authenticate, requireRole("analyst"), validateBody(FraudReviewSchema), FraudController.reviewTransaction);
