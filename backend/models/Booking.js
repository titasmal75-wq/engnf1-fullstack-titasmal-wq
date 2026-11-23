
import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({


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
    },

    purpose: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },


    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
      default: "PENDING",
      required: true,
    },

    rejectionReason: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);


bookingSchema.pre("validate", function () {
  if (!this.startTime || !this.endTime) {
    return;
  }

  const start = this.startTime.getTime();
  const end = this.endTime.getTime();

  if (end <= start) {
    this.invalidate("endTime", "End time must be after start time.");
    return;
  }

  const durationMinutes = (end - start) / (1000 * 60);

  if (durationMinutes < 30 || durationMinutes > 180) {
    this.invalidate(
      "endTime",
      "Booking duration must be between 30 and 180 minutes."
    );
  }

  const isOnGrid = (date) =>
    date.getUTCMinutes() % 30 === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0;

  if (!isOnGrid(this.startTime) || !isOnGrid(this.endTime)) {
    this.invalidate(
      "startTime",
      "Booking times must align with a 30-minute UTC grid."
    );
  }
});


bookingSchema.index({
  resourceId: 1,
  startTime: 1,
  endTime: 1,
  status: 1,
});

bookingSchema.index({ userId: 1, createdAt: -1 });


module.exports = mongoose.model("Booking" , bookingSchema);