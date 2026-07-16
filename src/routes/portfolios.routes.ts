import { Router } from "express";
import { getPortfolios } from "../controllers/portfolios.controller";

const router = Router();

router.get("/", getPortfolios);

export default router;