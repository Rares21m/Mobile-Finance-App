const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { getBadges, evaluate } = require("../controllers/badges.controller");

router.use(auth);
router.get("/", getBadges);
router.post("/evaluate", evaluate);

module.exports = router;
