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

export interface GenerationRequest {
  user: OnlineCardUserProfile;
  sources: FetchedSource[];
  requirements?: string;
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
}

export interface RefreshedOnlineCard {
  blocks: unknown;
}

export interface OnlineCardAiProvider {
  generate(request: GenerationRequest): Promise<GeneratedOnlineCard>;
  refresh(request: RefreshRequest): Promise<RefreshedOnlineCard>;
}

const localProvider: OnlineCardAiProvider = {
  async generate({ requirements }) {
    const blocks: Array<Record<string, unknown>> = [];
    if (requirements) {
      blocks.push({ type: "about", visible: true, body: requirements });
    }

    return { blocks };
  },
  async refresh() {
    return { blocks: [] };
  },
};

let activeProvider: OnlineCardAiProvider = localProvider;

export const setOnlineCardAiProvider = (provider: OnlineCardAiProvider) => {
  activeProvider = provider;
};

export const resetOnlineCardAiProvider = () => {
  activeProvider = localProvider;
};

export const onlineCardAiService: OnlineCardAiProvider = {
  generate: (request) => activeProvider.generate(request),
  refresh: (request) => activeProvider.refresh(request),
};
