import type { CvContact, CvHeader, CvLink } from "../../types/cv";

const CONTACT_LABELS: Record<string, string> = { email: "이메일", phone: "연락처", tel: "전화" };
const LINK_LABELS: Record<string, string> = {
  github: "GitHub",
  linkedin: "LinkedIn",
  blog: "블로그",
  notion: "Notion",
  scholar: "Scholar",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const isHttpUrl = (value: string) => {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

/** 이용자가 화면에서 보는 profile·card 값으로 CV 헤더를 만든다. 학교·전공은 학력 섹션이 다룬다. */
export const buildCvHeader = (portfolio: { profile: unknown; card: unknown }): CvHeader => {
  const profile = isRecord(portfolio.profile) ? portfolio.profile : {};
  const card = isRecord(portfolio.card) ? portfolio.card : {};
  const contacts: CvContact[] = [];
  const links: CvLink[] = [];

  for (const field of Array.isArray(profile.fields) ? profile.fields : []) {
    if (!isRecord(field)) continue;
    const kind = text(field.kind);
    const value = text(field.value);
    if (!value) continue;
    if (CONTACT_LABELS[kind]) {
      contacts.push({ label: CONTACT_LABELS[kind], value });
    } else if (LINK_LABELS[kind] && isHttpUrl(value)) {
      links.push({ label: LINK_LABELS[kind], href: value });
    }
  }

  return { name: text(profile.name) || text(card.name), contacts, links };
};
