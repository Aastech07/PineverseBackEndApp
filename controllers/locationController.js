import Location from "../models/locationModel.js";

// ======================
// Create a new location
// ======================
export const createLocation = async (req, res) => {
  try {
    const { userId, pickup, drop, jobDetails, inventory, serviceDetails, bids } = req.body;

    const newLocation = new Location({
      userId,
      pickup: {
        ...pickup,
        pincode: pickup?.pincode || "", // ✅ Pickup pincode handle
      },
      drop: {
        ...drop,
        pincode: drop?.pincode || "", // ✅ Drop pincode handle
      },
      jobDetails,
      inventory,
      serviceDetails,
      bids,
    });

    const savedLocation = await newLocation.save();
    res.status(201).json({ success: true, data: savedLocation });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error creating location", error: error.message });
  }
};

// ======================
// Get all locations
// ======================
export const getLocations = async (req, res) => {
  try {
    const locations = await Location.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: locations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
// ======================
// Get location by ID
// ======================
export const getLocationById = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ success: false, message: "Location not found" });
    }
    res.status(200).json({ success: true, data: location });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching location", error: error.message });
  }
};

// ======================
// Get locations by user ID
// ======================
export const getLocationsByUserId = async (req, res) => {
  try {
    const locations = await Location.find({ userId: req.params.userId });
    if (!locations.length) {
      return res
        .status(404)
        .json({ success: false, message: "No locations found for this user" });
    }
    res.status(200).json({ success: true, data: locations });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching locations for user",
      error: error.message,
    });
  }
};

// ======================
// Update a location
// ======================
export const updateLocation = async (req, res) => {
  try {
    const updatedLocation = await Location.findByIdAndUpdate(
      req.params.id,
      { $set: req.body }, // ✅ Agar req.body me pickup/drop ke andar pincode aayega to update ho jayega
      { new: true, runValidators: true }
    );

    if (!updatedLocation) {
      return res.status(404).json({ success: false, message: "Location not found" });
    }

    res.status(200).json({ success: true, data: updatedLocation });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error updating location", error: error.message });
  }
};

// ======================
// Delete a location
// ======================
export const deleteLocation = async (req, res) => {
  try {
    const deletedLocation = await Location.findByIdAndDelete(req.params.id);
    if (!deletedLocation) {
      return res.status(404).json({ success: false, message: "Location not found" });
    }
    res.status(200).json({ success: true, message: "Location deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error deleting location", error: error.message });
  }
};

// ======================
// Submit/Add a Bid to a Location
// ======================
export const submitBid = async (req, res) => {
  try {
    const { item_id, bid } = req.body;

    // Check location exists
    const location = await Location.findById(item_id);
    if (!location) {
      return res.status(404).json({ success: false, message: "Location not found" });
    }

    // Validate bid object
    if (!bid || !bid.quotation || !bid.bidderId) {
      return res.status(400).json({
        success: false,
        message: "Bid must include at least quotation and bidderId",
      });
    }

    // Push new bid
    location.bids.push(bid);
    await location.save();

    res.status(200).json({
      success: true,
      message: "Bid submitted successfully",
      data: location,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error submitting bid", error: error.message });
  }
};
