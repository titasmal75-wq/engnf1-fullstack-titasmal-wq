
const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["ROOM", "LAB", "EQUIPMENT"],
      required: true,
    },

    capacity: {
      type: Number,
      required: true,
      min: 1,
    },

    description: {
      type: String,
      default: null,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);


resourceSchema.index(
  { name: 1 },
  {
    unique: true,
    collation: { locale: "en", strength: 2 },
  }
);



module.exports = mongoose.model("Resource" , resourceSchema);