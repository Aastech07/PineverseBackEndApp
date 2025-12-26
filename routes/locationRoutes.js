import express from "express";
import {
  createLocation,
  getLocations,
  getLocationById,
  updateLocation,
  deleteLocation,
  getLocationsByUserId, // ✅ new import
} from "../controllers/locationController.js";

const router = express.Router();

router.post("/createLocation", createLocation);

router.get("/getLocations", getLocations);

router.get("/getLocation/:id", getLocationById);
// ✅ New Route - Get by UserId
router.get("/getLocationsByUser/:userId", getLocationsByUserId);

router.put("/updateLocation/:id", updateLocation);

router.delete("/deleteLocation/:id", deleteLocation);

export default router;
