/**
 * @fileoverview Entry point for the Novence API server.
 * Sets up Express middleware, mounts route modules, and starts listening.
 */

require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const btRoutes = require("./routes/bt.routes");
const logger = require("./config/logger");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Routes ──────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/bt", btRoutes);

// ─── Health Check ────────────────────────────────────────────
app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "Novence API", timestamp: new Date().toISOString() });
});

// ─── Global Error Handler ────────────────────────────────────
app.use((err, req, res, next) => {
    logger.error("Unhandled error:", err);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
});

// ─── Start ───────────────────────────────────────────────────
app.listen(PORT, () => {
    logger.info(`🚀 Novence API running on http://localhost:${PORT}`);
    logger.info(`📋 Health check: http://localhost:${PORT}/api/health`);
});
