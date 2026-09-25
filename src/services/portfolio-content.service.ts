import { createHash, randomUUID } from "node:crypto";

import { z } from "zod";
import { AppError } from "../errors/app-error";
import {
  contentBlockSchema,
  sourceSnapshotSchema,
} from "../schemas/portfolio.schema";
import type {
  ContentBlock,
  SourceSnapshot,
  TimelineBlock,
  TimelineItem,
  WorkItem,
} from "../types/portfolio";

export interface FetchedSource {
  url: string;
  content: string;
}

export type SourceFetcher = (url: string) => Promise<FetchedSource>;
export type IdFactory = () => string;
export type Clock = () => Date;

const blocksSchema = z.array(contentBlockSchema);
const snapshotsSchema = z.array(sourceSnapshotSchema);

const invalidData = (message: string, errorCode = "INVALID_PORTFOLIO_DATA") =>
  new AppError(500, message, errorCode);

const parseWithAppError = <T>(
  parser: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } },
  value: unknown,
  message: string,
  errorCode: string,
): T => {
  const result = parser.safeParse(value);
  if (!result.success) {
    throw invalidData(message, errorCode);
  }
  return result.data;
};

export const normalizeSourceLinks = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    throw invalidData("저장된 외부 링크 형식이 올바르지 않습니다.");
  }

  const unique = new Set<string>();
  for (const candidate of value) {
    if (typeof candidate !== "string") {
      throw invalidData("저장된 외부 링크 형식이 올바르지 않습니다.");
    }
    let parsed: URL;
    try {
      parsed = new URL(candidate.trim());
    } catch {
      throw invalidData("저장된 외부 링크 형식이 올바르지 않습니다.");
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw invalidData("저장된 외부 링크 형식이 올바르지 않습니다.");
    }
    unique.add(parsed.toString());
  }
  return [...unique];
};

const normalizeBlockIds = (
  block: z.infer<typeof contentBlockSchema>,
  createId: IdFactory,
  replaceIds: boolean,
): ContentBlock => {
  const id = replaceIds || !block.id ? createId() : block.id;

  if (block.type === "about") {
    return { ...block, id };
  }
  if (block.type === "works") {
    return {
      ...block,
      id,
      items: block.items.map((item) =>
        ({
          ...item,
          id: replaceIds || !item.id ? createId() : item.id,
        }) as WorkItem,
      ),
    };
  }
  if (block.type === "skills") {
    return {
      ...block,
      id,
      categories: block.categories.map((category) => ({
        ...category,
        id: replaceIds || !category.id ? createId() : category.id,
      })),
    };
  }
  return {
    ...block,
    id,
    items: block.items.map((item) =>
      ({
        ...item,
        id: replaceIds || !item.id ? createId() : item.id,
      }) as TimelineItem,
    ),
  };
};

export const normalizeBlocks = (
  value: unknown,
  createId: IdFactory = randomUUID,
  replaceIds = false,
): ContentBlock[] => {
  const blocks = parseWithAppError(
    blocksSchema,
    value,
    "콘텐츠 블록 형식이 올바르지 않습니다.",
    "INVALID_CONTENT",
  );
  return blocks.map((block) => normalizeBlockIds(block, createId, replaceIds));
};

export const normalizeGeneratedBlocks = (
  value: unknown,
  createId: IdFactory = randomUUID,
): ContentBlock[] => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw invalidData("AI 생성 결과 형식이 올바르지 않습니다.", "INVALID_AI_RESPONSE");
  }
  const generated = value as Record<string, unknown>;
  const blocks = parseWithAppError(
    blocksSchema,
    generated.blocks,
    "AI가 생성한 콘텐츠 형식이 올바르지 않습니다.",
    "INVALID_AI_RESPONSE",
  );
  return blocks.map((block) => normalizeBlockIds(block, createId, true));
};

export const parseRefreshedBlocks = (
  value: unknown,
): z.infer<typeof contentBlockSchema>[] => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw invalidData("AI 갱신 결과 형식이 올바르지 않습니다.", "INVALID_AI_RESPONSE");
  }
  return parseWithAppError(
    blocksSchema,
    (value as Record<string, unknown>).blocks,
    "AI가 갱신한 콘텐츠 형식이 올바르지 않습니다.",
    "INVALID_AI_RESPONSE",
  );
};

export const parsePersistedSnapshots = (value: unknown): SourceSnapshot[] =>
  parseWithAppError(
    snapshotsSchema,
    value,
    "저장된 소스 스냅샷 형식이 올바르지 않습니다.",
    "INVALID_PORTFOLIO_DATA",
  );

export const hashSourceContent = (content: string): string =>
  `sha256:${createHash("sha256").update(content).digest("hex")}`;

export interface SourceRefreshResult {
  sources: FetchedSource[];
  changedSources: FetchedSource[];
  snapshots: SourceSnapshot[];
}

export const fetchSourceUpdates = async (
  linksValue: unknown,
  snapshotsValue: unknown,
  sourceFetcher: SourceFetcher,
  now: Clock = () => new Date(),
): Promise<SourceRefreshResult> => {
  const links = normalizeSourceLinks(linksValue);
  const previousSnapshots = parsePersistedSnapshots(snapshotsValue);
  const previousHashes = new Map(
    previousSnapshots.map((snapshot) => [snapshot.url, snapshot.contentHash]),
  );

  let sources: FetchedSource[];
  try {
    sources = await Promise.all(
      links.map(async (url) => {
        const fetched = await sourceFetcher(url);
        if (!fetched || typeof fetched.content !== "string") {
          throw new Error("Source fetcher returned invalid content");
        }
        return { url, content: fetched.content };
      }),
    );
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(502, "외부 소스를 가져오지 못했습니다.", "SOURCE_FETCH_FAILED");
  }

  const fetchedAt = now().toISOString();
  const snapshots = sources.map(({ url, content }) => ({
    url,
    contentHash: hashSourceContent(content),
    lastFetchedAt: fetchedAt,
  }));
  const changedSources = sources.filter(
    ({ url, content }) => previousHashes.get(url) !== hashSourceContent(content),
  );

  return { sources, changedSources, snapshots };
};

const normalized = (value: string | undefined) => value?.trim().toLowerCase() ?? "";

const timelineItemKey = (blockType: string, item: {
  startDate: string;
  endDate?: string;
  organization: string;
  role?: string;
  kind?: string;
}) =>
  [
    blockType,
    item.startDate,
    item.endDate ?? "",
    normalized(item.organization),
    normalized(item.role),
    item.kind ?? "",
  ].join("|");

const workItemKey = (item: { kind: string; title: string }) =>
  `${item.kind}|${normalized(item.title)}`;

const onlyNewItems = <T>(items: T[], known: Set<string>, keyOf: (item: T) => string) =>
  items.filter((item) => {
    const key = keyOf(item);
    if (known.has(key)) return false;
    known.add(key);
    return true;
  });

export const mergeRefreshedBlocks = (
  currentValue: unknown,
  refreshedValue: unknown,
  createId: IdFactory = randomUUID,
): ContentBlock[] => {
  const current = normalizeBlocks(currentValue, createId);
  const refreshed = normalizeBlocks(refreshedValue, createId, true);

  for (const incoming of refreshed) {
    const existingIndex = current.findIndex((block) => block.type === incoming.type);
    if (existingIndex < 0) {
      current.push(incoming);
      continue;
    }

    const existing = current[existingIndex]!;
    if (existing.type === "about" || incoming.type === "about") {
      continue;
    }

    if (existing.type === "works" && incoming.type === "works") {
      const known = new Set(existing.items.map(workItemKey));
      const additions = onlyNewItems(incoming.items, known, workItemKey);
      current[existingIndex] = { ...existing, items: [...existing.items, ...additions] };
      continue;
    }

    if (existing.type === "skills" && incoming.type === "skills") {
      const categories = existing.categories.map((category) => ({ ...category, items: [...category.items] }));
      for (const incomingCategory of incoming.categories) {
        const category = categories.find(
          (candidate) => normalized(candidate.category) === normalized(incomingCategory.category),
        );
        if (!category) {
          categories.push(incomingCategory);
          continue;
        }
        const knownItems = new Set(category.items.map(normalized));
        category.items.push(...onlyNewItems(incomingCategory.items, knownItems, normalized));
      }
      current[existingIndex] = { ...existing, categories };
      continue;
    }

    if ("items" in existing && "items" in incoming) {
      const existingTimeline = existing as TimelineBlock;
      const incomingTimeline = incoming as TimelineBlock;
      const known = new Set(
        existingTimeline.items.map((item) => timelineItemKey(existingTimeline.type, item)),
      );
      const additions = onlyNewItems(
        incomingTimeline.items,
        known,
        (item) => timelineItemKey(incomingTimeline.type, item),
      );
      current[existingIndex] = {
        ...existingTimeline,
        items: [...existingTimeline.items, ...additions],
      };
    }
  }

  return current;
};

export const defaultSourceFetcher: SourceFetcher = async (url) => {
  const response = await fetch(url, {
    headers: { accept: "text/html,application/json,text/plain" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Source request failed with ${response.status}`);
  }
  return { url, content: await response.text() };
};
