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
        updatePortfolioShareController,
} from "../controllers/portfolios.controller";
import { getPortfolioVersionsController,
         getPortfolioVersionByIdController,
} from "../controllers/versions.controller";

const router = Router();

router.post("/", authMiddleware, createPortfolioController);
router.get("/", authMiddleware, getMyPortfoliosController);
router.get("/:portfolioId", authMiddleware, getPortfolioByIdController);
router.patch("/:portfolioId", authMiddleware, updatePortfolioController);
router.patch("/:portfolioId/visibility", authMiddleware, updatePortfolioVisibilityController);
router.post("/:portfolioId/generate", authMiddleware, generatePortfolioController);
router.post("/:portfolioId/ai-edit", authMiddleware, editPortfolioWithAiController);
router.post("/:portfolioId/comments", authMiddleware, createCommentController);
router.get("/:portfolioId/comments", getCommentsByPortfolioController);
router.get("/:portfolioId/versions", authMiddleware, getPortfolioVersionsController);
router.get("/:portfolioId/versions/:versionId", authMiddleware, getPortfolioVersionByIdController);
router.patch("/:portfolioId/share", authMiddleware, updatePortfolioShareController);

export default router;