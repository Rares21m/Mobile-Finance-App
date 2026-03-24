const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  getLimits,
  upsertLimits,
  getEventBudgets,
  createEventBudget,
  updateEventBudget,
  deleteEventBudget
} = require("../controllers/budget.controller");
const { withIdempotency } = require("../middleware/idempotency");

router.use(auth);

router.get("/limits", getLimits);
router.put("/limits", withIdempotency("budget:limits:upsert"), upsertLimits);
router.get("/events", getEventBudgets);
router.post("/events", withIdempotency("budget:event:create"), createEventBudget);
router.put("/events/:id", withIdempotency("budget:event:update"), updateEventBudget);
router.delete("/events/:id", withIdempotency("budget:event:delete"), deleteEventBudget);

module.exports = router;