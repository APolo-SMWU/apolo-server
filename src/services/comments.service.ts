import { AppError } from "../errors/app-error";
import prisma from "../lib/prisma";

// 댓글 작성
export const createComment = async (
  userId: number,
  portfolioId: number,
  content: string
) => {
  const portfolio = await prisma.portfolio.findFirst({
    where: {
      id: portfolioId,
      isPublic: true,
    },
  });

  if (!portfolio) {
    throw new AppError(404, "공개 포트폴리오를 찾을 수 없습니다.");
  }

  const comment = await prisma.comment.create({
    data: {
      portfolioId,
      authorId: userId,
      content,
    },
  });

  return comment;
};

// 댓글 목록 조회
export const getCommentsByPortfolioId = async (portfolioId: number) => {
  const portfolio = await prisma.portfolio.findFirst({
    where: {
      id: portfolioId,
      isPublic: true,
    },
  });

  if (!portfolio) {
    throw new AppError(404, "공개 포트폴리오를 찾을 수 없습니다.");
  }

  const comments = await prisma.comment.findMany({
    where: {
      portfolioId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return comments;
};

// 댓글 삭제
export const deleteComment = async (userId: number, commentId: number) => {
  const comment = await prisma.comment.findUnique({
    where: {
      id: commentId,
    },
  });

  if (!comment) {
    throw new AppError(404, "댓글을 찾을 수 없습니다.");
  }

  if (comment.authorId !== userId) {
    throw new AppError(403, "본인이 작성한 댓글만 삭제할 수 있습니다.");
  }

  const deletedComment = await prisma.comment.delete({
    where: {
      id: commentId,
    },
  });

  return deletedComment;
};

export const updateComment = async (
  userId: number,
  commentId: number,
  content: string
) => {
  const comment = await prisma.comment.findUnique({
    where: {
      id: commentId,
    },
  });

  if (!comment) {
    throw new AppError(404, "댓글을 찾을 수 없습니다.");
  }

  if (comment.authorId !== userId) {
    throw new AppError(403, "본인이 작성한 댓글만 수정할 수 있습니다.");
  }

  const updatedComment = await prisma.comment.update({
    where: {
      id: commentId,
    },
    data: {
      content,
    },
  });

  return updatedComment;
};
