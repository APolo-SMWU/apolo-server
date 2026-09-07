import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import {
  completeOnboarding,
  getMyProfile,
  updateMyProfile,
  updateMyPassword,
} from "../services/users.service";
import { validateRequest } from "../utils/validate-request";
import { onboardingSchema, updatePasswordSchema, updateProfileSchema } from "../schemas/onboarding.schema";

export const getMyProfileController = async (
  req: AuthRequest,
  res: Response
) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({
      message: "인증된 사용자 정보가 없습니다.",
    });
  }

  const user = await getMyProfile(userId);

  res.status(200).json({
    message: "내 정보 조회 성공",
    user,
  });
};

export const completeOnboardingController = async (
  req: AuthRequest,
  res: Response
) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({
      message: "인증된 사용자 정보가 없습니다.",
    });
  }

  const input = validateRequest(onboardingSchema, req.body);
  const user = await completeOnboarding(userId, input);

  res.status(201).json({
    message: "온보딩 정보 저장 성공",
    user,
  });
};

export const updateMyProfileController = async (
  req: AuthRequest,
  res: Response
) => {
  const userId = req.user?.userId;
  const input = validateRequest(updateProfileSchema, req.body);

  if (!userId) {
    return res.status(401).json({
      message: "인증된 사용자 정보가 없습니다.",
    });
  }

  const user = await updateMyProfile(userId, input);

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
