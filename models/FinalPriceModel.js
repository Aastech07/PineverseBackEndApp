// models/FinalPriceModel.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const transactionSchema = new Schema({
  senderId: { type: String, required: true, trim: true },
  receiverId: { type: String, required: true, trim: true },
  finalPrice: { type: Number, required: true, min: [0, "finalPrice must be >= 0"] },
  ActiveStatus: {
    type: String,
    enum: ['Negotiate', 'Accept', 'none'],
    default: 'none'
  },
  meta: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

// useful index to quickly find latest by sender+receiver
transactionSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });

const Transaction = mongoose.models?.Transaction || mongoose.model("Transaction", transactionSchema);

export default Transaction;
