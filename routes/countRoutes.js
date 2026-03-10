import express from "express";
import {
  incrementCount,
  getCountByUserId,
} from "../controllers/countController.js";

const router = express.Router();

router.post("/increment", incrementCount);
router.get("/:userId", getCountByUserId);

export default router;
