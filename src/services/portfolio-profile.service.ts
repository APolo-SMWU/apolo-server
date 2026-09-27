import { AppError } from "../errors/app-error";
import { businessCardSchema, profileSchema } from "../schemas/portfolio.schema";
import type { BusinessCardData, ProfileData, ProfileField } from "../types/portfolio";
import type { OnlineCardUserProfile } from "./ai.service";

const withHeadlineSuffix = (value: string | null, suffix: string) => {
  const normalized = value?.trim();
  if (!normalized) return null;
  return normalized.endsWith(suffix) ? normalized : `${normalized} ${suffix}`;
};

const textField = (
  kind: Extract<ProfileField["kind"], "tel" | "company" | "university">,
  label: string,
  value: string | null,
): ProfileField | null => {
  const normalized = value?.trim();
  if (!normalized) return null;
  return { kind, label, value: normalized };
};

const externalProfileField = (sourceLink: string): ProfileField | null => {
  let hostname: string;
  try {
    hostname = new URL(sourceLink).hostname.toLowerCase();
  } catch {
    return null;
  }

  if (
    hostname === "notion.site" ||
    hostname.endsWith(".notion.site") ||
    hostname === "notion.so" ||
    hostname.endsWith(".notion.so")
  ) {
    return { kind: "notion", label: "Notion", value: sourceLink };
  }
  if (hostname === "scholar.google.com" || hostname.endsWith(".scholar.google.com")) {
    return { kind: "scholar", label: "Scholar", value: sourceLink };
  }
  if (hostname === "linkedin.com" || hostname.endsWith(".linkedin.com")) {
    return { kind: "linkedin", label: "LinkedIn", value: sourceLink };
  }
  if (hostname === "blog.naver.com" || hostname.endsWith(".blog.naver.com")) {
    return { kind: "blog", label: "Blog", value: sourceLink };
  }
  return null;
};

const addUniqueField = (
  fields: ProfileField[],
  field: ProfileField | null,
  seenKinds: Set<ProfileField["kind"]>,
) => {
  if (!field || seenKinds.has(field.kind)) return;
  fields.push(field);
  seenKinds.add(field.kind);
};

/** 최초 생성 전용. 기존 포트폴리오의 사용자 편집값에는 적용하지 않는다. */
export const buildInitialPortfolioProfile = (
  user: OnlineCardUserProfile & { organizationAddress: string | null },
  sourceLinks: string[] = [],
): { card: BusinessCardData; profile: ProfileData } => {
  if (!user.phone) {
    throw new AppError(
      422,
      "온라인 명함 생성 전에 전화번호를 등록해주세요.",
      "PROFILE_INCOMPLETE",
    );
  }

  const role = user.role?.toLowerCase();
  const headline =
    role === "professional"
      ? user.jobTitle?.trim() || "Professional"
      : role === "professor"
        ? withHeadlineSuffix(user.department, "교수") || "Professor"
        : role === "student"
          ? withHeadlineSuffix(user.major, "학생") || "Student"
          : "Professional";
  const fields: ProfileField[] = [
    { kind: "email", label: "Email", value: user.email },
    { kind: "phone", label: "Phone", value: user.phone },
  ];
  const seenKinds = new Set<ProfileField["kind"]>(["email", "phone"]);

  if (role === "student") {
    addUniqueField(fields, textField("university", "University", user.university), seenKinds);
  } else if (role === "professor") {
    addUniqueField(fields, textField("university", "University", user.university), seenKinds);
    addUniqueField(fields, textField("tel", "Tel", user.tel), seenKinds);
  } else if (role === "professional") {
    addUniqueField(fields, textField("company", "Company", user.company), seenKinds);
    addUniqueField(fields, textField("tel", "Tel", user.tel), seenKinds);
  }

  if (user.github?.startsWith("http://") || user.github?.startsWith("https://")) {
    addUniqueField(fields, { kind: "github", label: "GitHub", value: user.github }, seenKinds);
  }
  for (const sourceLink of sourceLinks) {
    addUniqueField(fields, externalProfileField(sourceLink), seenKinds);
  }

  const card = businessCardSchema.safeParse({
    name: user.name,
    headline,
    phone: user.phone,
    tel: user.tel,
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
  // 새 명함에는 tel 키를 항상 포함하고, 기존 명함의 누락 가능성은 타입에서 허용한다.
  return { card: { ...card.data, tel: card.data.tel ?? null }, profile: profile.data };
};
