const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
    getLimits,
    upsertLimits,
    getEventBudgets,
    createEventBudget,
    updateEventBudget,
    deleteEventBudget,
} = require("../controllers/budget.controller");

router.use(auth);

router.get("/limits", getLimits);
router.put("/limits", upsertLimits);
router.get("/events", getEventBudgets);
router.post("/events", createEventBudget);
router.put("/events/:id", updateEventBudget);
router.delete("/events/:id", deleteEventBudget);

module.exports = router;
