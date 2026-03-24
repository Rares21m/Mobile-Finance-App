const DEFAULT_ERROR_MESSAGE = "REQUEST_FAILED";

class ApiError extends Error {
  constructor(status, code, error, details) {
    super(error || code || DEFAULT_ERROR_MESSAGE);
    this.name = "ApiError";
    this.status = status || 500;
    this.code = code || "INTERNAL_SERVER_ERROR";
    this.error = error || this.code;
    this.details = details;
  }
}

function buildErrorPayload(req, { code, error, details }) {
  const payload = {
    error: error || code || DEFAULT_ERROR_MESSAGE,
    code: code || "INTERNAL_SERVER_ERROR",
    traceId: req.traceId || req.requestId || undefined
  };

  if (details !== undefined) {
    payload.details = details;
  }

  return payload;
}

function sendError(res, req, status, code, details, customError) {
  return res.status(status).json(
    buildErrorPayload(req, {
      code,
      error: customError,
      details
    })
  );
}

module.exports = {
  ApiError,
  buildErrorPayload,
  sendError
};