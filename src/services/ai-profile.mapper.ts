import { AppError } from "../errors/app-error";
import type { OnlineCardUserProfile } from "./ai.service";

/** AI의 기존 SeedProfileInput 계약 **/
export interface SeedProfileInput {
  userId: number;
  userType: "student" | "professor" | "professional";
  myPageProfile: Omit<OnlineCardUserProfile, "id" | "role">;
}

export const mapUserType = (role: string | null): SeedProfileInput["userType"] => {
  switch (role?.toLocaleLowerCase()) {
    case "student":
      return "student";
    case "professor":
      return "professor";
    case "professional":
      return "professional";
    default:
      throw new AppError(
        422,
        "온라인 명함 생성 전에 사용자 유형을 등록해주세요.",
        "PROFILE_INCOMPLETE",
      );
  }
};

/** DB에서 읽은 프로필을 변환한다. 값 정규화·DB 조회·HTTP 호출은 하지 않는다. */
export const toSeedProfileInput = (user: OnlineCardUserProfile): SeedProfileInput => ({
  userId: user.id,
  userType: mapUserType(user.role),
  myPageProfile: {
    name: user.name,
    email: user.email,
    phone: user.phone,
    github: user.github,
    company: user.company,
    jobTitle: user.jobTitle,
    tel: user.tel,
    university: user.university,
    department: user.department,
    major: user.major,
  },
});
