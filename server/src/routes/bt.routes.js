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
  disconnectBank
} = require("../controllers/bt.controller");

const router = Router();


router.use(authMiddleware);


router.get("/connections", getUserConnections);


router.delete("/connections/:bankName", disconnectBank);


router.post("/register-client", registerClient);


router.post("/init-consent", initConsent);


router.post("/exchange-token", exchangeToken);


router.get("/connection-data/:connectionId", getConnectionData);


router.get("/accounts/:connectionId", getAccounts);


router.get("/balances/:connectionId/:accountId", getBalances);


router.get("/transactions/:connectionId/:accountId", getTransactions);

module.exports = router;