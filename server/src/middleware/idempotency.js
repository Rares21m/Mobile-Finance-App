const crypto = require("crypto");
const prisma = require("../config/db");
const logger = require("../config/logger");

const IDEMPOTENCY_TTL_HOURS = 24;

function hashPayload(payload) {
  const body = payload && typeof payload === "object" ? payload : {};
  return crypto.
  createHash("sha256").
  update(JSON.stringify(body)).
  digest("hex");
}

function getEndpointKey(req, endpointName) {
  if (endpointName) return endpointName;
  return `${req.method}:${req.baseUrl}${req.path}`;
}

function withIdempotency(endpointName) {
  return async function idempotencyMiddleware(req, res, next) {
    const key = req.headers["idempotency-key"];

    if (!key || typeof key !== "string" || !key.trim()) {
      return res.status(400).json({
        error: "IDEMPOTENCY_KEY_REQUIRED",
        code: "IDEMPOTENCY_KEY_REQUIRED"
      });
    }

    const endpoint = getEndpointKey(req, endpointName);
    const requestHash = hashPayload(req.body);

    let record;

    try {
      record = await prisma.idempotencyKey.create({
        data: {
          userId: req.userId,
          endpoint,
          key: key.trim().slice(0, 128),
          requestHash,
          expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_HOURS * 3600000)
        }
      });
    } catch (createError) {
      record = await prisma.idempotencyKey.findUnique({
        where: {
          userId_endpoint_key: {
            userId: req.userId,
            endpoint,
            key: key.trim().slice(0, 128)
          }
        }
      });

      if (!record) {
        logger.error("idempotency.lookup_failed", {
          traceId: req.traceId,
          endpoint
        });
        return res.status(500).json({ error: "IDEMPOTENCY_LOOKUP_FAILED" });
      }

      if (record.requestHash !== requestHash) {
        return res.status(409).json({
          error: "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD",
          code: "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD"
        });
      }

      if (record.responseStatus && record.responseBody) {
        res.setHeader("idempotency-replayed", "true");
        return res.status(record.responseStatus).json(record.responseBody);
      }

      return res.status(409).json({
        error: "IDEMPOTENCY_REQUEST_IN_PROGRESS",
        code: "IDEMPOTENCY_REQUEST_IN_PROGRESS"
      });
    }

    const originalJson = res.json.bind(res);

    res.json = (payload) => {
      const responseStatus = res.statusCode;
      const responseBody = payload;

      prisma.idempotencyKey.
      update({
        where: { id: record.id },
        data: {
          responseStatus,
          responseBody
        }
      }).
      catch((err) => {
        logger.warn("idempotency.persist_response_failed", {
          traceId: req.traceId,
          endpoint,
          message: err.message
        });
      });

      return originalJson(payload);
    };

    next();
  };
}

module.exports = {
  withIdempotency
};