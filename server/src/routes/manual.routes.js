const { Router } = require("express");
const authMiddleware = require("../middleware/auth");
const {
  listManual,
  createManual,
  updateManual,
  deleteManual,
  upsertCategoryOverride,
  deleteCategoryOverride
} = require("../controllers/manual.controller");
const { withIdempotency } = require("../middleware/idempotency");

const router = Router();
router.use(authMiddleware);


router.get("/", listManual);
router.post("/", withIdempotency("manual:create"), createManual);
router.patch("/:id", withIdempotency("manual:update"), updateManual);
router.delete("/:id", withIdempotency("manual:delete"), deleteManual);


router.put(
  "/category-override",
  withIdempotency("manual:category-override"),
  upsertCategoryOverride
);
router.delete("/category-override/:transactionId", deleteCategoryOverride);

module.exports = router;