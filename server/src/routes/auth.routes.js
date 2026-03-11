const { Router } = require("express");
const rateLimit = require("express-rate-limit");
const {
  register,
  login,
  updateProfile,
  changePassword,
  saveOnboardingProfile,
} = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth");

const router = Router();

// Brute-force protection: 10 login attempts per 15 min per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: "TOO_MANY_REQUESTS" }),
});

// Registration spam protection: 5 accounts per hour per IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: "TOO_MANY_REQUESTS" }),
});

// POST /api/auth/register
router.post("/register", registerLimiter, register);

// POST /api/auth/login
router.post("/login", loginLimiter, login);

// PUT /api/auth/profile (requires JWT)
router.put("/profile", authMiddleware, updateProfile);

// PUT /api/auth/change-password (requires JWT)
router.put("/change-password", authMiddleware, changePassword);

// PUT /api/auth/onboarding-profile (requires JWT)
router.put("/onboarding-profile", authMiddleware, saveOnboardingProfile);

module.exports = router;
