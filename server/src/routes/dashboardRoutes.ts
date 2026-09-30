import { Router } from "express";
import { DashboardController } from "../controllers/dashboardController";
import { authenticate } from "../middleware/auth";

export const dashboardRouter = Router();

dashboardRouter.get("/dashboard", authenticate, DashboardController.getDashboardStats);
