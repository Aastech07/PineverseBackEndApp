import mongoose from "mongoose";

const SkipModels = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: true,
            unique: true,
        },
        Businessinfolocation: {
            type: Boolean,
            default: false,
        },
        ServiesLocation: {
            type: Boolean,
            default: false
        },
        SerivesPortfolio: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

const Skip = mongoose.model("SkipModels", SkipModels);
export default Skip;