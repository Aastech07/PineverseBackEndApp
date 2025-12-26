import express from "express";
import { addReview, getAllReviews } from "../controllers/reviewController.js";

const router = express.Router();

// ✅ POST -> Add Review
router.post("/reviews", addReview);
// ✅ GET -> Get all reviews or by user_id
// Example: /api/reviews   OR   /api/reviews?user_id=abc123
router.get("/reviews", getAllReviews);

export default router;
