import mongoose from "mongoose";

const bidSchema = new mongoose.Schema(
  {
    quotation: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['Negotiable', 'Non-Negotiable'],
      default: 'Negotiable',
      required: true,
    },

    costBreakdown: {
      baseTransport: {
        type: Number,
        default: 0,
        min: 0,
      },
      packingCharges: {
        type: Number,
        default: 0,
        min: 0,
      },
      loadingUnloadingCharges: {
        type: Number,
        default: 0,
        min: 0,
      },
      insuranceCharges: {
        type: Number,
        default: 0,
        min: 0,
      },
      storageCharges: {
        type: Number,
        default: 0,
        min: 0,
      },
      dismantlingCharges: {
        type: Number,
        default: 0,
        min: 0,
      },
      otherCharges: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalAmount: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    recipientDetails: {
      name: { type: String, required: true },
      image: { type: String, required: true },
      phone: {
        type: String,
        required: true,
        match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number'],
      },
    },
    validityOfQuote: {
      type: String,
      enum: ['7 Days', '10 Days', '1 Month'],
      default: '7 Days',
      required: true,
    },
    advancePayment: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
      required: true,
    },
    noteToCustomer: {
      type: String,
      maxlength: 500,
      default: '',
    },
    bidderId: {
      type: String,
      required: true,
    },
    recipientId: {
      type: String,
      required: true,
    },
    jobId: {
      type: String,
      required: true,
    },
    activeStatus: {
      type: String,
      enum: ['sent', 'accepted', 'rejected', 'Negotiate'],
      default: 'sent',
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    servicesProvided: {
      type: [String],
      default: [],
    },
    locationProvided: {
      type: [String],
      default: [],
    },
    image: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
      match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number'],
    },

    pickup: {
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
      location: { type: String, default: '' },
      addressLine1: { type: String, default: '' },
      addressLine2: { type: String, default: '' },
    },

    drop: {
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
      location: { type: String, default: '' },
      addressLine1: { type: String, default: '' },
      addressLine2: { type: String, default: '' },
    },

    jobDetails: {
      dateOfPacking: { type: String, default: '' },
      propertySize: { type: String, default: '' },
    },

    inventory: [
      {
        title: { type: String, required: true },
        subtitle: { type: String, default: '' },
        qty: { type: Number, default: 1 },
      },
    ],

    serviceDetails: {
      packingRequired: { type: String, default: '' },
      insuranceRequired: { type: String, default: '' },
      storageRequired: { type: String, default: '' },
      dismantlingRequired: { type: String, default: '' },
    },

    ActiveUserStatus: {
      type: String,
      enum: ['In Progress', 'Quote Sent', 'Cancelled', 'Completed', 'Rejected'],
      default: 'In Progress',
    },


  },
  { timestamps: true }
);

const Bid = mongoose.model("Bid", bidSchema);

export default Bid;
