/**
 * @fileoverview Budget controller for the Novence API.
 * Handles monthly budget limits and event budgets, synced per-user to PostgreSQL.
 *
 * Routes:
 *   GET    /api/budgets/limits          — get all category limits
 *   PUT    /api/budgets/limits          — bulk upsert limits  { limits: { food: 500 } }
 *   GET    /api/budgets/events          — get all event budgets
 *   POST   /api/budgets/events          — create event budget
 *   PUT    /api/budgets/events/:id      — update event budget
 *   DELETE /api/budgets/events/:id      — delete event budget
 */

const prisma = require("../config/db");
const logger = require("../config/logger");
const { evaluateBadges } = require("../services/badgeService");

const VALID_CATEGORIES = [
  "food",
  "transport",
  "shopping",
  "utilities",
  "housing",
  "entertainment",
  "health",
  "other",
];

// ─── Budget Limits ────────────────────────────────────────────────────────────

/**
 * GET /api/budgets/limits
 * Returns all category budget limits for the authenticated user as a flat object.
 * Example response: { limits: { food: 500, transport: 300 } }
 */
async function getLimits(req, res) {
  try {
    const rows = await prisma.budgetLimit.findMany({
      where: { userId: req.userId },
    });
    const limits = {};
    rows.forEach((r) => {
      limits[r.category] = parseFloat(r.amount);
    });
    res.json({ limits });
  } catch (err) {
    logger.error("getLimits error:", err);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
}

/**
 * PUT /api/budgets/limits
 * Body: { limits: { food: 500, transport: 300 } }
 * Upserts all provided category limits. Categories not in the body are left unchanged.
 * Pass amount: 0 or omit a key to remove a category (handled client-side).
 */
async function upsertLimits(req, res) {
  try {
    const { limits } = req.body;
    if (!limits || typeof limits !== "object") {
      return res.status(400).json({ error: "LIMITS_REQUIRED" });
    }

    // Validate keys
    const invalidKeys = Object.keys(limits).filter(
      (k) => !VALID_CATEGORIES.includes(k),
    );
    if (invalidKeys.length > 0) {
      return res.status(400).json({ error: "INVALID_CATEGORIES", invalidKeys });
    }

    // Delete all existing limits first, then re-insert (simple bulk upsert)
    await prisma.budgetLimit.deleteMany({ where: { userId: req.userId } });

    const rows = Object.entries(limits)
      .filter(([, amount]) => Number(amount) > 0)
      .map(([category, amount]) => ({
        userId: req.userId,
        category,
        amount,
      }));

    if (rows.length > 0) {
      await prisma.budgetLimit.createMany({ data: rows });
    }

    // Re-fetch and return
    const updated = await prisma.budgetLimit.findMany({
      where: { userId: req.userId },
    });
    const result = {};
    updated.forEach((r) => {
      result[r.category] = parseFloat(r.amount);
    });
    const newBadges = await evaluateBadges(req.userId);
    res.json({ limits: result, newBadges });
  } catch (err) {
    logger.error("upsertLimits error:", err);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
}

// ─── Event Budgets ────────────────────────────────────────────────────────────

/**
 * GET /api/budgets/events
 * Returns all event budgets for the authenticated user.
 */
async function getEventBudgets(req, res) {
  try {
    const events = await prisma.eventBudget.findMany({
      where: { userId: req.userId },
      orderBy: { startDate: "asc" },
    });
    res.json({ events: events.map(formatEvent) });
  } catch (err) {
    logger.error("getEventBudgets error:", err);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
}

/**
 * POST /api/budgets/events
 * Body: { name, totalLimit, startDate, endDate, categories? }
 */
async function createEventBudget(req, res) {
  try {
    const { name, totalLimit, startDate, endDate, categories } = req.body;
    if (!name || !totalLimit || !startDate || !endDate) {
      return res.status(400).json({ error: "MISSING_FIELDS" });
    }
    const ev = await prisma.eventBudget.create({
      data: {
        userId: req.userId,
        name,
        totalLimit: parseFloat(totalLimit),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        categories: JSON.stringify(categories || []),
      },
    });
    const newBadges = await evaluateBadges(req.userId);
    res.status(201).json({ event: formatEvent(ev), newBadges });
  } catch (err) {
    logger.error("createEventBudget error:", err);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
}

/**
 * PUT /api/budgets/events/:id
 */
async function updateEventBudget(req, res) {
  try {
    const { id } = req.params;
    const ev = await prisma.eventBudget.findUnique({ where: { id } });
    if (!ev || ev.userId !== req.userId) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }
    const { name, totalLimit, startDate, endDate, categories } = req.body;
    const updated = await prisma.eventBudget.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(totalLimit !== undefined && { totalLimit: parseFloat(totalLimit) }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: new Date(endDate) }),
        ...(categories !== undefined && {
          categories: JSON.stringify(categories),
        }),
      },
    });
    res.json({ event: formatEvent(updated) });
  } catch (err) {
    logger.error("updateEventBudget error:", err);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
}

/**
 * DELETE /api/budgets/events/:id
 */
async function deleteEventBudget(req, res) {
  try {
    const { id } = req.params;
    const ev = await prisma.eventBudget.findUnique({ where: { id } });
    if (!ev || ev.userId !== req.userId) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }
    await prisma.eventBudget.delete({ where: { id } });
    res.json({ message: "DELETED" });
  } catch (err) {
    logger.error("deleteEventBudget error:", err);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatEvent(ev) {
  return {
    id: ev.id,
    name: ev.name,
    totalLimit: parseFloat(ev.totalLimit),
    startDate: ev.startDate.toISOString(),
    endDate: ev.endDate.toISOString(),
    categories: JSON.parse(ev.categories || "[]"),
  };
}

module.exports = {
  getLimits,
  upsertLimits,
  getEventBudgets,
  createEventBudget,
  updateEventBudget,
  deleteEventBudget,
};
