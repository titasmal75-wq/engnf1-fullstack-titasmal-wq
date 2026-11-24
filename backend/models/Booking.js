
const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resource",
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      default: null,
    },

    startTime: {
      type: Date,
      required: true,
    },

    endTime: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value > this.startTime;
        },
        message: "endTime must be after startTime",
      },
    },

    purpose: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 200,
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
      default: "PENDING",
      required: true,
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
          if (value !== null && value !== undefined && value !== "") {
            return typeof value === "string" && value.trim().length >= 5 && value.trim().length <= 200;
          }
          return true;
        },
        message: "Rejection note is required on reject, and must be 5 to 200 chars trimmed",
      },
    },
  },
  {
    timestamps: true,
  }
);

bookingSchema.index({
  resourceId: 1,
  startTime: 1,
  endTime: 1,
});

bookingSchema.index({ userId: 1 });
bookingSchema.index({ status: 1 });

module.exports = mongoose.model("Booking", bookingSchema);

