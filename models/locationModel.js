import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
  title: { type: String },
  subtitle: { type: String },
  qty: { type: Number, min: 0 }
});

const locationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  image: {
    type: String,
  },
  name: {
    type: String,
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
    pincode: { type: String },
  },
  jobDetails: {
    dateOfPacking: { type: Date },
    propertySize: { type: String },
    truckSize: { type: String }, // Added from payload
    status: {
      type: String,
      enum: ["Posted", "Bid Received", "In Progress", "Completed"],
      default: "Posted"
    },
    progressStep: { type: Number, min: 0, max: 3, default: 0 },
  },
  inventory: [itemSchema],
  serviceDetails: {
    packingRequired: { type: String, enum: ["Yes", "No", "Partially"] },
    estimatedValue: { type: String, default: '' },
    insuranceRequired: { type: String, enum: ["Yes", "No", "Estimated Value"] },
    storageRequired: { type: String, enum: ["Yes", "No", "Estimated Value"] },
    dismantlingRequired: { type: String, enum: ["Yes", "No", "Partially"] },
    packingLayers: {
      type: [String],   // ✅ Array of strings
    }, // Added from payload
    storageDuration: { type: String }, // Added from payload
    additionalServices: {
      type: [String],   // ✅ Array of strings
    }, // Added from payload
  },
  moveType: { type: String }, // Added from payload
  liftAvailable: { type: String }, // Added from payload
  PickUpFloorNo : { type: String }, // Added from payload
  DropFloorNo : { type: String }, // Added from payload
  jobName: { type: String }, // Added from payload
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  
  
});

const Location = mongoose.model("Location", locationSchema);

export default Location;