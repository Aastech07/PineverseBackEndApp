import express from "express";
import {
    createBid,
    getBidsByJob,
    getBidsForUser,
    updateBidStatus,
    getJobIdsByRecipient,
    checkUserBidOnJob,
    updateActiveUserStatus,
    getAllBids,
    getBidsByRecipient
} from "../controllers/bidController.js";

const router = express.Router();

// Create bid
router.post("/createBid", createBid);

// Get all bids for a specific job
router.get("/job/:jobId", getBidsByJob);

// Get all bids received by logged-in user
router.get("/my-bids", getBidsForUser);

router.get("/getBidsByRecipient", getBidsByRecipient);

router.get("/getAllBids", getAllBids);

// Update bid status (accept/reject)
router.put("/:bidId/status", updateBidStatus);

// Get unique job IDs for a recipient
router.get("/jobs", getJobIdsByRecipient);

// Check if user has bid on a specific job
router.get("/check/:jobId/:userId", checkUserBidOnJob);

router.patch("/:bidId/active-user-status", updateActiveUserStatus);

export default router;