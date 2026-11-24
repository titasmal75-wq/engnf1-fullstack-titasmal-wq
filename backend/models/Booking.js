
const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
    {
        resourceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Resource",
            required: true
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        ticketId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Ticket",
            default: null
        },

        startTime: {
            type: Date,
            required: true
        },

        endTime: {
            type: Date,
            required: true
        },

        purpose: {
            type: String,
            required: true,
            trim: true,
            minlength: 5,
            maxlength: 200
        },

        status: {
            type: String,
            enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
            default: "PENDING"
        },

        rejectionNote: {
            type: String,
            default: null,
            trim: true,
            validate: {
                validator: function (value) {
                    if (this.status === "REJECTED") {
                        return typeof value === "string" && value.trim().length >= 5 && value.trim().length <= 200;
                    }
                    if (value) {
                        return value.trim().length >= 5 && value.trim().length <= 200;
                    }
                    return true;
                },
                message: "Rejection note is required on reject, and must be 5 to 200 chars trimmed"
            }
        },

        decisionNote: {
            type: String,
            default: null,
            maxlength: 500
        }
    },
    {
        timestamps: true
    }
);


bookingSchema.index({
    resourceId: 1,
    startTime: 1,
    endTime: 1,
    status: 1
});


bookingSchema.index({
    userId: 1,
    createdAt: -1
});

module.exports = mongoose.model("Booking", bookingSchema);
