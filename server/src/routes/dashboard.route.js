// server/src/routes/dashboard.route.js
import express from "express";
import { dashboardSummary } from "../controllers/dashboard.controller.js";

const router = express.Router();

// GET /api/dashboard/summary
router.get("/summary", dashboardSummary);

export default router;
