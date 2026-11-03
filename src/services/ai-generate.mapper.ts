import type { CreatePortfolioInput } from "../schemas/portfolio.schema";
import { toSeedProfileInput, type SeedProfileInput } from "./ai-profile.mapper";
import type { OnlineCardUserProfile } from "./ai.service";
import type { AiSourceAttachment } from "./portfolio-attachment";

export interface GenerateRequest extends SeedProfileInput {
  title: string;
  externalLinks: string[];
  requirements?: string;
  attachments: AiSourceAttachment[];
}

/** 디자인 정보는 Backend에 남기고 AI 콘텐츠 생성에 필요한 값만 전달한다. */
export const toGenerateRequest = (
  user: OnlineCardUserProfile,
  input: Pick<CreatePortfolioInput, "title" | "externalLinks" | "requirements">,
  attachments: AiSourceAttachment[] = [],
): GenerateRequest => ({
  ...toSeedProfileInput(user),
  title: input.title,
  externalLinks: [...input.externalLinks],
  ...(input.requirements === undefined ? {} : { requirements: input.requirements }),
  attachments,
});
