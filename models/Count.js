import mongoose from "mongoose";

const countSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    count: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Count = mongoose.model("Count", countSchema);
export default Count;
