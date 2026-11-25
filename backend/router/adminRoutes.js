const express = require("express");
const router = express.Router();

const { getAdminStats } = require("../controller/statsController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.get("/stats",
    authMiddleware,
    roleMiddleware("ADMIN"),
    getAdminStats
);

module.exports = router;
