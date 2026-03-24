const crypto = require("crypto");
const logger = require("../config/logger");

function normalizeTraceId(value) {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 128);
}

function requestContext(req, res, next) {
  const headerTraceId =
  normalizeTraceId(req.headers["x-correlation-id"]) ||
  normalizeTraceId(req.headers["x-request-id"]);

  const traceId = headerTraceId || crypto.randomUUID();
  req.traceId = traceId;
  req.requestId = traceId;

  const startedAt = Date.now();
  res.setHeader("x-correlation-id", traceId);

  res.on("finish", () => {
    logger.info("request.completed", {
      traceId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      userId: req.userId || null
    });
  });

  next();
}

module.exports = requestContext;