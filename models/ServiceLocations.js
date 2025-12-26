import mongoose from "mongoose";

const ServiceLocationSchema = new mongoose.Schema(
  {
    serviceLocation: [
      {
        name: { type: String, required: true }
      }
    ],
    user_id: {
      type: String,
      required: true
    },
  },
  { timestamps: true }
);

export default mongoose.model("ServiceLocation", ServiceLocationSchema);
