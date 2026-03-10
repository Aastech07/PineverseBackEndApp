import Skip from "../models/SkipModels.js";

// Create new skip record
export const createSkip = async (req, res) => {
    try {
        const { userId, Businessinfolocation, ServiesLocation, SerivesPortfolio } = req.body;
        // Check if userId already exists
        const existingSkip = await Skip.findOne({ userId });
        if (existingSkip) {
            return res.status(400).json({
                success: false,
                message: "Skip record already exists for this user"
            });
        }
        const newSkip = new Skip({
            userId,
            Businessinfolocation: Businessinfolocation || false,
            ServiesLocation: ServiesLocation || false,
            SerivesPortfolio: SerivesPortfolio || false
        });

        await newSkip.save();

        res.status(201).json({
            success: true,
            message: "Skip record created successfully",
            data: newSkip
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error creating skip record",
            error: error.message
        });
    }
};

// Get skip record by userId
// Get skip record by userId
export const getSkipByUserId = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        const skip = await Skip.findOne({ userId });

   
        return res.status(200).json({
            success: true,
            data: skip
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error fetching skip record",
            error: error.message
        });
    }
};


// Get all skip records
export const getAllSkips = async (req, res) => {
    try {
        const skips = await Skip.find();

        res.status(200).json({
            success: true,
            count: skips.length,
            data: skips
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching skip records",
            error: error.message
        });
    }
};

// Update skip record
export const updateSkip = async (req, res) => {
    try {
        const { userId } = req.params;
        const { Businessinfolocation, ServiesLocation, SerivesPortfolio } = req.body;

        const skip = await Skip.findOne({ userId });

        if (!skip) {
            return res.status(404).json({
                success: false,
                message: "Skip record not found for this user"
            });
        }

        // Update only provided fields
        if (Businessinfolocation !== undefined) skip.Businessinfolocation = Businessinfolocation;
        if (ServiesLocation !== undefined) skip.ServiesLocation = ServiesLocation;
        if (SerivesPortfolio !== undefined) skip.SerivesPortfolio = SerivesPortfolio;

        await skip.save();

        res.status(200).json({
            success: true,
            message: "Skip record updated successfully",
            data: skip
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error updating skip record",
            error: error.message
        });
    }
};

// Update specific field
export const updateSkipField = async (req, res) => {
    try {
        const { userId, field } = req.params;
        const { value } = req.body;

        const validFields = ['Businessinfolocation', 'ServiesLocation', 'SerivesPortfolio'];

        if (!validFields.includes(field)) {
            return res.status(400).json({
                success: false,
                message: "Invalid field name"
            });
        }

        if (typeof value !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: "Value must be true or false"
            });
        }

        const skip = await Skip.findOneAndUpdate(
            { userId },
            { [field]: value },
            { new: true, runValidators: true }
        );

        if (!skip) {
            return res.status(404).json({
                success: false,
                message: "Skip record not found for this user"
            });
        }

        res.status(200).json({
            success: true,
            message: `${field} updated successfully`,
            data: skip
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error updating skip field",
            error: error.message
        });
    }
};

// Delete skip record
export const deleteSkip = async (req, res) => {
    try {
        const { userId } = req.params;

        const skip = await Skip.findOneAndDelete({ userId });

        if (!skip) {
            return res.status(404).json({
                success: false,
                message: "Skip record not found for this user"
            });
        }

        res.status(200).json({
            success: true,
            message: "Skip record deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error deleting skip record",
            error: error.message
        });
    }
};

// Create or update skip record (upsert)
export const upsertSkip = async (req, res) => {
    try {
        const { userId, Businessinfolocation, ServiesLocation, SerivesPortfolio } = req.body;

        const skip = await Skip.findOneAndUpdate(
            { userId },
            {
                Businessinfolocation: Businessinfolocation || false,
                ServiesLocation: ServiesLocation || false,
                SerivesPortfolio: SerivesPortfolio || false
            },
            { new: true, upsert: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: "Skip record saved successfully",
            data: skip
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error saving skip record",
            error: error.message
        });
    }
};