const express = require("express");

const router = express.Router();

const {
    createBookingController,
    getMyBookings,
    getBookingsController,
    getBookingByIdController,
    rejectBookingController,
    approveBookingController,
    cancelBookingController
} = require("../controller/bookingController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.use(authMiddleware);

router.post("/", createBookingController);
router.get("/mine", getMyBookings);
router.get("/", getBookingsController);
router.get("/:id", getBookingByIdController);
router.patch("/:id/cancel", cancelBookingController);
router.patch("/:id/reject", roleMiddleware("ADMIN"), rejectBookingController);
router.patch("/:id/approve", roleMiddleware("ADMIN"), approveBookingController);

module.exports = router;
