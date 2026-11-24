
const express = require("express");
const router = express.Router();

const {
    importTickets,
    getTickets,
    getTicketById,
    updateTicket,
    getTicketEvents
} = require("../controller/ticketController");

const authMiddleware = require("../middleware/authMiddleware");


router.post("/import", authMiddleware, importTickets);

router.get("/", authMiddleware, getTickets);

router.patch("/:id", authMiddleware, updateTicket);

router.get("/:id/events", authMiddleware, getTicketEvents);

router.get("/:id", authMiddleware, getTicketById);

module.exports = router;
