const mongoose = require("mongoose");

const Booking = require("../models/Booking");
const Resource = require("../models/Resource");
const Ticket = require("../models/Ticket");


class BookingError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}


const isValidId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};


const validateBookingTime = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (
        !startTime ||
        !endTime ||
        isNaN(start.getTime()) ||
        isNaN(end.getTime())
    ) {
        throw new BookingError("Invalid booking date or time", 400);
    }

    if (end <= start) {
        throw new BookingError(
            "End time must be after start time",
            400
        );
    }

    const duration = (end - start) / (1000 * 60);

    if (duration < 30 || duration > 180) {
        throw new BookingError(
            "Booking duration must be between 30 and 180 minutes",
            400
        );
    }

    const validGrid = (date) => {
        return (
            date.getUTCSeconds() === 0 &&
            date.getUTCMilliseconds() === 0 &&
            date.getUTCMinutes() % 30 === 0
        );
    };

    if (!validGrid(start) || !validGrid(end)) {
        throw new BookingError(
            "Start and end times must follow 30-minute intervals",
            400
        );
    }

    return { start, end };
};

const createBooking = async (userId, data) => {

    const {
        resourceId,
        startTime,
        endTime,
        purpose,
        ticketId
    } = data;

    if (!resourceId || !isValidId(resourceId)) {
        throw new BookingError("Invalid resource ID", 400);
    }

    if (ticketId && !isValidId(ticketId)) {
        throw new BookingError("Invalid ticket ID", 400);
    }

    const { start, end } = validateBookingTime(
        startTime,
        endTime
    );

    if (
        typeof purpose !== "string" ||
        purpose.trim().length < 5 ||
        purpose.trim().length > 200
    ) {
        throw new BookingError(
            "Purpose is required and must be between 5 and 200 characters trimmed",
            400
        );
    }

    if (!userId || !isValidId(userId)) {
        throw new BookingError("Invalid user", 401);
    }

    const session = await mongoose.startSession();

    let createdBooking;
    try {

        await session.withTransaction(async () => {

            const resource = await Resource.findOneAndUpdate(
                { _id: resourceId },
                { $inc: { bookingLockVersion: 1 } },
                {
                    new: true,
                    session
                }
            );


            if (!resource) {
                throw new BookingError("Resource not found", 404);
            }


            if (resource.isActive === false) {
                throw new BookingError(
                    "This resource is not available for booking",
                    409
                );
            }

            if (ticketId) {
                const ticket = await Ticket.findById(ticketId)
                    .session(session);

                if (!ticket) {
                    throw new BookingError(
                        "Ticket not found",
                        404
                    );
                }

                if (ticket.userId && String(ticket.userId) !== String(userId)) {
                    throw new BookingError(
                        "You cannot link another user's ticket",
                        409
                    );
                }
            }

            const existingBooking = await Booking.findOne({
                resourceId,
                status: {
                    $in: ["PENDING", "APPROVED"]
                },

                startTime: { $lt: end },
                endTime: { $gt: start }

            }).session(session);

            if (existingBooking) {
                throw new BookingError(
                    "This resource is already booked for the selected time slot",
                    409
                );
            }

            const booking = await Booking.create(
                [
                    {
                        resourceId,
                        userId,
                        ticketId: ticketId || null,
                        startTime: start,
                        endTime: end,
                        purpose: purpose.trim(),
                        status: "PENDING",
                        decisionNote: null
                    }
                ],
                { session }
            );

            createdBooking = booking[0];

        });

        return createdBooking;

    } finally {
        await session.endSession();
    }
};

const rejectBooking = async (bookingId, rejectionNote, user) => {
    if (!bookingId || !isValidId(bookingId)) {
        throw new BookingError("Invalid booking ID", 400);
    }

    if (
        typeof rejectionNote !== "string" ||
        rejectionNote.trim().length < 5 ||
        rejectionNote.trim().length > 200
    ) {
        throw new BookingError(
            "Rejection note is required on reject, and must be 5 to 200 characters trimmed",
            400
        );
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
        throw new BookingError("Booking not found", 404);
    }

    if (booking.status !== "PENDING") {
        throw new BookingError("Only pending bookings can be rejected", 400);
    }

    booking.status = "REJECTED";
    booking.rejectionNote = rejectionNote.trim();
    booking.decisionNote = rejectionNote.trim();
    await booking.save();

    return booking;
};

const approveBooking = async (bookingId, user) => {
    if (!bookingId || !isValidId(bookingId)) {
        throw new BookingError("Invalid booking ID", 400);
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
        throw new BookingError("Booking not found", 404);
    }

    if (booking.status !== "PENDING") {
        throw new BookingError("Only pending bookings can be approved", 400);
    }

    booking.status = "APPROVED";
    await booking.save();

    return booking;
};

const getBookings = async (query = {}, user) => {
    const filter = {};
    if (user?.role !== "ADMIN") {
        filter.userId = user?._id || user?.id;
    }
    if (query.resourceId && isValidId(query.resourceId)) {
        filter.resourceId = query.resourceId;
    }
    if (query.status) {
        filter.status = query.status;
    }

    return Booking.find(filter)
        .populate("resourceId", "name type capacity")
        .populate("userId", "name email")
        .sort({ startTime: -1 })
        .lean();
};

const getBookingById = async (bookingId, user) => {
    if (!bookingId || !isValidId(bookingId)) {
        throw new BookingError("Invalid booking ID", 404);
    }

    const booking = await Booking.findById(bookingId)
        .populate("resourceId", "name type capacity")
        .populate("userId", "name email");

    if (!booking) {
        throw new BookingError("Booking not found", 404);
    }

    if (user?.role !== "ADMIN" && String(booking.userId?._id || booking.userId) !== String(user?._id || user?.id)) {
        throw new BookingError("Booking not found", 404);
    }

    return booking;
};

const cancelBooking = async (bookingId, userId) => {
    if (!bookingId || !isValidId(bookingId)) {
        throw new BookingError("Booking not found", 404);
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
        throw new BookingError("Booking not found", 404);
    }

    // Owner check: only the booking owner can cancel (403)
    const ownerId = String(booking.userId?._id || booking.userId);
    const requesterId = String(userId?._id || userId?.id || userId);

    if (ownerId !== requesterId) {
        throw new BookingError("Forbidden: only the booking owner can cancel this booking", 403);
    }

    // B10 / B11: Conflict checks (409)
    if (booking.status === "CANCELLED") {
        throw new BookingError("Booking is already cancelled", 409);
    }

    if (booking.status === "REJECTED") {
        throw new BookingError("Cannot cancel a rejected booking", 409);
    }

    const now = new Date();
    if (new Date(booking.startTime) <= now) {
        throw new BookingError("Cannot cancel a booking that has already started", 409);
    }

    booking.status = "CANCELLED";
    await booking.save();

    return booking;
};

module.exports = {
    createBooking,
    rejectBooking,
    approveBooking,
    cancelBooking,
    getBookings,
    getBookingById,
    BookingError
};
