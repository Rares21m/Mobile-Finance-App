const prisma = require("../config/db");
const logger = require("../config/logger");
const { rebuildMonthlySummariesForUser } = require("../services/monthlySummary.service");
const {
  DEMO_BANK_NAME,
  buildAccounts,
  getShiftedDataset,
  mapDbTransaction,
  normalizedCategory,
  toTransactionCreate
} = require("../services/demoBank.service");

function dateOnly(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function buildDemoImport(now = new Date()) {
  const shiftedRows = getShiftedDataset(now);
  const importRows = shiftedRows.filter(
    (row) => normalizedCategory(row.Category) !== "transfer"
  );

  return {
    shiftedRows,
    importRows,
    latestShiftedDate: shiftedRows[shiftedRows.length - 1]?.shiftedDate || null,
    latestImportedDate: importRows[importRows.length - 1]?.shiftedDate || null,
    transfersExcluded: shiftedRows.length - importRows.length
  };
}

async function replaceDemoTransactions(tx, connectionId, importRows) {
  await tx.transaction.deleteMany({
    where: { bankConnectionId: connectionId }
  });

  const transactions = importRows.map((row) =>
    toTransactionCreate(row, connectionId)
  );

  if (transactions.length > 0) {
    await tx.transaction.createMany({
      data: transactions,
      skipDuplicates: true
    });
  }

  return transactions.length;
}

async function connectDemoBank(req, res) {
  try {
    const userId = req.userId;

    const demoImport = buildDemoImport();

    const { connection, transactionsImported } = await prisma.$transaction(async (tx) => {
      await tx.bankConnection.deleteMany({
        where: {
          userId,
          bankName: DEMO_BANK_NAME
        }
      });

      const createdConnection = await tx.bankConnection.create({
        data: {
          userId,
          bankName: DEMO_BANK_NAME,
          status: "active",
          consentId: "demo-consent"
        }
      });

      const importedCount = await replaceDemoTransactions(
        tx,
        createdConnection.id,
        demoImport.importRows
      );

      return {
        connection: createdConnection,
        transactionsImported: importedCount
      };
    });

    await rebuildMonthlySummariesForUser(userId).catch((err) => {
      logger.warn("demo_bank.monthly_summary_rebuild_failed", {
        userId,
        message: err.message
      });
    });

    return res.status(201).json({
      connectionId: connection.id,
      bankName: DEMO_BANK_NAME,
      transactionsImported,
      transfersExcluded: demoImport.transfersExcluded,
      latestTransactionDate: demoImport.latestShiftedDate,
      latestImportedTransactionDate: demoImport.latestImportedDate
    });
  } catch (err) {
    logger.error("demo_bank.connect_failed", err);
    return res.status(500).json({ error: "DEMO_BANK_CONNECT_FAILED" });
  }
}

async function getConnectionData(req, res) {
  try {
    const { connectionId } = req.params;
    const userId = req.userId;

    const connection = await prisma.bankConnection.findFirst({
      where: {
        id: connectionId,
        userId,
        bankName: DEMO_BANK_NAME,
        status: "active"
      }
    });

    if (!connection) {
      return res.status(404).json({ error: "ACTIVE_DEMO_BANK_CONNECTION_NOT_FOUND" });
    }

    let demoImport = buildDemoImport();
    let autoRefreshed = false;

    const latestStoredTransaction = await prisma.transaction.findFirst({
      where: { bankConnectionId: connectionId },
      orderBy: { bookingDate: "desc" },
      select: { bookingDate: true }
    });

    if (dateOnly(latestStoredTransaction?.bookingDate) !== demoImport.latestImportedDate) {
      await prisma.$transaction(async (tx) => {
        await replaceDemoTransactions(tx, connectionId, demoImport.importRows);
        await tx.bankConnection.update({
          where: { id: connectionId },
          data: { updatedAt: new Date() }
        });
      });
      autoRefreshed = true;
    }

    const shiftedRows = demoImport.shiftedRows;
    const accounts = buildAccounts(shiftedRows).map((account) => ({
      ...account,
      connectionId
    }));

    const dbTransactions = await prisma.transaction.findMany({
      where: { bankConnectionId: connectionId },
      orderBy: { bookingDate: "desc" }
    });

    const transactions = dbTransactions.map(mapDbTransaction);
    const lastSyncAt = new Date().toISOString();

    return res.json({
      accounts,
      transactions,
      metadata: {
        lastSyncAt,
        dataMayBeOutdated: false,
        healthState: "connected",
        sourceHints: {
          labels: ["demo"],
          lastUpdatedAt: lastSyncAt,
          shiftedLatestTransactionTo: demoImport.latestShiftedDate,
          shiftedLatestImportedTransactionTo: demoImport.latestImportedDate,
          originalDatasetRows: shiftedRows.length,
          transfersExcluded: demoImport.transfersExcluded,
          autoRefreshed
        }
      },
      connection: {
        id: connection.id,
        bankName: connection.bankName,
        status: connection.status,
        updatedAt: connection.updatedAt
      }
    });
  } catch (err) {
    logger.error("demo_bank.connection_data_failed", err);
    return res.status(500).json({ error: "DEMO_BANK_GET_CONNECTION_DATA_FAILED" });
  }
}

async function disconnectDemoBank(req, res) {
  try {
    const deleted = await prisma.bankConnection.deleteMany({
      where: {
        userId: req.userId,
        bankName: DEMO_BANK_NAME
      }
    });

    await rebuildMonthlySummariesForUser(req.userId).catch((err) => {
      logger.warn("demo_bank.monthly_summary_rebuild_failed", {
        userId: req.userId,
        message: err.message
      });
    });

    if (deleted.count === 0) {
      return res.status(404).json({ error: "CONNECTION_NOT_FOUND" });
    }

    return res.json({
      message: "Demo Bank disconnected successfully",
      count: deleted.count
    });
  } catch (err) {
    logger.error("demo_bank.disconnect_failed", err);
    return res.status(500).json({ error: "DEMO_BANK_DISCONNECT_FAILED" });
  }
}

module.exports = {
  connectDemoBank,
  disconnectDemoBank,
  getConnectionData
};
