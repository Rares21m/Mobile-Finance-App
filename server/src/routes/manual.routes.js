const { Router } = require("express");
const authMiddleware = require("../middleware/auth");
const {
  listManual,
  createManual,
  updateManual,
  deleteManual,
  upsertCategoryOverride,
  deleteCategoryOverride,
} = require("../controllers/manual.controller");

const router = Router();
router.use(authMiddleware);

// Manual transactions
router.get("/", listManual);
router.post("/", createManual);
router.patch("/:id", updateManual);
router.delete("/:id", deleteManual);

// Category overrides (PUT before DELETE to avoid route conflict with :id)
router.put("/category-override", upsertCategoryOverride);
router.delete("/category-override/:transactionId", deleteCategoryOverride);

module.exports = router;
