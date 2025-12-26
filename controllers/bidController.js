// controllers/bidController.js
import Bid from "../models/BidSchema.js";
import mongoose from "mongoose";

/**
 * Helper: validate recipientDetails shape (basic)
 */
const isValidRecipientDetails = (rd) => {
  if (!rd) return false;
  if (typeof rd !== "object") return false;
  const { name, image, phone } = rd;
  if (!name || typeof name !== "string") return false;
  if (!image || typeof image !== "string") return false;
  // phone should be 10 digits
  const phoneRegex = /^[0-9]{10}$/;
  if (!phone || typeof phone !== "string" || !phoneRegex.test(phone)) return false;
  return true;
};

/**
 * 🚀 NEW: Helper to check if a bid is still valid based on validityOfQuote and submittedAt
 * This is the CORE logic for hiding expired bids
 */
const isBidValid = (bid) => {
  if (!bid.submittedAt || !bid.validityOfQuote) return false;

  const submittedDate = new Date(bid.submittedAt);
  const now = new Date();

  let daysToAdd = 0;
  switch (bid.validityOfQuote) {
    case '7 Days':
      daysToAdd = 7;
      break;
    case '10 Days':
      daysToAdd = 10;
      break;
    case '1 Month':
      daysToAdd = 30; // Standard approximation for 1 month
      break;
    default:
      daysToAdd = 7; // fallback to default
  }

  const expiryDate = new Date(submittedDate);
  expiryDate.setDate(submittedDate.getDate() + daysToAdd);
  expiryDate.setHours(23, 59, 59, 999); // End of the validity day

  return now <= expiryDate;
};

// 🟢 Create a new bid (NO CHANGE - expiry logic applied on reads only)
export const createBid = async (req, res) => {
  try {
    const {
      quotation,
      status,
      validityOfQuote,
      advancePayment,
      noteToCustomer,
      bidderId,
      recipientId,
      jobId,
      servicesProvided,
      locationProvided,
      image,
      name,
      phone,
      pickup,
      drop,
      jobDetails,
      inventory,
      serviceDetails,
      ActiveUserStatus,
      recipientDetails,
    } = req.body;

    // Basic required validation
    if (!quotation && quotation !== 0) {
      return res.status(400).json({ message: "quotation is required" });
    }
    if (!bidderId) {
      return res.status(400).json({ message: "bidderId is required" });
    }
    if (!recipientId) {
      return res.status(400).json({ message: "recipientId is required" });
    }
    if (!jobId) {
      return res.status(400).json({ message: "jobId is required" });
    }

    // Validate array fields
    if (
      (servicesProvided && !Array.isArray(servicesProvided)) ||
      (locationProvided && !Array.isArray(locationProvided)) ||
      (inventory && !Array.isArray(inventory))
    ) {
      return res.status(400).json({
        message: "servicesProvided, locationProvided, and inventory must be arrays",
      });
    }

    // Validate phone if provided (top-level phone)
    if (phone) {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          message: "Top-level phone must be a valid 10-digit number",
        });
      }
    }

    // Validate recipientDetails if provided
    if (recipientDetails && !isValidRecipientDetails(recipientDetails)) {
      return res.status(400).json({
        message:
          "recipientDetails must include name (string), image (string), and phone (10-digit string)",
      });
    }

    // Create new Bid document
    const newBid = new Bid({
      quotation,
      status,
      validityOfQuote,
      advancePayment,
      noteToCustomer,
      bidderId,
      recipientId,
      jobId,
      servicesProvided: servicesProvided || [],
      locationProvided: locationProvided || [],
      image: image || "",
      name: name || "",
      phone: phone || "",
      recipientDetails: recipientDetails
        ? {
            name: recipientDetails.name || "",
            image: recipientDetails.image || "",
            phone: recipientDetails.phone || "",
          }
        : { name: "", image: "", phone: "" },
      pickup: {
        city: pickup?.city || "",
        state: pickup?.state || "",
        pincode: pickup?.pincode || "",
        location: pickup?.location || "",
        addressLine1: pickup?.addressLine1 || "",
        addressLine2: pickup?.addressLine2 || "",
      },
      drop: {
        city: drop?.city || "",
        state: drop?.state || "",
        pincode: drop?.pincode || "",
        location: drop?.location || "",
        addressLine1: drop?.addressLine1 || "",
        addressLine2: drop?.addressLine2 || "",
      },
      jobDetails: {
        dateOfPacking: jobDetails?.dateOfPacking || "",
        propertySize: jobDetails?.propertySize || "",
      },
      inventory:
        inventory?.map(({ title, subtitle, qty }) => ({
          title,
          subtitle: subtitle || "",
          qty: qty || 1,
        })) || [],
      serviceDetails: {
        packingRequired: serviceDetails?.packingRequired || "",
        insuranceRequired: serviceDetails?.insuranceRequired || "",
        storageRequired: serviceDetails?.storageRequired || "",
        dismantlingRequired: serviceDetails?.dismantlingRequired || "",
      },
      ActiveUserStatus: ActiveUserStatus || "Quote Sent",
    });

    await newBid.save();
    return res.status(201).json({
      message: "✅ Bid created successfully",
      bid: newBid,
    });
  } catch (error) {
    console.error("❌ Error creating bid:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 🟢 Get all bids for a job (🚀 NOW FILTERS EXPIRED BIDS)
export const getBidsByJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!jobId) {
      return res.status(400).json({ message: "jobId is required" });
    }

    const bids = await Bid.find({ jobId }).lean();

    // 🚀 FILTER: Only return valid (non-expired) bids
    const validBids = bids.filter(isBidValid);

    return res.status(200).json({
      message: "Active bids fetched successfully",
      count: validBids.length,
      totalFound: bids.length, // For debugging
      validCount: validBids.length,
      bids: validBids,
    });
  } catch (error) {
    console.error("❌ Error fetching bids:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 🟢 Get bids placed by a user (🚀 NOW FILTERS EXPIRED BIDS)
export const getBidsForUser = async (req, res) => {
  try {
    const { bidderId } = req.query;
    if (!bidderId) {
      return res.status(400).json({ message: "bidderId is required" });
    }

    const bids = await Bid.find({ bidderId })
      .populate("recipientId", "name email")
      .select(
        "quotation status validityOfQuote advancePayment noteToCustomer bidderId recipientId jobId activeStatus submittedAt servicesProvided locationProvided image name phone recipientDetails pickup drop jobDetails inventory serviceDetails ActiveUserStatus"
      )
      .lean();

    // 🚀 FILTER: Only return valid bids
    const validBids = bids.filter(isBidValid);

    return res.status(200).json({
      message: "Active bids fetched successfully",
      count: validBids.length,
      bids: validBids,
    });
  } catch (error) {
    console.error("❌ Error fetching user bids:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 🟢 Get bids received by a recipient (🚀 NOW FILTERS EXPIRED BIDS)
export const getBidsByRecipient = async (req, res) => {
  try {
    const { recipientId } = req.query;
    if (!recipientId) {
      return res.status(400).json({ message: "recipientId is required" });
    }

    const bids = await Bid.find({ recipientId })
      .select(
        "quotation status validityOfQuote advancePayment noteToCustomer bidderId recipientId jobId activeStatus submittedAt servicesProvided locationProvided image name phone recipientDetails pickup drop jobDetails inventory serviceDetails ActiveUserStatus"
      )
      .sort({ createdAt: -1 })
      .lean();

    // 🚀 FILTER: Only return valid bids
    const validBids = bids.filter(isBidValid);

    return res.status(200).json({
      message: "Active bids fetched successfully for recipient",
      recipientId,
      count: validBids.length,
      bids: validBids,
    });
  } catch (error) {
    console.error("❌ Error fetching bids by recipientId:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 🟢 Update bid status (NO CHANGE - expiry is read-time only)
export const updateBidStatus = async (req, res) => {
  try {
    const { bidId } = req.params;
    const { activeStatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(bidId)) {
      return res.status(400).json({ message: "Invalid Bid ID format" });
    }
    if (!["sent", "accepted", "rejected", "Negotiate"].includes(activeStatus)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updatedBid = await Bid.findByIdAndUpdate(
      bidId,
      { activeStatus },
      { new: true }
    ).select(
      "quotation status validityOfQuote advancePayment noteToCustomer bidderId recipientId jobId activeStatus submittedAt servicesProvided locationProvided image name phone recipientDetails pickup drop jobDetails inventory serviceDetails ActiveUserStatus"
    );

    if (!updatedBid) {
      return res.status(404).json({ message: "Bid not found" });
    }

    return res.status(200).json({
      message: "✅ Bid status updated successfully",
      bid: updatedBid,
    });
  } catch (error) {
    console.error("❌ Error updating bid status:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 🟢 Get unique job IDs for a recipient (🚀 NOW FILTERS EXPIRED BIDS)
export const getJobIdsByRecipient = async (req, res) => {
  try {
    const { recipientId } = req.query;
    if (!recipientId) {
      return res.status(400).json({ message: "recipientId is required" });
    }

    const bids = await Bid.find({ recipientId }).select("jobId submittedAt validityOfQuote").lean();
    
    if (!bids || bids.length === 0) {
      return res.status(404).json({ message: "No jobs found for this recipient" });
    }

    // 🚀 FILTER: Only valid bids
    const validBids = bids.filter(isBidValid);
    const jobIds = [...new Set(validBids.map((bid) => bid.jobId.toString()))];

    return res.status(200).json({ 
      recipientId, 
      jobIds,
      totalValidJobs: jobIds.length 
    });
  } catch (error) {
    console.error("❌ Error fetching job IDs:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 🟢 Check if a user has placed a bid on a specific job (🚀 CONSIDERS EXPIRY)
export const checkUserBidOnJob = async (req, res) => {
  try {
    const { jobId, userId } = req.params;
    if (!jobId || !userId) {
      return res.status(400).json({
        message: "jobId and userId are required",
        status: false,
      });
    }

    const bid = await Bid.findOne({
      jobId: jobId,
      bidderId: userId,
    }).select(
      "quotation status validityOfQuote advancePayment noteToCustomer bidderId recipientId jobId activeStatus submittedAt name phone image recipientDetails"
    ).lean();

    if (!bid) {
      return res.status(200).json({
        message: "User has not bid on this job",
        status: false,
        found: false,
        userExists: false,
      });
    }

    // 🚀 CHECK EXPIRY
    const isValid = isBidValid(bid);
    
    if (isValid) {
      return res.status(200).json({
        message: "User has an active bid on this job",
        status: true,
        found: true,
        userExists: true,
        isValid: true,
        bid,
      });
    } else {
      return res.status(200).json({
        message: "User had a bid but it has expired",
        status: false,
        found: true,
        userExists: true,
        isValid: false,
        bid,
      });
    }
  } catch (error) {
    console.error("❌ Error checking user bid:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
      status: false,
    });
  }
};

// 🟢 Update ActiveUserStatus (NO CHANGE)
export const updateActiveUserStatus = async (req, res) => {
  try {
    const { bidId } = req.params;
    const { ActiveUserStatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(bidId)) {
      return res.status(400).json({ message: "Invalid Bid ID format" });
    }

    const allowedStatuses = ["In Progress", "Quote Sent", "Cancelled", "Completed", "Rejected"];
    if (!ActiveUserStatus || !allowedStatuses.includes(ActiveUserStatus)) {
      return res.status(400).json({
        message: "Invalid ActiveUserStatus. Allowed values: " + allowedStatuses.join(", "),
      });
    }

    const updatedBid = await Bid.findByIdAndUpdate(
      bidId,
      { ActiveUserStatus },
      { new: true }
    ).select(
      "quotation status validityOfQuote advancePayment noteToCustomer bidderId recipientId jobId activeStatus submittedAt servicesProvided locationProvided image name phone recipientDetails pickup drop jobDetails inventory serviceDetails ActiveUserStatus"
    );

    if (!updatedBid) return res.status(404).json({ message: "Bid not found" });

    return res.status(200).json({
      message: "✅ ActiveUserStatus updated successfully",
      bid: updatedBid,
    });
  } catch (error) {
    console.error("❌ Error updating ActiveUserStatus:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 🟢 Get ALL bids (🚀 WITH OPTIONAL EXPIRED FILTER)
export const getAllBids = async (req, res) => {
  try {
    const { includeExpired } = req.query; // ?includeExpired=true to see expired bids

    let bids = await Bid.find()
      .sort({ createdAt: -1 })
      .select(
        "quotation status validityOfQuote advancePayment noteToCustomer bidderId recipientId jobId activeStatus submittedAt servicesProvided locationProvided image name phone recipientDetails pickup drop jobDetails inventory serviceDetails ActiveUserStatus"
      )
      .lean();

    // 🚀 FILTER: Hide expired bids UNLESS includeExpired=true
    if (includeExpired !== 'true') {
      bids = bids.filter(isBidValid);
    }

    return res.status(200).json({
      message: `${includeExpired === 'true' ? 'All bids (including expired)' : 'Active bids'} fetched successfully`,
      count: bids.length,
      includeExpired: includeExpired === 'true',
      bids,
    });
  } catch (error) {
    console.error("❌ Error fetching all bids:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 🟢 NEW: Get expired bids specifically (for cleanup/admin)
export const getExpiredBids = async (req, res) => {
  try {
    const bids = await Bid.find()
      .sort({ createdAt: -1 })
      .select(
        "quotation status validityOfQuote advancePayment noteToCustomer bidderId recipientId jobId activeStatus submittedAt servicesProvided locationProvided image name phone recipientDetails pickup drop jobDetails inventory serviceDetails ActiveUserStatus"
      )
      .lean();

    const expiredBids = bids.filter((bid) => !isBidValid(bid));

    return res.status(200).json({
      message: "Expired bids fetched successfully",
      count: expiredBids.length,
      bids: expiredBids,
    });
  } catch (error) {
    console.error("❌ Error fetching expired bids:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export default {
  createBid,
  getBidsByJob,
  getBidsForUser,
  getBidsByRecipient,
  updateBidStatus,
  getJobIdsByRecipient,
  checkUserBidOnJob,
  updateActiveUserStatus,
  getAllBids,
  getExpiredBids,
};