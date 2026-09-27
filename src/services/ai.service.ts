import { generateViaHttp, updateContentViaHttp } from "./ai-http.service";
import type { GenerateRequest } from "./ai-generate.mapper";

export interface OnlineCardUserProfile {
  id: number;
  email: string;
  name: string;
  role: string | null;
  phone: string | null;
  github: string | null;
  company: string | null;
  jobTitle: string | null;
  tel: string | null;
  university: string | null;
  department: string | null;
  major: string | null;
}

export interface UpdateContentRequest {
  userId: number;
  sourceLinks: string[];
  requirements?: string;
}

export interface GeneratedOnlineCard {
  blocks: unknown;
  meta: unknown;
  warnings: unknown;
}

export interface OnlineCardAiProvider {
  generate(request: GenerateRequest): Promise<GeneratedOnlineCard>;
  updateContent(request: UpdateContentRequest): Promise<GeneratedOnlineCard>;
}

const httpProvider: OnlineCardAiProvider = {
  generate: generateViaHttp,
  updateContent: updateContentViaHttp,
};

let activeProvider: OnlineCardAiProvider = httpProvider;

export const setOnlineCardAiProvider = (provider: OnlineCardAiProvider) => {
  activeProvider = provider;
};

export const resetOnlineCardAiProvider = () => {
  activeProvider = httpProvider;
};

export const onlineCardAiService: OnlineCardAiProvider = {
  generate: (request) => activeProvider.generate(request),
  updateContent: (request) => activeProvider.updateContent(request),
};
