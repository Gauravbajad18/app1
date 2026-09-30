import { Router } from "express";
import { GatewayController } from "../controllers/gatewayController";
import { authenticate } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { aiRateLimiter } from "../middleware/rateLimit";
import { CreateConversationSchema, GatewayMessageSchema } from "@trustshield/shared";

export const gatewayRouter = Router();

gatewayRouter.post("/gateway/conversations", authenticate, validateBody(CreateConversationSchema), GatewayController.createConversation);
gatewayRouter.get("/gateway/conversations", authenticate, GatewayController.listConversations);
gatewayRouter.get("/gateway/conversations/:id", authenticate, GatewayController.getConversation);
gatewayRouter.post("/gateway/conversations/:id/messages", authenticate, aiRateLimiter, validateBody(GatewayMessageSchema), GatewayController.sendMessage);
gatewayRouter.delete("/gateway/conversations/:id", authenticate, GatewayController.deleteConversation);
