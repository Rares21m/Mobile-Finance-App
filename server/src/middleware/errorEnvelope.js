const { buildErrorPayload } = require("../utils/apiErrors");

function errorEnvelope(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = (payload) => {
    const isErrorStatus = res.statusCode >= 400;

    if (!isErrorStatus) {
      return originalJson(payload);
    }

    const isObjectPayload =
    payload && typeof payload === "object" && !Array.isArray(payload);

    if (isObjectPayload && payload.error) {
      const normalized = {
        ...payload,
        ...buildErrorPayload(req, {
          code: payload.code || payload.error,
          error: payload.error,
          details: payload.details
        })
      };

      return originalJson(normalized);
    }

    return originalJson(
      buildErrorPayload(req, {
        code: "INTERNAL_SERVER_ERROR",
        error: typeof payload === "string" ? payload : "REQUEST_FAILED"
      })
    );
  };

  next();
}

module.exports = errorEnvelope;