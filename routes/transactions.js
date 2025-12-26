// routes/transactions.js
import express from "express";
import {

  listTransactions,
  deleteTransaction,
  createTransaction,
  getPriceBySenderReceiver,
  updateTransaction
} from "../controllers/FinalPricecontrollers.js";

const router = express.Router();

// Create
router.post("/createTransaction", createTransaction);

// List / filter
router.get("/", listTransactions);

// Get single

// Update partial/full
router.put("/updateTransaction", updateTransaction);

// Delete
router.delete("/:id", deleteTransaction);

router.post("/getPriceBySenderReceiver", getPriceBySenderReceiver);


export default router;
