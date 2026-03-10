import Location from "../models/locationModel.js";
import Bid from "../models/BidSchema.js";

// ======================
// Create a new location
// ======================
export const createLocation = async (req, res) => {
  try {
    const {
      userId,
      name,
      image,
      pickup,
      drop,
      jobDetails,
      inventory,
      serviceDetails,
      moveType,
      liftAvailable,
      PickUpFloorNo,
      DropFloorNo,
      truckSize,
      packingLayers,
      storageDuration,
      additionalServices,
      jobName,
      bids
    } = req.body;

    const newLocation = new Location({
      userId,
      name: name || '',
      image: image || '',
      jobName: jobName || '',
      pickup: {
        location: pickup?.location || '',
        city: pickup?.city || '',
        state: pickup?.state || '',
        addressLine1: pickup?.addressLine1 || '',
        addressLine2: pickup?.addressLine2 || '',
        pincode: pickup?.pincode || '',
      },
      drop: {
        location: drop?.location || '',
        city: drop?.city || '',
        state: drop?.state || '',
        addressLine1: drop?.addressLine1 || '',
        addressLine2: drop?.addressLine2 || '',
        pincode: drop?.pincode || '',
      },
      jobDetails: {
        dateOfPacking: jobDetails?.dateOfPacking || null,
        propertySize: jobDetails?.propertySize || '',
        truckSize: truckSize || '',
        status: "Posted",
        progressStep: 0,
      },
      inventory: inventory?.map(item => ({
        title: item.title || '',
        subtitle: item.subtitle || '',
        qty: Number(item.qty) || 0,
      })) || [],
      serviceDetails: {
        packingRequired: serviceDetails?.packingRequired || 'No',
        // ✅ insuranceRequired — stores "Yes" / "No" / "Estimated Value: 1,00,000"
        insuranceRequired: serviceDetails?.insuranceRequired || 'No',
        // ✅ estimatedValue separately bhi store hoga
        estimatedValue: serviceDetails?.estimatedValue || '',
        storageRequired: serviceDetails?.storageRequired || 'No',
        dismantlingRequired: serviceDetails?.dismantlingRequired || 'No',
        packingLayers: packingLayers || [],
        storageDuration: storageDuration || '',
        additionalServices: additionalServices || [],
      },
      moveType: moveType || '',
      liftAvailable: liftAvailable || '',
      PickUpFloorNo: PickUpFloorNo || '',
      DropFloorNo: DropFloorNo || '',
      bids: bids || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedLocation = await newLocation.save();
    res.status(201).json({
      success: true,
      message: "Location created successfully",
      data: savedLocation
    });
  } catch (error) {
    console.error("Error creating location:", error);
    res.status(500).json({
      success: false,
      message: "Error creating location",
      error: error.message
    });
  }
};

// ======================
// Get all locations
// ======================
export const getLocations = async (req, res) => {
  try {
    const locations = await Location.find();

    for (let loc of locations) {
      const bidCount = await Bid.countDocuments({ jobId: loc._id });
      loc._doc.bidCount = bidCount;
    }

    res.status(200).json({
      success: true,
      count: locations.length,
      data: locations
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ======================
// Get location by ID
// ======================
export const getLocationById = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Location not found"
      });
    }
    res.status(200).json({
      success: true,
      data: location
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching location",
      error: error.message
    });
  }
};

// ======================
// Get locations by user ID
// ======================
export const getLocationsByUserId = async (req, res) => {
  try {
    const locations = await Location.find({ userId: req.params.userId })
      .sort({ createdAt: -1 });

    if (!locations.length) {
      return res.status(404).json({
        success: false,
        message: "No locations found for this user"
      });
    }

    res.status(200).json({
      success: true,
      count: locations.length,
      data: locations
    });
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
    const {
      pickup,
      drop,
      jobDetails,
      inventory,
      serviceDetails,
      moveType,
      liftAvailable,
      truckSize,
      packingLayers,
      storageDuration,
      additionalServices,
      bids,
      jobName,
      ...otherFields
    } = req.body;

    const updateData = {
      ...otherFields,
      updatedAt: new Date(),
    };

    if (pickup) {
      updateData.pickup = { ...pickup, pincode: pickup.pincode || "" };
    }

    if (drop) {
      updateData.drop = { ...drop, pincode: drop.pincode || "" };
    }

    if (jobDetails || truckSize) {
      updateData.jobDetails = {
        ...(jobDetails || {}),
        truckSize: truckSize || (jobDetails?.truckSize || ''),
      };
    }

    if (serviceDetails || packingLayers || storageDuration || additionalServices) {
      updateData.serviceDetails = {
        ...(serviceDetails || {}),
        // ✅ estimatedValue update support
        estimatedValue: serviceDetails?.estimatedValue || '',
        packingLayers: packingLayers || (serviceDetails?.packingLayers || []),
        storageDuration: storageDuration || (serviceDetails?.storageDuration || ''),
        additionalServices: additionalServices || (serviceDetails?.additionalServices || []),
      };
    }

    if (inventory) {
      updateData.inventory = inventory.map(item => ({
        title: item.title || '',
        subtitle: item.subtitle || '',
        qty: Number(item.qty) || 0,
      }));
    }

    if (moveType !== undefined) updateData.moveType = moveType;
    if (liftAvailable !== undefined) updateData.liftAvailable = liftAvailable;
    if (bids) updateData.bids = bids;

    const updatedLocation = await Location.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedLocation) {
      return res.status(404).json({
        success: false,
        message: "Location not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Location updated successfully",
      data: updatedLocation
    });
  } catch (error) {
    console.error("Error updating location:", error);
    res.status(500).json({
      success: false,
      message: "Error updating location",
      error: error.message
    });
  }
};

// ======================
// Delete a location
// ======================
export const deleteLocation = async (req, res) => {
  try {
    const deletedLocation = await Location.findByIdAndDelete(req.params.id);
    if (!deletedLocation) {
      return res.status(404).json({
        success: false,
        message: "Location not found"
      });
    }
    res.status(200).json({
      success: true,
      message: "Location deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting location",
      error: error.message
    });
  }
};

// ======================
// Submit/Add a Bid to a Location
// ======================
export const submitBid = async (req, res) => {
  try {
    const { item_id, bid } = req.body;

    const location = await Location.findById(item_id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Location not found"
      });
    }

    if (!bid || !bid.quotation || !bid.bidderId) {
      return res.status(400).json({
        success: false,
        message: "Bid must include at least quotation and bidderId",
      });
    }

    const newBid = {
      quotation: bid.quotation,
      status: bid.status || "Negotiable",
      validityOfQuote: bid.validityOfQuote || "7 Days",
      advancePayment: bid.advancePayment || 0,
      noteToCustomer: bid.noteToCustomer || "",
      bidderId: bid.bidderId,
      submittedAt: new Date(),
    };

    location.bids.push(newBid);

    if (location.jobDetails.status === "Posted" && location.bids.length === 1) {
      location.jobDetails.status = "Bid Received";
    }

    await location.save();

    res.status(200).json({
      success: true,
      message: "Bid submitted successfully",
      data: location,
    });
  } catch (error) {
    console.error("Error submitting bid:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting bid",
      error: error.message
    });
  }
};

// ======================
// Update Job Status
// ======================
export const updateJobStatus = async (req, res) => {
  try {
    const { status, progressStep } = req.body;

    const updateData = { updatedAt: new Date() };

    if (status) updateData["jobDetails.status"] = status;
    if (progressStep !== undefined) updateData["jobDetails.progressStep"] = progressStep;

    const updatedLocation = await Location.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedLocation) {
      return res.status(404).json({
        success: false,
        message: "Location not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Job status updated successfully",
      data: updatedLocation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating job status",
      error: error.message
    });
  }
};

// ======================
// Search/Filters for Locations
// ======================
export const searchLocations = async (req, res) => {
  try {
    const { userId, city, state, status, minDate, maxDate, moveType } = req.query;

    const filter = {};

    if (userId) filter.userId = userId;
    if (city) filter["pickup.city"] = new RegExp(city, 'i');
    if (state) filter["pickup.state"] = new RegExp(state, 'i');
    if (status) filter["jobDetails.status"] = status;
    if (moveType) filter.moveType = moveType;

    if (minDate || maxDate) {
      filter["jobDetails.dateOfPacking"] = {};
      if (minDate) filter["jobDetails.dateOfPacking"].$gte = new Date(minDate);
      if (maxDate) filter["jobDetails.dateOfPacking"].$lte = new Date(maxDate);
    }

    const locations = await Location.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: locations.length,
      data: locations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error searching locations",
      error: error.message
    });
  }
};