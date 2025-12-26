import express from "express";
import multer from "multer";
import path from "path";
import cors from "cors";
import fs from "fs/promises";
import { fileURLToPath } from "url";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors({ origin: "*" })); // Allow all origins (restrict to your frontend URL in production)

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "uploads");
await fs.mkdir(uploadDir, { recursive: true });

// Upload storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDFs are allowed"), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Static folder for public access
app.use("/uploads", express.static(uploadDir));

// API to upload PDF
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Public URL (use your machine's IP or 10.0.2.2 for emulator)
    const fileUrl = `http://192.168.0.125:3000/uploads/${req.file.filename}`;

    // Store metadata in files.json
    const metadata = {
      filename: req.file.filename,
      url: fileUrl,
      uploadedAt: new Date().toISOString(),
    };
    const metadataFile = path.join(__dirname, "files.json");
    let files = [];
    try {
      const data = await fs.readFile(metadataFile, "utf8");
      files = JSON.parse(data);
    } catch (err) {
      // File doesn't exist yet
    }
    files.push(metadata);
    await fs.writeFile(metadataFile, JSON.stringify(files, null, 2));

    res.json({ url: fileUrl, filename: req.file.filename });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API to get all uploaded files' metadata
app.get("/files", async (req, res) => {
  try {
    const metadataFile = path.join(__dirname, "files.json");
    const data = await fs.readFile(metadataFile, "utf8");
    const files = JSON.parse(data);
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: "No files found" });
  }
});

export const uploadpdf = app;
