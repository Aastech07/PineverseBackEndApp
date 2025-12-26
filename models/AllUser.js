import mongoose from "mongoose";

const activeAllUserSchema = new mongoose.Schema(
  {
    ServiceLocations: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceLocation",
      required: true
    },
    isActive: { type: Boolean, default: true },
    loginAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

activeAllUserSchema.index({ ServiceLocations: 1, isActive: 1 }); // helpful for filters

export default mongoose.model("ActiveAllUser", activeAllUserSchema);
