import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { updateMyProfile, updateMyPassword } from "../services/users.service";
import { validateRequest } from "../utils/validate-request";
import {
  updateProfileSchema,
  updatePasswordSchema,
} from "../schemas/user.schema";

export const updateMyProfileController = async (
  req: AuthRequest,
  res: Response
) => {
  const userId = req.user?.userId;
  const { nickname } = validateRequest(updateProfileSchema, req.body);

  if (!userId) {
    return res.status(401).json({
      message: "인증된 사용자 정보가 없습니다.",
    });
  }

  const user = await updateMyProfile(userId, nickname);

  res.status(200).json({
    message: "내 프로필 수정 성공",
    user,
  });
};

export const updateMyPasswordController = async (
  req: AuthRequest,
  res: Response
) => {
  const userId = req.user?.userId;
  const { currentPassword, newPassword, newPasswordCheck } = validateRequest(
    updatePasswordSchema,
    req.body
  );

  if (!userId) {
    return res.status(401).json({
      message: "인증된 사용자 정보가 없습니다.",
    });
  }

  const result = await updateMyPassword(
    userId,
    currentPassword,
    newPassword,
    newPasswordCheck
  );

  res.status(200).json(result);
};