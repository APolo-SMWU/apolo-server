import { AppError } from "../errors/app-error";
import { businessCardSchema, profileSchema } from "../schemas/portfolio.schema";
import type { BusinessCardData, ProfileData, ProfileField } from "../types/portfolio";
import type { OnlineCardUserProfile } from "./ai.service";

/** 최초 생성 전용. 기존 포트폴리오의 사용자 편집값에는 적용하지 않는다. */
export const buildInitialPortfolioProfile = (
  user: OnlineCardUserProfile & { organizationAddress: string | null },
): { card: BusinessCardData; profile: ProfileData } => {
  if (!user.phone) {
    throw new AppError(
      422,
      "온라인 명함 생성 전에 전화번호를 등록해주세요.",
      "PROFILE_INCOMPLETE",
    );
  }

  const headline = user.jobTitle || user.major || user.department || user.role || "Professional";
  const fields: ProfileField[] = [
    { kind: "email", label: "Email", value: user.email },
    { kind: "phone", label: "Phone", value: user.phone },
  ];
  if (user.github?.startsWith("http://") || user.github?.startsWith("https://")) {
    fields.push({ kind: "github", label: "GitHub", value: user.github });
  }

  const card = businessCardSchema.safeParse({
    name: user.name,
    headline,
    phone: user.phone,
    email: user.email,
    organizationAddress: user.organizationAddress,
  });
  const profile = profileSchema.safeParse({
    name: user.name,
    title: "",
    avatarUrl: null,
    fields,
  });
  if (!card.success || !profile.success) {
    throw new AppError(
      422,
      "온라인 명함 생성 전에 프로필의 이름·연락처·소속 정보를 확인해주세요.",
      "PROFILE_INCOMPLETE",
    );
  }
  return { card: card.data, profile: profile.data };
};
