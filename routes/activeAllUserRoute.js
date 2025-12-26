import { Router } from "express";
import mongoose from "mongoose";
import ActiveAllUser from "../models/AllUser.js";

const router = Router();

// helper: validate ObjectId
const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);


router.post("/", async (req, res, next) => {
  try {
    const { serviceLocationId, isActive = true, loginAt } = req.body;

    if (!serviceLocationId || !isObjectId(serviceLocationId)) {
      return res.status(400).json({ message: "Valid serviceLocationId required" });
    }

    const doc = await ActiveAllUser.create({
      ServiceLocations: serviceLocationId,
      isActive,
      ...(loginAt ? { loginAt } : {})
    });

    // populate the referenced location
    await doc.populate("ServiceLocations");
    res.status(201).json(doc);
  } catch (err) { next(err); }
});


router.get("/", async (req, res, next) => {
  try {
    const { location, active } = req.query;

    const filter = {};
    if (location) {
      if (!isObjectId(location)) {
        return res.status(400).json({ message: "Invalid location id" });
      }
      filter.ServiceLocations = location;
    }
    if (typeof active !== "undefined") {
      filter.isActive = active === "true";
    }

    const docs = await ActiveAllUser
      .find(filter)
      .sort({ createdAt: -1 })
      .populate("ServiceLocations"); // <-- yaha reference resolve hoga

    res.json(docs);
  } catch (err) { next(err); }
});


router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ message: "Invalid id" });

    const doc = await ActiveAllUser.findById(id).populate("ServiceLocations");
    if (!doc) return res.status(404).json({ message: "Not found" });

    res.json(doc);
  } catch (err) { next(err); }
});


router.patch("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ message: "Invalid id" });

    const { isActive, serviceLocationId, loginAt } = req.body;
    const update = {};

    if (typeof isActive !== "undefined") update.isActive = !!isActive;
    if (serviceLocationId) {
      if (!isObjectId(serviceLocationId)) {
        return res.status(400).json({ message: "Invalid serviceLocationId" });
      }
      update.ServiceLocations = serviceLocationId;
    }
    if (loginAt) update.loginAt = loginAt;

    const doc = await ActiveAllUser
      .findByIdAndUpdate(id, update, { new: true })
      .populate("ServiceLocations");

    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (err) { next(err); }
});

/**
 * DELETE: /:id
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ message: "Invalid id" });

    const deleted = await ActiveAllUser.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Not found" });

    res.json({ deleted: true, id });
  } catch (err) { next(err); }
});

/**
 * AGGREGATION example: count active users per location
 * GET /stats/active-per-location
 */
router.get("/stats/active-per-location", async (req, res, next) => {
  try {
    const stats = await ActiveAllUser.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$ServiceLocations", count: { $sum: 1 } } },
      {
        $lookup: {
          from: "servicelocations", // collection name (lowercase plural by default)
          localField: "_id",
          foreignField: "_id",
          as: "location"
        }
      },
      { $unwind: "$location" },
      { $project: { _id: 0, locationId: "$location._id", name: "$location.name", count: 1 } }
    ]);

    res.json(stats);
  } catch (err) { next(err); }
});

export default router;
