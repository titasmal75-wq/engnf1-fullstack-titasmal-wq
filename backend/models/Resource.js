
const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 60,
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
      max: 500,
      validate: {
        validator: Number.isInteger,
        message: "Capacity must be an integer between 1 and 500",
      },
    },

    description: {
      type: String,
      default: null,
      trim: true,
      maxlength: 300,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
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
