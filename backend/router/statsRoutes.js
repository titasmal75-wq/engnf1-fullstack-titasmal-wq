const express = require("express");
const router = express.Router();

const {
    getTicketStats,
    getAdminStats
} = require("../controller/statsController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.get("/", authMiddleware, getTicketStats);
router.get("/admin", authMiddleware, roleMiddleware("ADMIN"), getAdminStats);

module.exports = router;
