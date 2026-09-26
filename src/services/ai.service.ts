import { AppError } from "../errors/app-error";
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
  card: unknown;
  profile: unknown;
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
  async generate({ user, requirements }) {
    if (!user.phone) {
      throw new AppError(
        422,
        "온라인 명함 생성 전에 전화번호를 등록해주세요.",
        "PROFILE_INCOMPLETE",
      );
    }

    const headline =
      user.jobTitle || user.major || user.department || user.role || "Professional";
    const fields: Array<{ kind: string; label: string; value: string }> = [
      { kind: "email", label: "Email", value: user.email },
      { kind: "phone", label: "Phone", value: user.phone },
    ];
    if (user.github?.startsWith("http://") || user.github?.startsWith("https://")) {
      fields.push({ kind: "github", label: "GitHub", value: user.github });
    }

    const blocks: Array<Record<string, unknown>> = [];
    if (requirements) {
      blocks.push({ type: "about", visible: true, body: requirements });
    }

    return {
      card: {
        name: user.name,
        headline,
        phone: user.phone,
        email: user.email,
        // 실제 주소는 Backend가 생성 결과에 내부 DB 값으로 채운다.
        organizationAddress: null,
      },
      profile: {
        name: user.name,
        title: headline,
        avatarUrl: null,
        fields,
      },
      blocks,
    };
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
