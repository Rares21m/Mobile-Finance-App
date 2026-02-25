const { Router } = require("express");
const { register, login, updateProfile, changePassword } = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth");

const router = Router();

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/login
router.post("/login", login);

// PUT /api/auth/profile (requires JWT)
router.put("/profile", authMiddleware, updateProfile);

// PUT /api/auth/change-password (requires JWT)
router.put("/change-password", authMiddleware, changePassword);

module.exports = router;
