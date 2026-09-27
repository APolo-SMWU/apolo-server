import type { CreatePortfolioInput } from "../schemas/portfolio.schema";
import { toSeedProfileInput, type SeedProfileInput } from "./ai-profile.mapper";
import type { OnlineCardUserProfile } from "./ai.service";

export interface GenerateRequest extends SeedProfileInput {
  title: string;
  externalLinks: string[];
  requirements?: string;
  attachments: [];
}

/** 디자인 정보는 Backend에 남기고 AI 콘텐츠 생성에 필요한 값만 전달한다. */
export const toGenerateRequest = (
  user: OnlineCardUserProfile,
  input: Pick<CreatePortfolioInput, "title" | "externalLinks" | "requirements">,
): GenerateRequest => ({
  ...toSeedProfileInput(user),
  title: input.title,
  externalLinks: [...input.externalLinks],
  ...(input.requirements === undefined ? {} : { requirements: input.requirements }),
  attachments: [],
});
