import express from "express";
import {
    createSkip,
    getSkipByUserId,
    getAllSkips,
    updateSkip,
    updateSkipField,
    deleteSkip,
    upsertSkip
} from "../controllers/SkipModelsController.js";

const router = express.Router();

// Create new skip record
router.post("/createSkip", createSkip);

// Get skip record by userId
router.get("/skiprecord/:userId", getSkipByUserId);

// Get all skip records
router.get("/", getAllSkips);

// Update skip record (full update)
router.put("/:userId", updateSkip);

// Update specific field
router.patch("/:userId/:field", updateSkipField);

// Delete skip record
router.delete("/:userId", deleteSkip);

// Create or update skip record (upsert)
router.post("/upsert", upsertSkip);

export default router;