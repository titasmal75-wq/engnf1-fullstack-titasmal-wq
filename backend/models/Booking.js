
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
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

bookingSchema.index({
  resourceId: 1,
  startTime: 1,
  endTime: 1,
});

bookingSchema.index({ userId: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
