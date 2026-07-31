import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { createPortfolioController,
        getMyPortfoliosController,
        getPortfolioByIdController, 
        updatePortfolioController, 
        updatePortfolioVisibilityController,
        generatePortfolioController,
        editPortfolioWithAiController,
        createCommentController,
        getCommentsByPortfolioController,
} from "../controllers/portfolios.controller";

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
router.post("/:portfolioId/generate", authMiddleware, generatePortfolioController);
router.post("/:portfolioId/ai-edit", authMiddleware, editPortfolioWithAiController);
router.post("/:portfolioId/comments", authMiddleware, createCommentController);
router.get("/:portfolioId/comments", getCommentsByPortfolioController);

export default router;