const express = require("express");
const protect = require("../middleware/authMiddleware");
const {
    importTickets,
    getTickets,
    getTicketById,
    updateTicket,
} = require("../controller/ticketController");

const router = express.Router();


router.use(protect);

router.post("/import", importTickets);
router.get("/", getTickets);
router.get("/:id", getTicketById);
router.patch("/:id", updateTicket);

module.exports = router;
