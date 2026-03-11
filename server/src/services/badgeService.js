/**
 * @fileoverview Badge/Gamification service for the Novence app.
 * Defines all badge metadata and evaluation logic.
 * All badge awarding is idempotent — awarding twice is safe (unique constraint).
 */

const prisma = require("../config/db");
const logger = require("../config/logger");

// ─── Badge Catalogue ──────────────────────────────────────────────────────────
const BADGES = [
  {
    id: "welcome",
    emoji: "👋",
    color: "#10B981",
    nameRo: "Bun Venit!",
    nameEn: "Welcome!",
    descRo: "Ți-ai creat contul Novence",
    descEn: "You created your Novence account",
    points: 10,
  },
  {
    id: "bank_connected",
    emoji: "🏦",
    color: "#3B82F6",
    nameRo: "Conectat la Bancă",
    nameEn: "Bank Connected",
    descRo: "Ai conectat primul tău cont bancar",
    descEn: "Connected your first bank account",
    points: 20,
  },
  {
    id: "first_budget",
    emoji: "📊",
    color: "#8B5CF6",
    nameRo: "Bugetar",
    nameEn: "Budgeter",
    descRo: "Ai setat primul tău buget lunar",
    descEn: "Set your first monthly budget",
    points: 20,
  },
  {
    id: "five_budgets",
    emoji: "🎯",
    color: "#F59E0B",
    nameRo: "Budget Pro",
    nameEn: "Budget Pro",
    descRo: "Bugete setate pe 5+ categorii",
    descEn: "Budgets set for 5+ categories",
    points: 30,
  },
  {
    id: "event_planner",
    emoji: "🗓️",
    color: "#EC4899",
    nameRo: "Event Planner",
    nameEn: "Event Planner",
    descRo: "Ai creat primul buget de eveniment",
    descEn: "Created your first event budget",
    points: 25,
  },
  {
    id: "first_goal",
    emoji: "🌱",
    color: "#10B981",
    nameRo: "Ambițios",
    nameEn: "Ambitious",
    descRo: "Ai creat primul tău obiectiv de economisire",
    descEn: "Created your first savings goal",
    points: 20,
  },
  {
    id: "three_goals",
    emoji: "✨",
    color: "#6366F1",
    nameRo: "Visător",
    nameEn: "Dreamer",
    descRo: "3 obiective active în același timp",
    descEn: "3 active savings goals at once",
    points: 30,
  },
  {
    id: "goal_halfway",
    emoji: "⚡",
    color: "#F59E0B",
    nameRo: "Jumătatea Drumului",
    nameEn: "Halfway There",
    descRo: "Ai atins 50% dintr-un obiectiv de economisire",
    descEn: "Reached 50% of a savings goal",
    points: 35,
  },
  {
    id: "goal_achieved",
    emoji: "🏆",
    color: "#F59E0B",
    nameRo: "Obiectiv Atins!",
    nameEn: "Goal Achieved!",
    descRo: "Ai completat un obiectiv de economisire",
    descEn: "Completed a savings goal",
    points: 50,
  },
  {
    id: "first_manual",
    emoji: "✏️",
    color: "#06B6D4",
    nameRo: "Meticulos",
    nameEn: "Meticulous",
    descRo: "Ai adăugat prima tranzacție manuală",
    descEn: "Added your first manual transaction",
    points: 15,
  },
  {
    id: "ten_manual",
    emoji: "📝",
    color: "#3B82F6",
    nameRo: "Contabil de Casă",
    nameEn: "Home Accountant",
    descRo: "10 tranzacții manuale adăugate",
    descEn: "Added 10 manual transactions",
    points: 30,
  },
  {
    id: "category_pro",
    emoji: "🏷️",
    color: "#8B5CF6",
    nameRo: "Organizat",
    nameEn: "Organized",
    descRo: "Ai recategorizat o tranzacție",
    descEn: "Recategorized a transaction",
    points: 20,
  },
  {
    id: "advisor_used",
    emoji: "🤖",
    color: "#10B981",
    nameRo: "Consultat",
    nameEn: "Consulted",
    descRo: "Ai folosit consilierul financiar AI",
    descEn: "Used the AI financial advisor",
    points: 25,
  },
  {
    id: "savings_500",
    emoji: "💰",
    color: "#F59E0B",
    nameRo: "Erou al Economiilor",
    nameEn: "Savings Hero",
    descRo: "Economii totale de peste 500 RON",
    descEn: "Total savings over 500 RON",
    points: 40,
  },
];

const BADGE_MAP = Object.fromEntries(BADGES.map((b) => [b.id, b]));

/**
 * Evaluate all auto-detectable badge conditions for the given user,
 * award any newly earned ones, and return the newly awarded badge objects.
 * The `advisor_used` badge is NOT evaluated here — it is awarded via awardBadge().
 */
async function evaluateBadges(userId) {
  try {
    const [
      earned,
      budgetLimitCount,
      eventBudgetCount,
      goals,
      manualCount,
      overrideCount,
      activeBankCount,
    ] = await Promise.all([
      prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true } }),
      prisma.budgetLimit.count({ where: { userId } }),
      prisma.eventBudget.count({ where: { userId } }),
      prisma.savingsGoal.findMany({
        where: { userId },
        select: { targetAmount: true, savedAmount: true },
      }),
      prisma.manualTransaction.count({ where: { userId } }),
      prisma.transactionCategoryOverride.count({ where: { userId } }),
      prisma.bankConnection.count({ where: { userId, status: "active" } }),
    ]);

    const earnedSet = new Set(earned.map((b) => b.badgeId));
    const totalSaved = goals.reduce((sum, g) => sum + Number(g.savedAmount), 0);

    const conditions = {
      bank_connected: activeBankCount > 0,
      first_budget: budgetLimitCount > 0,
      five_budgets: budgetLimitCount >= 5,
      event_planner: eventBudgetCount > 0,
      first_goal: goals.length > 0,
      three_goals: goals.length >= 3,
      goal_halfway: goals.some(
        (g) =>
          Number(g.targetAmount) > 0 &&
          Number(g.savedAmount) >= Number(g.targetAmount) / 2,
      ),
      goal_achieved: goals.some(
        (g) =>
          Number(g.targetAmount) > 0 &&
          Number(g.savedAmount) >= Number(g.targetAmount),
      ),
      first_manual: manualCount > 0,
      ten_manual: manualCount >= 10,
      category_pro: overrideCount > 0,
      savings_500: totalSaved >= 500,
    };

    const newBadgeIds = Object.entries(conditions)
      .filter(([id, met]) => met && !earnedSet.has(id))
      .map(([id]) => id);

    if (newBadgeIds.length === 0) return [];

    await prisma.userBadge.createMany({
      data: newBadgeIds.map((badgeId) => ({ userId, badgeId })),
      skipDuplicates: true,
    });

    return newBadgeIds.map((id) => BADGE_MAP[id]).filter(Boolean);
  } catch (err) {
    logger.error("evaluateBadges error:", err);
    return [];
  }
}

/**
 * Award a single specific badge to a user (idempotent).
 * Returns the badge object if newly earned, or null if already had it.
 */
async function awardBadge(userId, badgeId) {
  const badge = BADGE_MAP[badgeId];
  if (!badge) return null;
  try {
    await prisma.userBadge.create({ data: { userId, badgeId } });
    return badge;
  } catch (err) {
    if (err.code === "P2002") return null; // already earned
    logger.error("awardBadge error:", err);
    return null;
  }
}

module.exports = { BADGES, BADGE_MAP, evaluateBadges, awardBadge };
