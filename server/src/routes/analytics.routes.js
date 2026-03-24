const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { getMonthlySummary } = require("../controllers/analytics.controller");

router.use(auth);

router.get("/monthly-summary", getMonthlySummary);

module.exports = router;