import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
  title: { type: String, required: true },      // Item ka title
  subtitle: { type: String },                   // Item ka subtitle (optional)
  qty: { type: Number, required: true, min: 0 } // Quantity
});

const locationSchema = new mongoose.Schema({
  userId: {
    type: String, // Simple string store
    required: true, // Required field
  },
  image: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  pickup: {
    location: { type: String },
    city: { type: String },
    state: { type: String },
    addressLine1: { type: String },
    addressLine2: { type: String },
    pincode: { type: String },
  },
  drop: {
    location: { type: String },
    city: { type: String },
    state: { type: String },
    addressLine1: { type: String },
    addressLine2: { type: String },
    pincode: { type: String }, // ✅ Pincode added
  },
  jobDetails: {
    dateOfPacking: { type: Date },
    propertySize: { type: String },
    status: {
      type: String,
      enum: ["Posted", "Bid Received", "In Progress", "Completed"],
      default: "Posted"
    }, // Job status
    progressStep: { type: Number, min: 0, max: 3, default: 0 }, // Progress indicator
  },
  inventory: [itemSchema],
  serviceDetails: {
    packingRequired: { type: String, enum: ["Yes", "No", "Partially"] },
    insuranceRequired: { type: String, enum: ["Yes", "No", "Estimated Value"] },
    storageRequired: { type: String, enum: ["Yes", "No", "Estimated Value"] },
    dismantlingRequired: { type: String, enum: ["Yes", "No", "Partially"] },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }, // Track updates
  bids: [{
    quotation: { type: Number, required: true }, // Send a Quotation field
    status: {
      type: String,
      enum: ["Negotiable", "Non-Negotiable"],
      default: "Negotiable"
    }, // Status (Negotiable/Non-Negotiable)
    validityOfQuote: {
      type: String,
      enum: ["7 Days", "10 Days", "1 Month"],
      default: "7 Days"
    }, // Validity of Quote
    advancePayment: { type: Number, min: 0, default: 0 }, // Advance payment percentage or amount
    noteToCustomer: { type: String, default: "" }, // Leave a note to the customer
    bidderId: { type: String, required: true }, // ID of the bidder
    submittedAt: { type: Date, default: Date.now }, // When the bid was submitted
  }],
});

const Location = mongoose.model("Location", locationSchema);

export default Location;
