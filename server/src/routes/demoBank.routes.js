const { Router } = require("express");
const authMiddleware = require("../middleware/auth");
const {
  connectDemoBank,
  disconnectDemoBank,
  getConnectionData
} = require("../controllers/demoBank.controller");

const router = Router();

router.use(authMiddleware);

router.post("/connect", connectDemoBank);
router.get("/connection-data/:connectionId", getConnectionData);
router.delete("/connections/:bankName", disconnectDemoBank);

module.exports = router;
