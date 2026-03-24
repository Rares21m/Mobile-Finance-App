/**
 * @fileoverview Routes for the AI Financial Advisor.
 * All routes require a valid JWT (authMiddleware).
 */

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const { chat } = require("../controllers/advisor.controller");


router.post("/chat", authMiddleware, chat);

module.exports = router;