import Count from "../models/Count.js";

// increment / create
export const incrementCount = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId required" });
    }

    const data = await Count.findOneAndUpdate(
      { userId },
      { $inc: { count: 1 } },
      { new: true, upsert: true }
    );

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// get by userId
export const getCountByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const data = await Count.findOne({ userId });

    if (!data) {
      return res.status(404).json({ message: "Count not found" });
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
