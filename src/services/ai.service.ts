import { generateViaHttp } from "./ai-http.service";
import type { GenerateRequest } from "./ai-generate.mapper";
import type { FetchedSource } from "./portfolio-content.service";

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

export interface RefreshRequest {
  portfolio: {
    title: string;
    card: unknown;
    profile: unknown;
    blocks: unknown;
  };
  changedSources: FetchedSource[];
}

export interface GeneratedOnlineCard {
  blocks: unknown;
  meta: unknown;
  warnings: unknown;
}

export interface RefreshedOnlineCard {
  blocks: unknown;
}

export interface OnlineCardAiProvider {
  generate(request: GenerateRequest): Promise<GeneratedOnlineCard>;
  refresh(request: RefreshRequest): Promise<RefreshedOnlineCard>;
}

const httpProvider: OnlineCardAiProvider = {
  generate: generateViaHttp,
  async refresh() {
    return { blocks: [] };
  },
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
  refresh: (request) => activeProvider.refresh(request),
};
