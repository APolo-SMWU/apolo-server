import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { deleteComment, updateComment } from "../services/comments.service";
import { validateRequest } from "../utils/validate-request";
import { commentIdParamSchema } from "../schemas/common.schema";
import { createCommentSchema } from "../schemas/comment.schema";

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

export const updateCommentController = async (
  req: AuthRequest,
  res: Response
) => {
  const userId = req.user?.userId;
  const { commentId } = validateRequest(commentIdParamSchema, req.params);
  const { content } = validateRequest(createCommentSchema, req.body);

  if (!userId) {
    return res.status(401).json({
      message: "인증된 사용자 정보가 없습니다.",
    });
  }

  const comment = await updateComment(userId, commentId, content);

  res.status(200).json({
    message: "댓글 수정 성공",
    comment,
  });
};