import { Router } from "express";
import multer from "multer";
import { ScanController } from "../controllers/scanController";
import { authenticate } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { aiRateLimiter } from "../middleware/rateLimit";
import { ScanTextSchema, DetectionFeedbackSchema } from "@trustshield/shared";

// Memory storage, 5 MB limit as specified in Section 5.2
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  }
});

export const scanRouter = Router();

scanRouter.post("/scan/text", authenticate, aiRateLimiter, validateBody(ScanTextSchema), ScanController.scanText);
scanRouter.post("/scan/file", authenticate, aiRateLimiter, upload.single("file"), ScanController.scanFile);
scanRouter.get("/detections", authenticate, ScanController.listDetections);
scanRouter.get("/detections/:id", authenticate, ScanController.getDetectionById);
scanRouter.post("/detections/:id/feedback", authenticate, validateBody(DetectionFeedbackSchema), ScanController.submitFeedback);
