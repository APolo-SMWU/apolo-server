import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { createPortfolioController, getMyPortfoliosController, getPortfolioByIdController, updatePortfolioController, deletePortfolioController, updateContentController, createShareController, uploadPortfolioAvatarController, getPortfolioAvatarController, uploadPortfolioWorkImageController } from "../controllers/portfolios.controller";
import { portfolioAvatarUpload } from "../middlewares/portfolio-avatar-upload";
import { portfolioWorkImageUpload } from "../middlewares/portfolio-work-image-upload";
import { portfolioGenerationUpload } from "../middlewares/portfolio-generation-upload";

const router = Router();
router.get("/", authMiddleware, getMyPortfoliosController);
router.post("/generate", authMiddleware, portfolioGenerationUpload, createPortfolioController);
router.get("/:portfolioId", authMiddleware, getPortfolioByIdController);
router.patch("/:portfolioId", authMiddleware, updatePortfolioController);
router.delete("/:portfolioId", authMiddleware, deletePortfolioController);
router.post("/:portfolioId/update-content", authMiddleware, updateContentController);
router.post("/:portfolioId/share", authMiddleware, createShareController);
router.post("/:portfolioId/profile/avatar", authMiddleware, portfolioAvatarUpload, uploadPortfolioAvatarController);
router.get("/:portfolioId/profile/avatar", authMiddleware, getPortfolioAvatarController);
router.post("/:portfolioId/works/:itemId/image", authMiddleware, portfolioWorkImageUpload, uploadPortfolioWorkImageController);
export default router;
