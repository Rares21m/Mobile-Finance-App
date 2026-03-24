/**
 * @fileoverview Savings Goals controller for the Novence API.
 *
 * Routes:
 *   GET    /api/goals        — list all goals
 *   POST   /api/goals        — create a goal
 *   PUT    /api/goals/:id    — update a goal (including savedAmount)
 *   DELETE /api/goals/:id    — delete a goal
 */

const prisma = require("../config/db");
const logger = require("../config/logger");




async function getGoals(req, res) {
  try {
    const goals = await prisma.savingsGoal.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "asc" }
    });
    res.json({ goals: goals.map(formatGoal) });
  } catch (err) {
    logger.error("getGoals error:", err);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
}





async function createGoal(req, res) {
  try {
    const { name, targetAmount, savedAmount, deadline, icon, color } = req.body;
    if (!name || !targetAmount) {
      return res.status(400).json({ error: "NAME_AND_TARGET_REQUIRED" });
    }
    if (isNaN(parseFloat(targetAmount)) || parseFloat(targetAmount) <= 0) {
      return res.status(400).json({ error: "INVALID_TARGET_AMOUNT" });
    }
    const goal = await prisma.savingsGoal.create({
      data: {
        userId: req.userId,
        name,
        targetAmount: parseFloat(targetAmount),
        savedAmount: savedAmount ? parseFloat(savedAmount) : 0,
        deadline: deadline ? new Date(deadline) : null,
        icon: icon || "star-outline",
        color: color || "#10B981"
      }
    });
    res.status(201).json({ goal: formatGoal(goal) });
  } catch (err) {
    logger.error("createGoal error:", err);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
}





async function updateGoal(req, res) {
  try {
    const { id } = req.params;
    const existing = await prisma.savingsGoal.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.userId) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }
    const { name, targetAmount, savedAmount, deadline, icon, color } = req.body;
    const updated = await prisma.savingsGoal.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(targetAmount !== undefined && {
          targetAmount: parseFloat(targetAmount)
        }),
        ...(savedAmount !== undefined && {
          savedAmount: parseFloat(savedAmount)
        }),
        ...(deadline !== undefined && {
          deadline: deadline ? new Date(deadline) : null
        }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color })
      }
    });
    res.json({ goal: formatGoal(updated) });
  } catch (err) {
    logger.error("updateGoal error:", err);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
}




async function deleteGoal(req, res) {
  try {
    const { id } = req.params;
    const existing = await prisma.savingsGoal.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.userId) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }
    await prisma.savingsGoal.delete({ where: { id } });
    res.json({ message: "DELETED" });
  } catch (err) {
    logger.error("deleteGoal error:", err);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
}

function formatGoal(g) {
  return {
    id: g.id,
    name: g.name,
    targetAmount: parseFloat(g.targetAmount),
    savedAmount: parseFloat(g.savedAmount),
    deadline: g.deadline ? g.deadline.toISOString() : null,
    icon: g.icon,
    color: g.color,
    createdAt: g.createdAt.toISOString()
  };
}

module.exports = { getGoals, createGoal, updateGoal, deleteGoal };