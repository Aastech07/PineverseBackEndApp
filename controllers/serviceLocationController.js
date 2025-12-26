import mongoose from "mongoose";
import ServiceLocation from "../models/ServiceLocations.js";

const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ADD
export const addLocation = async (req, res) => {
  try {
    console.log("📩 Params:", req.params);
    console.log("📩 Body:", req.body);

    const { userId } = req.params;
    const { name } = req.body;

    if (!name?.trim()) return res.status(400).json({ message: "name is required" });

    const doc = await ServiceLocation.findOneAndUpdate(
      { user_id: userId },
      {
        $push: { serviceLocation: { name: name.trim() } },
        $setOnInsert: { user_id: userId },
      },
      { new: true, upsert: true }
    );

    res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// UPDATE
export const updateLocation = async (req, res) => {
  try {
    const { userId, locationId } = req.params;
    const { name } = req.body;

    if (!isObjectId(locationId)) return res.status(400).json({ message: "invalid id" });
    if (!name?.trim()) return res.status(400).json({ message: "name required" });

    const doc = await ServiceLocation.findOneAndUpdate(
      { user_id: userId, "serviceLocation._id": locationId },
      { $set: { "serviceLocation.$.name": name.trim() } },
      { new: true }
    );

    if (!doc) return res.status(404).json({ message: "not found" });

    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE
export const deleteLocation = async (req, res) => {
  try {
    const { userId, locationId } = req.params;

    if (!isObjectId(locationId)) return res.status(400).json({ message: "invalid id" });

    const doc = await ServiceLocation.findOneAndUpdate(
      { user_id: userId },
      { $pull: { serviceLocation: { _id: locationId } } },
      { new: true }
    );

    if (!doc) return res.status(404).json({ message: "not found" });

    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET ALL LOCATIONS BY USER_ID
export const getLocationsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const doc = await ServiceLocation.findOne({ user_id: userId });

    if (!doc) {
      return res.status(404).json({ message: "No locations found for this user" });
    }

    res.status(200).json(doc.serviceLocation);
  } catch (err) {
    console.error("❌ Error fetching locations:", err);
    res.status(500).json({ message: err.message });
  }
};
