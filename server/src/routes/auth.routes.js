const { Router } = require("express");
const rateLimit = require("express-rate-limit");
const {
  register,
  login,
  updateProfile,
  changePassword,
  saveOnboardingProfile
} = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth");

const router = Router();


const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: "TOO_MANY_REQUESTS" })
});


const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: "TOO_MANY_REQUESTS" })
});


router.post("/register", registerLimiter, register);


router.post("/login", loginLimiter, login);


router.put("/profile", authMiddleware, updateProfile);


router.put("/change-password", authMiddleware, changePassword);


router.put("/onboarding-profile", authMiddleware, saveOnboardingProfile);

module.exports = router;