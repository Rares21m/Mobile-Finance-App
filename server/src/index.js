/**
 * @fileoverview Entry point for the Novence API server.
 * Sets up Express middleware, mounts route modules, and starts listening.
 */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth.routes");
const btRoutes = require("./routes/bt.routes");
const brdRoutes = require("./routes/brd.routes");
const advisorRoutes = require("./routes/advisor.routes");
const budgetRoutes = require("./routes/budget.routes");
const goalsRoutes = require("./routes/goals.routes");
const manualRoutes = require("./routes/manual.routes");
const badgesRoutes = require("./routes/badges.routes");
const logger = require("./config/logger");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Rate Limiting ────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "TOO_MANY_REQUESTS" },
});

// ─── Routes ──────────────────────────────────────────────────
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/bt", btRoutes);
app.use("/api/brd", brdRoutes);
app.use("/api/advisor", advisorRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/goals", goalsRoutes);
app.use("/api/manual", manualRoutes);
app.use("/api/badges", badgesRoutes);

// ─── Health Check ────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Novence API",
    timestamp: new Date().toISOString(),
  });
});

// ─── Global Error Handler ────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error("Unhandled error:", err);
  res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
});

// ─── Start ───────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`Novence API running on http://localhost:${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/api/health`);
});
