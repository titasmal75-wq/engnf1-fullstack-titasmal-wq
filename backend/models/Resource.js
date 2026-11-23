
import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    type: {
      type: String,
      enum: ["ROOM",   "LAB", "EQUIPMENT"],
      required: true,
    },


    capacity: {
      type: Number,
      required: true,
      min: 1,
    },


    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
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

resourceSchema.index({ type: 1, isActive: 1 });




module.exports = mongoose.model("Resource" , resourceSchema);