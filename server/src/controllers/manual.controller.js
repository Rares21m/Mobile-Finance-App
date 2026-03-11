/**
 * @fileoverview Manual Transactions & Category Overrides controller.
 *
 * Routes:
 *   GET    /api/manual                        — list manual transactions + category overrides
 *   POST   /api/manual                        — create manual transaction
 *   PATCH  /api/manual/:id                    — update manual transaction (incl. category)
 *   DELETE /api/manual/:id                    — delete manual transaction
 *   PUT    /api/manual/category-override      — upsert category override on any transaction
 *   DELETE /api/manual/category-override/:transactionId — remove override
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
  "transfer",
  "salary",
  "other",
];

// ─── Manual Transactions ─────────────────────────────────────────────────────

/**
 * GET /api/manual
 * Returns all manual transactions and category overrides for the user.
 */
async function listManual(req, res) {
  try {
    const [manualTxs, overrides] = await Promise.all([
      prisma.manualTransaction.findMany({
        where: { userId: req.userId },
        orderBy: { date: "desc" },
      }),
      prisma.transactionCategoryOverride.findMany({
        where: { userId: req.userId },
      }),
    ]);

    res.json({
      transactions: manualTxs.map(formatManual),
      categoryOverrides: Object.fromEntries(
        overrides.map((o) => [o.transactionId, o.category]),
      ),
    });
  } catch (err) {
    logger.error("listManual error:", err);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
}

/**
 * POST /api/manual
 * Body: { amount, currency?, description, category, date, isExpense }
 */
async function createManual(req, res) {
  try {
    const {
      amount,
      currency = "RON",
      description,
      category = "other",
      date,
      isExpense = true,
    } = req.body;

    if (!amount || !description || !date) {
      return res
        .status(400)
        .json({ error: "AMOUNT_DESCRIPTION_DATE_REQUIRED" });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "INVALID_AMOUNT" });
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: "INVALID_CATEGORY" });
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: "INVALID_DATE" });
    }

    const tx = await prisma.manualTransaction.create({
      data: {
        userId: req.userId,
        amount: parsedAmount,
        currency,
        description,
        category,
        date: parsedDate,
        isExpense: Boolean(isExpense),
      },
    });

    const newBadges = await evaluateBadges(req.userId);
    res.status(201).json({ transaction: formatManual(tx), newBadges });
  } catch (err) {
    logger.error("createManual error:", err);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
}

/**
 * PATCH /api/manual/:id
 * Body: { amount?, currency?, description?, category?, date?, isExpense? }
 */
async function updateManual(req, res) {
  try {
    const { id } = req.params;

    const existing = await prisma.manualTransaction.findFirst({
      where: { id, userId: req.userId },
    });
    if (!existing) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    const { amount, currency, description, category, date, isExpense } =
      req.body;

    const updateData = {};
    if (amount !== undefined) {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: "INVALID_AMOUNT" });
      }
      updateData.amount = parsedAmount;
    }
    if (currency !== undefined) updateData.currency = currency;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) {
      if (!VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({ error: "INVALID_CATEGORY" });
      }
      updateData.category = category;
    }
    if (date !== undefined) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: "INVALID_DATE" });
      }
      updateData.date = parsedDate;
    }
    if (isExpense !== undefined) updateData.isExpense = Boolean(isExpense);

    const tx = await prisma.manualTransaction.update({
      where: { id },
      data: updateData,
    });

    res.json({ transaction: formatManual(tx) });
  } catch (err) {
    logger.error("updateManual error:", err);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
}

/**
 * DELETE /api/manual/:id
 */
async function deleteManual(req, res) {
  try {
    const { id } = req.params;

    const existing = await prisma.manualTransaction.findFirst({
      where: { id, userId: req.userId },
    });
    if (!existing) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    await prisma.manualTransaction.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    logger.error("deleteManual error:", err);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
}

// ─── Category Overrides ───────────────────────────────────────────────────────

/**
 * PUT /api/manual/category-override
 * Body: { transactionId, category }
 * Upserts a category override for any transaction (bank or manual).
 */
async function upsertCategoryOverride(req, res) {
  try {
    const { transactionId, category } = req.body;

    if (!transactionId || !category) {
      return res
        .status(400)
        .json({ error: "TRANSACTION_ID_CATEGORY_REQUIRED" });
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: "INVALID_CATEGORY" });
    }

    await prisma.transactionCategoryOverride.upsert({
      where: { userId_transactionId: { userId: req.userId, transactionId } },
      create: { userId: req.userId, transactionId, category },
      update: { category },
    });

    const newBadges = await evaluateBadges(req.userId);
    res.json({ success: true, transactionId, category, newBadges });
  } catch (err) {
    logger.error("upsertCategoryOverride error:", err);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
}

/**
 * DELETE /api/manual/category-override/:transactionId
 */
async function deleteCategoryOverride(req, res) {
  try {
    const { transactionId } = req.params;

    await prisma.transactionCategoryOverride.deleteMany({
      where: { userId: req.userId, transactionId },
    });

    res.json({ success: true });
  } catch (err) {
    logger.error("deleteCategoryOverride error:", err);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert a DB ManualTransaction row to the standard client transaction shape */
function formatManual(tx) {
  const amountValue = parseFloat(tx.amount);
  const signedAmount = tx.isExpense
    ? -Math.abs(amountValue)
    : Math.abs(amountValue);

  return {
    transactionId: `manual_${tx.id}`,
    transactionAmount: {
      currency: tx.currency,
      amount: signedAmount.toFixed(2),
    },
    bookingDate: tx.date.toISOString().split("T")[0],
    valueDate: tx.date.toISOString().split("T")[0],
    creditorName: tx.isExpense ? tx.description : null,
    debtorName: !tx.isExpense ? tx.description : null,
    remittanceInformationUnstructured: tx.description,
    category: tx.category,
    isManual: true,
    manualId: tx.id,
  };
}

module.exports = {
  listManual,
  createManual,
  updateManual,
  deleteManual,
  upsertCategoryOverride,
  deleteCategoryOverride,
};
