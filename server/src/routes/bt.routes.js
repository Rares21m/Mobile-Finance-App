const { Router } = require("express");
const authMiddleware = require("../middleware/auth");
const {
    registerClient,
    initConsent,
    exchangeToken,
    getAccounts,
    getTransactions,
    getBalances,
    getUserConnections,
    getConnectionData,
} = require("../controllers/bt.controller");

const router = Router();

// All BT routes require authentication
router.use(authMiddleware);

// GET /api/bt/connections — list active connections for the logged-in user
router.get("/connections", getUserConnections);

// POST /api/bt/register-client
router.post("/register-client", registerClient);

// POST /api/bt/init-consent
router.post("/init-consent", initConsent);

// POST /api/bt/exchange-token
router.post("/exchange-token", exchangeToken);

// GET /api/bt/connection-data/:connectionId — combined: accounts + balances + transactions (single token refresh)
router.get("/connection-data/:connectionId", getConnectionData);

// GET /api/bt/accounts/:connectionId
router.get("/accounts/:connectionId", getAccounts);

// GET /api/bt/balances/:connectionId/:accountId
router.get("/balances/:connectionId/:accountId", getBalances);

// GET /api/bt/transactions/:connectionId/:accountId
router.get("/transactions/:connectionId/:accountId", getTransactions);

module.exports = router;
