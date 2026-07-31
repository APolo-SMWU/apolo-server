import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { deleteComment } from "../services/comments.service";
import { validateRequest } from "../utils/validate-request";
import { commentIdParamSchema } from "../schemas/common.schema";

export const deleteCommentController = async (
  req: AuthRequest,
  res: Response
) => {
  const userId = req.user?.userId;
  const { commentId } = validateRequest(commentIdParamSchema, req.params);

  if (!userId) {
    return res.status(401).json({
      message: "인증된 사용자 정보가 없습니다.",
    });
  }

  const comment = await deleteComment(userId, commentId);

  res.status(200).json({
    message: "댓글 삭제 성공",
    comment,
  });
};