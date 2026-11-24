const Booking = require("../models/Booking");
const {
    createBooking,
    rejectBooking,
    approveBooking,
    cancelBooking,
    getBookings,
    getBookingById,
    BookingError
} = require("../services/bookingService");

const createBookingController = async (req, res) => {
    try {
        const userId =
            req.user?._id ||
            req.user?.id ||
            req.session?.user?._id ||
            req.session?.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Please login first"
            });
        }

        const booking = await createBooking(userId, req.body);

        return res.status(201).json({
            success: true,
            message: "Booking created successfully",
            booking,
            data: booking
        });

    } catch (error) {
        if (error instanceof BookingError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }

        console.error("Create booking error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getMyBookings = async (req, res) => {
    try {
        const userId =
            req.user?._id ||
            req.user?.id ||
            req.session?.user?._id ||
            req.session?.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Please login first"
            });
        }

        const { status, page = "1" } = req.query;

        if (!/^[1-9]\d*$/.test(String(page))) {
            return res.status(400).json({
                success: false,
                message: "Invalid page number"
            });
        }

        const pageNumber = Number(page);

        const allowedStatuses = [
            "PENDING",
            "APPROVED",
            "REJECTED",
            "CANCELLED"
        ];

        if (status && !allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking status"
            });
        }

        const limit = 10;
        const skip = (pageNumber - 1) * limit;

        const filter = { userId };
        if (status) {
            filter.status = status;
        }

        const [bookings, totalBookings] = await Promise.all([
            Booking.find(filter)
                .populate("resourceId")
                .populate("ticketId")
                .sort({ createdAt: -1, _id: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            Booking.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            message: "My bookings fetched successfully",
            pagination: {
                currentPage: pageNumber,
                limit,
                totalBookings,
                totalPages: Math.ceil(totalBookings / limit)
            },
            bookings,
            data: bookings
        });

    } catch (error) {
        console.error("Get my bookings error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getBookingsController = async (req, res) => {
    try {
        const bookings = await getBookings(req.query, req.user);
        return res.status(200).json({
            success: true,
            data: bookings,
            bookings
        });
    } catch (error) {
        if (error instanceof BookingError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getBookingByIdController = async (req, res) => {
    try {
        const booking = await getBookingById(req.params.id, req.user);
        return res.status(200).json({
            success: true,
            data: booking,
            booking
        });
    } catch (error) {
        if (error instanceof BookingError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const rejectBookingController = async (req, res) => {
    try {
        const note = req.body.rejectionNote || req.body.decisionNote;
        const booking = await rejectBooking(req.params.id, note, req.user);

        return res.status(200).json({
            success: true,
            message: "Booking rejected successfully",
            booking,
            data: booking
        });
    } catch (error) {
        if (error instanceof BookingError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const approveBookingController = async (req, res) => {
    try {
        const booking = await approveBooking(req.params.id, req.user);

        return res.status(200).json({
            success: true,
            message: "Booking approved successfully",
            booking,
            data: booking
        });
    } catch (error) {
        if (error instanceof BookingError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


const cancelBookingController = async (req, res) => {
    try {
        const userId =
            req.user?._id ||
            req.user?.id ||
            req.session?.user?._id ||
            req.session?.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Please login first"
            });
        }

        const booking = await cancelBooking(req.params.id, userId);

        return res.status(200).json({
            success: true,
            message: "Booking cancelled successfully",
            booking,
            data: booking
        });
    } catch (error) {
        if (error instanceof BookingError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }

        console.error("Cancel booking error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = {
    createBookingController,
    getMyBookings,
    getBookingsController,
    getBookingByIdController,
    rejectBookingController,
    approveBookingController,
    cancelBookingController
};
