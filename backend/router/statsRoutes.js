const express = require("express");
const router = express.Router();

const {
    getTicketStats
} = require("../controller/statsController");

const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, getTicketStats);

module.exports = router;
