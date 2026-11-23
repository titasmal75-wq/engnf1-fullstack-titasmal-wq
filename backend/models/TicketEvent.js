
import mongoose from "mongoose";

const ticketEventSchema = new mongoose.Schema(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      required: true,
      index: true,
    },

    field: {
      type: String,
      enum: [
        "category",
        "priority",
        "status",
        "assigneeId",
        "subject",
        "body",
      ],
      required: true,
    },

    oldValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

ticketEventSchema.index({ ticketId: 1, createdAt: -1 });

module.exports = mongoose.model("TicketEvent" , ticketEventSchema);