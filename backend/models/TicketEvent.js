
const mongoose = require("mongoose");

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
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

ticketEventSchema.index({
  ticketId: 1,
  createdAt: -1,
});

module.exports = mongoose.model("TicketEvent" , ticketEventSchema);

