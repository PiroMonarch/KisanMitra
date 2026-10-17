import express from "express";
import { getSchemes, askQuestion } from "../controllers/ragController.js";

const router = express.Router();

router.get("/schemes", getSchemes);
router.post("/ask", askQuestion);

export default router;
