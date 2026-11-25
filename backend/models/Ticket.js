
const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    externalId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    body: {
      type: String,
      required: true,
      maxlength: 10000,
    },

    autoCategory: {
      type: String,
      enum: [
        "BILLING",
        "LOGIN",
        "DELIVERY",
        "BUG",
        "FEATURE_REQUEST",
      ],
      required: true,
    },

    category: {
      type: String,
      enum: [
        "BILLING",
        "LOGIN",
        "DELIVERY",
        "BUG",
        "FEATURE_REQUEST",
      ],
      required: true,
    },

    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      required: true,
      default: "MEDIUM",
    },

    status: {
      type: String,
      enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"],
      default: "OPEN",
      required: true,
    },

    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    isReviewed: {
      type: Boolean,
      default: false,
    },

    isHumanOverride: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

ticketSchema.index({ status: 1, createdAt: -1 });
ticketSchema.index({ category: 1, priority: 1 });
ticketSchema.index({ assigneeId: 1 });
ticketSchema.index({ createdAt: -1 });

ticketSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Ticket" , ticketSchema);