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
const analyticsRoutes = require("./routes/analytics.routes");
const insightsRoutes = require("./routes/insights.routes");
const logger = require("./config/logger");
const prisma = require("./config/db");
const requestContext = require("./middleware/requestContext");
const errorEnvelope = require("./middleware/errorEnvelope");
const btService = require("./services/bt.service");
const brdService = require("./services/brd.service");
const { buildErrorPayload } = require("./utils/apiErrors");

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(requestContext);
app.use(errorEnvelope);


const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.setHeader("retry-after", String(Math.ceil(15 * 60 / 20)));
    return res.status(429).json({
      error: "TOO_MANY_REQUESTS",
      code: "TOO_MANY_REQUESTS",
      details: { retryAfterSeconds: 45 }
    });
  }
});


app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/bt", btRoutes);
app.use("/api/brd", brdRoutes);
app.use("/api/advisor", advisorRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/goals", goalsRoutes);
app.use("/api/manual", manualRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/insights", insightsRoutes);


app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Novence API",
    timestamp: new Date().toISOString(),
    traceId: req.traceId
  });
});

app.get("/api/health/dependencies", async (req, res) => {
  const checks = {
    db: { ok: false },
    aiProvider: { ok: Boolean(process.env.GEMINI_API_KEY) },
    btAdapter: btService.getHealthStatus(),
    brdAdapter: brdService.getHealthStatus()
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db.ok = true;
  } catch (err) {
    checks.db.error = err.message;
  }

  const ok =
  checks.db.ok && checks.btAdapter.ok && checks.brdAdapter.ok && checks.aiProvider.ok;

  return res.status(ok ? 200 : 503).json({
    status: ok ? "ok" : "degraded",
    checks,
    timestamp: new Date().toISOString()
  });
});


app.use((err, req, res, next) => {
  logger.error("unhandled.error", {
    traceId: req.traceId,
    path: req.originalUrl,
    method: req.method,
    message: err.message,
    stack: err.stack
  });

  res.status(err.status || 500).json(
    buildErrorPayload(req, {
      code: err.code || "INTERNAL_SERVER_ERROR",
      error: err.error || err.code || "INTERNAL_SERVER_ERROR",
      details: err.details
    })
  );
});


app.listen(PORT, () => {
  logger.info(`Novence API running on http://localhost:${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/api/health`);
});