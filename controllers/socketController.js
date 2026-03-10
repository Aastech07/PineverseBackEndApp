// controllers/socketController.js
let ioInstance = null;

// store io instance
export const setSocketInstance = (io) => {
    ioInstance = io;
};

// /status API
export const getStatus = (req, res) => {
    res.json({
        status: "running",
        time: new Date()
    });
};

// /broadcast API (CI3 will call this)
export const broadcastMessage = (req, res) => {
    const data = req.body;

    if (!ioInstance) {
        return res.status(500).json({ error: "Socket not initialized" });
    }

    // SAME LOGIC (no change)
    ioInstance.to("room_" + data.room_id).emit("receive_message", data);

    res.json({ status: "ok" });
};
