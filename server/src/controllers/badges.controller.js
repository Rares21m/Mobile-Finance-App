/**
 * @fileoverview Badges controller.
 * GET  /api/badges          — full catalogue with earned status for the user
 * POST /api/badges/evaluate — check & award new badges, return newly earned ones
 */

const prisma = require("../config/db");
const { BADGES, evaluateBadges } = require("../services/badgeService");
const logger = require("../config/logger");

/**
 * GET /api/badges
 * Returns all badge definitions merged with the user's earned status.
 */
async function getBadges(req, res) {
  try {
    const userId = req.userId;
    const earned = await prisma.userBadge.findMany({
      where: { userId },
      select: { badgeId: true, earnedAt: true },
    });
    const earnedMap = Object.fromEntries(earned.map((b) => [b.badgeId, b.earnedAt]));

    const badges = BADGES.map((b) => ({
      ...b,
      earned: !!earnedMap[b.id],
      earnedAt: earnedMap[b.id] ?? null,
    }));

    const totalPoints = BADGES.filter((b) => earnedMap[b.id]).reduce(
      (sum, b) => sum + b.points,
      0,
    );

    res.json({ badges, totalPoints });
  } catch (err) {
    logger.error("getBadges error:", err);
    res.status(500).json({ error: "BADGES_FETCH_FAILED" });
  }
}

/**
 * POST /api/badges/evaluate
 * Evaluates all badge conditions and awards any newly earned ones.
 * Returns the list of newly earned badges so the client can celebrate.
 */
async function evaluate(req, res) {
  try {
    const userId = req.userId;
    const newBadges = await evaluateBadges(userId);
    res.json({ newBadges });
  } catch (err) {
    logger.error("evaluate badges error:", err);
    res.status(500).json({ error: "BADGES_EVALUATE_FAILED" });
  }
}

module.exports = { getBadges, evaluate };
