import dotenv from "dotenv";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import multer from "multer";
import mime from "mime-types";

import connectDB from "./db/connectDB.js";
import User from "./models/User.js";
import bidRoutes from "./routes/BidRoutes.js";
import { uploadpdf } from "./upload_pdf/uploadpdf.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import transactionRoutes from "./routes/transactions.js";
import locationRoutes from "./routes/locationRoutes.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

/* ===================== SOCKET.IO ===================== */
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

/* ===================== DATABASE ===================== */
(async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
})();

/* ===================== MIDDLEWARE ===================== */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ===================== BASIC ROUTE ===================== */
app.get("/", (req, res) => {
  res.send("🚀 Pineverse Chat App is running on Azure!");
});

/* ===================== UPLOADS ===================== */
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

const ALLOWED_MIMES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt"
};

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadsDir),
  filename: (_, file, cb) => {
    const ext = mime.extension(file.mimetype);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    ALLOWED_MIMES[file.mimetype]
      ? cb(null, true)
      : cb(new Error("Invalid file type"));
  }
});

/* ===================== ROUTES ===================== */
app.use("/", uploadpdf);
app.use("/api", bidRoutes);
app.use("/api", reviewRoutes);
app.use("/api", transactionRoutes);
app.use("/api", locationRoutes);

/* ===================== SOCKET EVENTS ===================== */
io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  socket.on("join", ({ userId }) => {
    if (userId) socket.join(userId);
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

/* ===================== START SERVER ===================== */
const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
