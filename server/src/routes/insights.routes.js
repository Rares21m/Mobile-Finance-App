const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  getInsightsFeed,
  getActionCenter,
  convertInsightAction,
  trackKpiEvent
} = require("../controllers/insights.controller");

router.use(auth);

router.get("/feed", getInsightsFeed);
router.get("/action-center", getActionCenter);
router.post("/convert", convertInsightAction);
router.post("/kpi-event", trackKpiEvent);

module.exports = router;