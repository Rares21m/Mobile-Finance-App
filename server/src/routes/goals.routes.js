const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { getGoals, createGoal, updateGoal, deleteGoal } = require("../controllers/goals.controller");

router.use(auth);

router.get("/", getGoals);
router.post("/", createGoal);
router.put("/:id", updateGoal);
router.delete("/:id", deleteGoal);

module.exports = router;
