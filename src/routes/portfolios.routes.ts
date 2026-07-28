import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { createPortfolioController, getMyPortfoliosController, getPortfolioByIdController, updatePortfolioController, updatePortfolioVisibilityController } from "../controllers/portfolios.controller";

const router = Router();

router.post("/", authMiddleware, createPortfolioController);
router.get("/", authMiddleware, getMyPortfoliosController);
router.get("/:portfolioId", authMiddleware, getPortfolioByIdController);
router.patch("/:portfolioId", authMiddleware, updatePortfolioController);
router.patch(
  "/:portfolioId/visibility",
  authMiddleware,
  updatePortfolioVisibilityController
);

export default router;