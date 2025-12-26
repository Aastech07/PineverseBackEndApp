import express from "express";
import { addLocation, updateLocation, deleteLocation,getLocationsByUser } from "../controllers/serviceLocationController.js";

const router = express.Router();

// add
router.post("/AddLocation/:userId", addLocation);

// update
router.put("/updateLocation/:userId/:locationId", updateLocation);

// delete (single)
router.delete("/deleteLocation/:userId/:locationId", deleteLocation);


router.get("/GetLocations/:userId", getLocationsByUser);

export default router;
