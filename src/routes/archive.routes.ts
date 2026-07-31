import { Router } from "express";
import {
  getPublicPortfoliosController,
  getPublicPortfolioByIdController,
} from "../controllers/archive.controller";

const router = Router();

router.get("/portfolios", getPublicPortfoliosController);
router.get("/portfolios/:portfolioId", getPublicPortfolioByIdController);

export default router;