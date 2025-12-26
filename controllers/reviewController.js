import Review from "../models/ReviewModel.js";

// ✅ Add Review
export const addReview = async (req, res) => {
  try {
    const { user_id, userName, rating, comment } = req.body;

    if (!user_id || !userName || !rating || !comment) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const review = new Review({ user_id, userName, rating, comment });
    await review.save();

    res.status(201).json({
      message: "Review added successfully",
      review,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Get Reviews (Optionally filter by user_id)
export const getAllReviews = async (req, res) => {
  try {
    const { user_id } = req.query; // optional query param
    const filter = user_id ? { user_id } : {};
    const reviews = await Review.find(filter).sort({ createdAt: -1 });
    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
