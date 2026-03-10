import express from "express";
import { broadcastMessage, getStatus } from "../controllers/socketController.js";

const router = express.Router();

router.get("/status", getStatus);
router.post("/broadcast", broadcastMessage);

export default router;
