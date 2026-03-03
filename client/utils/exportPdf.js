/**
 * @fileoverview PDF report generation for Novence.
 * Builds an HTML financial report and converts it to a shareable PDF
 * using expo-print and expo-sharing.
 */

import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { categorizeTransaction } from "./categoryUtils";

// ─── Category emoji map ────────────────────────────────────────────────────────
const CAT_EMOJI = {
  food: "🍽️",
  transport: "🚗",
  shopping: "🛒",
  utilities: "⚡",
  housing: "🏠",
  entertainment: "🎭",
  health: "💊",
  transfer: "💸",
  salary: "💼",
  other: "●",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) =>
  Number(n).toLocaleString("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * Generate and share a PDF financial report.
 *
 * @param {object} params
 * @param {Array}   params.filteredTx        Transactions in the selected period
 * @param {Array}   params.categoryData       getCategoryBreakdown() result
 * @param {number}  params.totalIncome        Income total
 * @param {number}  params.totalExpenses      Expenses total
 * @param {object}  params.spendingInsights   spendingInsights memo (can be null)
 * @param {Array}   params.budgetSummary      getBudgetSummary() result (can be [])
 * @param {string}  params.periodLabel        Human-readable period label
 * @param {object}  params.labels             Pre-translated label strings
 */
export async function exportFinancialReport({
  filteredTx,
  categoryData,
  totalIncome,
  totalExpenses,
  spendingInsights,
  budgetSummary,
  periodLabel,
  labels,
}) {
  const now = new Date();
  const generatedAt = now.toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const net = totalIncome - totalExpenses;
  const savingsRate =
    totalIncome > 0 ? ((net / totalIncome) * 100).toFixed(1) : "0.0";

  // ── Category rows ──────────────────────────────────────────────────────────
  const categoryRows = categoryData
    .map((cat) => {
      const emoji = CAT_EMOJI[cat.key] || "●";
      const barPct = Math.min(cat.percentage, 100);
      return `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;">
            ${emoji} <strong>${labels.categories?.[cat.key] || cat.key}</strong>
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;">
            ${fmt(cat.total)} RON
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;width:140px;">
            <div style="background:#eee;border-radius:4px;height:8px;margin-bottom:3px;">
              <div style="background:${cat.color};width:${barPct}%;height:8px;border-radius:4px;"></div>
            </div>
            <span style="font-size:11px;color:#888;">${cat.percentage}%</span>
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;text-align:center;color:#888;font-size:13px;">
            ${cat.count}
          </td>
        </tr>`;
    })
    .join("");

  // ── Budget section ─────────────────────────────────────────────────────────
  let budgetSection = "";
  const activeBudgets = (budgetSummary || []).filter((b) => b.limit);
  if (activeBudgets.length > 0) {
    const budgetRows = activeBudgets
      .map((b) => {
        const pct = Math.min(b.percentage, 100);
        const statusColor =
          b.status === "over"
            ? "#F43F5E"
            : b.status === "warning"
              ? "#F59E0B"
              : "#22C55E";
        const emoji = CAT_EMOJI[b.key] || "●";
        const remaining = Math.max(b.limit - b.spent, 0);
        return `
          <tr>
            <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;">
              ${emoji} ${labels.categories?.[b.key] || b.key}
            </td>
            <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;text-align:right;">${fmt(b.spent)} RON</td>
            <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;text-align:right;">${fmt(b.limit)} RON</td>
            <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;text-align:right;color:#22C55E;font-weight:600;">${fmt(remaining)} RON</td>
            <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;width:120px;">
              <div style="background:#eee;border-radius:4px;height:8px;margin-bottom:3px;">
                <div style="background:${statusColor};width:${pct}%;height:8px;border-radius:4px;"></div>
              </div>
              <span style="font-size:11px;color:${statusColor};font-weight:600;">${b.percentage}%</span>
            </td>
          </tr>`;
      })
      .join("");

    budgetSection = `
      <div style="margin-top:28px;">
        <h2>${labels.budgetTitle || "Budget"}</h2>
        <table>
          <thead>
            <tr>
              <th>${labels.category || "Category"}</th>
              <th style="text-align:right">${labels.spent || "Spent"}</th>
              <th style="text-align:right">${labels.limit || "Limit"}</th>
              <th style="text-align:right">${labels.remaining || "Remaining"}</th>
              <th>${labels.progress || "Progress"}</th>
            </tr>
          </thead>
          <tbody>${budgetRows}</tbody>
        </table>
      </div>`;
  }

  // ── Transaction rows ───────────────────────────────────────────────────────
  const txSorted = [...filteredTx].sort(
    (a, b) => new Date(b.bookingDate) - new Date(a.bookingDate),
  );

  const txRows = txSorted
    .map((tx) => {
      const amount = parseFloat(tx.transactionAmount?.amount || 0);
      const isExpense = amount < 0;
      const cat = categorizeTransaction(tx);
      const emoji = CAT_EMOJI[cat.key] || "●";
      const merchant =
        (isExpense ? tx.creditorName : tx.debtorName) ||
        tx.remittanceInformationUnstructured ||
        "—";
      const date = tx.bookingDate || tx.valueDate || "";
      return `
        <tr>
          <td style="padding:7px 6px;border-bottom:1px solid #f5f5f5;font-size:12px;color:#666;white-space:nowrap;">${date}</td>
          <td style="padding:7px 6px;border-bottom:1px solid #f5f5f5;font-size:12px;max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${merchant}</td>
          <td style="padding:7px 6px;border-bottom:1px solid #f5f5f5;font-size:12px;color:#666;white-space:nowrap;">${emoji} ${labels.categories?.[cat.key] || cat.key}</td>
          <td style="padding:7px 6px;border-bottom:1px solid #f5f5f5;font-size:12px;text-align:right;font-weight:600;white-space:nowrap;color:${isExpense ? "#E11D48" : "#16a34a"};">${isExpense ? "−" : "+"}${fmt(Math.abs(amount))}</td>
          <td style="padding:7px 6px;border-bottom:1px solid #f5f5f5;font-size:11px;color:#aaa;">RON</td>
        </tr>`;
    })
    .join("");

  // ── Full HTML ──────────────────────────────────────────────────────────────
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 36px; font-size: 14px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 18px; border-bottom: 2.5px solid #10B981; }
    .app-name { font-size: 28px; font-weight: 900; color: #10B981; letter-spacing: -0.5px; }
    .app-subtitle { color: #888; font-size: 13px; margin-top: 3px; }
    .report-meta { text-align: right; color: #888; font-size: 12px; line-height: 1.7; }
    .summary { display: flex; gap: 12px; margin-bottom: 24px; }
    .card { flex: 1; padding: 16px 18px; border-radius: 12px; }
    .card .lbl { font-size: 11px; font-weight: 600; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.6px; }
    .card .amt { font-size: 19px; font-weight: 800; }
    .card .cur { font-size: 12px; font-weight: 400; margin-left: 3px; color: inherit; opacity: 0.7; }
    .c-income { background: #f0fdf4; border: 1px solid #bbf7d0; }
    .c-income .lbl { color: #15803d; } .c-income .amt { color: #16a34a; }
    .c-expense { background: #fff1f2; border: 1px solid #fecdd3; }
    .c-expense .lbl { color: #be123c; } .c-expense .amt { color: #e11d48; }
    .c-net { background: #f0f9ff; border: 1px solid #bae6fd; }
    .c-net .lbl { color: #0369a1; } .c-net .amt { color: #0284c7; }
    .insights { display: flex; gap: 10px; margin-bottom: 24px; }
    .ib { flex: 1; background: #f8f9fa; border-radius: 10px; padding: 12px 14px; border: 1px solid #eee; }
    .ib .t { font-size: 11px; color: #999; margin-bottom: 4px; font-weight: 500; }
    .ib .v { font-size: 15px; font-weight: 700; color: #1a1a2e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    h2 { color: #10B981; font-size: 15px; font-weight: 700; margin-bottom: 12px; border-left: 4px solid #10B981; padding-left: 10px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #f9fafb; }
    th { padding: 9px 8px; text-align: left; color: #999; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; border-bottom: 1px solid #eee; }
    .footer { margin-top: 36px; padding-top: 14px; border-top: 1px solid #eee; text-align: center; font-size: 11px; color: #bbb; }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div>
      <div class="app-name">Novence</div>
      <div class="app-subtitle">${labels.reportTitle || "Financial Report"}</div>
    </div>
    <div class="report-meta">
      <div><strong>${labels.period || "Period"}:</strong> ${periodLabel}</div>
      <div><strong>${labels.generatedAt || "Generated"}:</strong> ${generatedAt}</div>
    </div>
  </div>

  <!-- Summary cards -->
  <div class="summary">
    <div class="card c-income">
      <div class="lbl">▲ ${labels.income || "Income"}</div>
      <div class="amt">+${fmt(totalIncome)}<span class="cur">RON</span></div>
    </div>
    <div class="card c-expense">
      <div class="lbl">▼ ${labels.expenses || "Expenses"}</div>
      <div class="amt">−${fmt(totalExpenses)}<span class="cur">RON</span></div>
    </div>
    <div class="card c-net">
      <div class="lbl">= ${labels.net || "Net"}</div>
      <div class="amt" style="color:${net >= 0 ? "#16a34a" : "#e11d48"}">${net >= 0 ? "+" : ""}${fmt(net)}<span class="cur">RON</span></div>
    </div>
  </div>

  <!-- Spending insights -->
  ${
    spendingInsights
      ? `<div class="insights">
    <div class="ib">
      <div class="t">${labels.avgDaily || "Daily avg"}</div>
      <div class="v">${spendingInsights.avgDaily.toFixed(0)} RON</div>
    </div>
    ${
      spendingInsights.topMerchant
        ? `<div class="ib">
      <div class="t">${labels.topMerchant || "Top merchant"}</div>
      <div class="v">${spendingInsights.topMerchant}</div>
    </div>`
        : ""
    }
    <div class="ib">
      <div class="t">${labels.savingsRate || "Savings rate"}</div>
      <div class="v" style="color:${net >= 0 ? "#16a34a" : "#e11d48"}">${savingsRate}%</div>
    </div>
  </div>`
      : ""
  }

  <!-- Category breakdown -->
  ${
    categoryData.length > 0
      ? `<div style="margin-bottom:28px;">
    <h2>${labels.byCategory || "By category"}</h2>
    <table>
      <thead><tr>
        <th>${labels.category || "Category"}</th>
        <th style="text-align:right">${labels.amount || "Amount"}</th>
        <th style="width:150px">${labels.share || "Share"}</th>
        <th style="text-align:center">#</th>
      </tr></thead>
      <tbody>${categoryRows}</tbody>
    </table>
  </div>`
      : ""
  }

  <!-- Budget summary -->
  ${budgetSection}

  <!-- Transactions -->
  ${
    txSorted.length > 0
      ? `<div style="margin-top:28px;">
    <h2>${labels.transactionsTitle || "Transactions"} (${txSorted.length})</h2>
    <table>
      <thead><tr>
        <th>${labels.date || "Date"}</th>
        <th>${labels.merchant || "Merchant"}</th>
        <th>${labels.category || "Category"}</th>
        <th style="text-align:right">${labels.amount || "Amount"}</th>
        <th></th>
      </tr></thead>
      <tbody>${txRows}</tbody>
    </table>
  </div>`
      : ""
  }

  <div class="footer">Novence Financial Report &bull; ${generatedAt}</div>
</body>
</html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: "Novence Report",
    UTI: "com.adobe.pdf",
  });
}
