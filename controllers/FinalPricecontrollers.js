// controllers/transactionController.js
import mongoose from "mongoose";
import Transaction from "../models/FinalPriceModel.js";

/**
 * Create a new transaction
 */
export const createTransaction = async (req, res) => {
  try {
    const { senderId, receiverId, finalPrice, meta, ActiveStatus } = req.body ?? {};

    if (!senderId || !receiverId || finalPrice === undefined) {
      return res.status(400).json({ error: "senderId, receiverId and finalPrice are required" });
    }

    // Validate numeric finalPrice
    const priceNum = Number(finalPrice);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({ error: "finalPrice must be a non-negative number" });
    }

    const tx = new Transaction({
      senderId,
      receiverId,
      finalPrice: priceNum,
      meta: meta ?? {},
      ActiveStatus: ActiveStatus ?? undefined,
    });

    const saved = await tx.save();
    return res.status(201).json(saved);
  } catch (err) {
    console.error("createTransaction error:", err);
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Update a transaction.
 * Supports:
 *  - PUT/PATCH /transactions/:id  -> update by id
 *  - POST /transactions/update with senderId + receiverId in body -> updates latest doc for that pair
 */
export const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params ?? {};
    const { senderId, receiverId } = req.body ?? {};

    // Allowed updatable fields
    const allowed = ["finalPrice", "meta", "ActiveStatus"];
    const updates = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No updatable fields provided (allowed: finalPrice, meta, ActiveStatus)" });
    }

    if (updates.finalPrice !== undefined) {
      const p = Number(updates.finalPrice);
      if (Number.isNaN(p) || p < 0) {
        return res.status(400).json({ error: "finalPrice must be a non-negative number" });
      }
      updates.finalPrice = p;
    }

    let updated = null;

    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid transaction id" });
      }
      updated = await Transaction.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    } else {
      // require senderId + receiverId if id not provided
      if (!senderId || !receiverId) {
        return res.status(400).json({ error: "Provide either transaction id (param) OR senderId and receiverId in body" });
      }

      // find the most recent transaction for this pair and update it
      const filter = { senderId, receiverId };
      const doc = await Transaction.findOne(filter).sort({ createdAt: -1 });
      if (!doc) {
        return res.status(404).json({ error: "No transaction found for this senderId + receiverId" });
      }
      updated = await Transaction.findByIdAndUpdate(doc._id, updates, { new: true, runValidators: true });
    }

    if (!updated) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    return res.json(updated);
  } catch (err) {
    console.error("updateTransaction error:", err);
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};



/**
 * List transactions with optional pagination & filters
 * Query params: page, limit, senderId, receiverId
 */
export const listTransactions = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || "20", 10)));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.senderId) filter.senderId = req.query.senderId;
    if (req.query.receiverId) filter.receiverId = req.query.receiverId;

    const [items, total] = await Promise.all([
      Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Transaction.countDocuments(filter),
    ]);

    return res.json({
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      items,
    });
  } catch (err) {
    console.error("listTransactions error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Delete transaction by id
 */
export const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params ?? {};
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid transaction id" });
    }
    const removed = await Transaction.findByIdAndDelete(id);
    if (!removed) return res.status(404).json({ error: "Transaction not found" });
    return res.json({ message: "Transaction deleted", id: removed._id });
  } catch (err) {
    console.error("deleteTransaction error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Get latest finalPrice by senderId + receiverId
 * Accepts senderId/receiverId in body (POST) or query (GET)
 */
export const getPriceBySenderReceiver = async (req, res) => {
  try {
    const senderId = req.body?.senderId ?? req.query?.senderId;
    const receiverId = req.body?.receiverId ?? req.query?.receiverId;

    if (!senderId || !receiverId) {
      return res.status(400).json({ error: "senderId and receiverId are required" });
    }

    // Include meta in projection { finalPrice:1, ActiveStatus:1, meta:1 }
    const tx = await Transaction.findOne(
      { senderId, receiverId },
      { finalPrice: 1, ActiveStatus: 1, meta: 1 }  // <-- META ADDED HERE
    ).sort({ createdAt: -1 });

    if (!tx) {
      return res.status(404).json({ error: "No transaction found for given senderId & receiverId" });
    }

    return res.json({
      senderId,
      receiverId,
      finalPrice: tx.finalPrice,
      ActiveStatus: tx.ActiveStatus ?? "none",
      meta: tx.meta ?? {}   // <-- META RETURNED
    });
  } catch (err) {
    console.error("getPriceBySenderReceiver error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
