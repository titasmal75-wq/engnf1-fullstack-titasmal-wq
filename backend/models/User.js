
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false, 
    },

    role: {
      type: String,
      enum: ["USER", "ADMIN"],
      default: "USER",
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

userSchema.index(
  { email: 1 },
  {
    unique: true,
    collation: { locale: "en", strength: 2 },
  }
);

module.exports = mongoose.model("User" , userSchema);
