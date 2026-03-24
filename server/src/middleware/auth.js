/**
 * @fileoverview JWT authentication middleware for the Novence API.
 * Validates the Bearer token from the Authorization header and attaches
 * `req.userId` for downstream handlers.
 */

const jwt = require("jsonwebtoken");





function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "TOKEN_MISSING",
      code: "TOKEN_MISSING"
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({
      error: "TOKEN_EXPIRED_OR_INVALID",
      code: "TOKEN_EXPIRED_OR_INVALID"
    });
  }
}

module.exports = authMiddleware;