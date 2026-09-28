import { generateResponseSchema, type AiGenerateResponse } from "../schemas/ai-generate.schema";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import { z } from "zod";
import { AppError } from "../errors/app-error";
import { contentBlockSchema, contentBlocksSchema } from "../schemas/portfolio.schema";
import { migrateLegacyBlocks } from "./legacy-block-compatibility";
import type {
  ContentBlock,
  TimelineBlock,
  TimelineItem,
  WorkItem,
} from "../types/portfolio";

export type IdFactory = () => string;

const blocksSchema = contentBlocksSchema;

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
        items: category.items.map((item) => ({
          ...item,
          id: replaceIds || !item.id ? createId() : item.id,
        })),
      })),
    } as unknown as ContentBlock;
  }
  return {
    ...block,
    id,
    items: block.items.map((item) =>
      ({
        ...item,
        id: replaceIds || !item.id ? createId() : item.id,
      }),
    ),
  } as unknown as ContentBlock;
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

export const normalizeStoredBlocks = (
  value: unknown,
  createId: IdFactory = randomUUID,
): ContentBlock[] => normalizeBlocks(migrateLegacyBlocks(value), createId);

export const normalizeStoredBlocksWithChange = (
  value: unknown,
  createId: IdFactory = randomUUID,
): { blocks: ContentBlock[]; changed: boolean } => {
  const blocks = normalizeStoredBlocks(value, createId);
  return {
    blocks,
    changed: !isDeepStrictEqual(blocks, value),
  };
};

export const normalizeGeneratedResponse = (
  value: unknown,
  createId: IdFactory = randomUUID,
): { blocks: ContentBlock[]; meta: AiGenerateResponse["meta"]; warnings: AiGenerateResponse["warnings"] } => {
  const generated = parseWithAppError(
    generateResponseSchema,
    value,
    "AI 생성 결과 형식이 올바르지 않습니다.",
    "INVALID_AI_RESPONSE",
  );
  return {
    blocks: normalizeBlocks(generated.blocks, createId, true),
    meta: generated.meta,
    warnings: generated.warnings,
  };
};

const normalized = (value: string | undefined) => value?.trim().toLowerCase() ?? "";

const itemFallbackKey = (blockType: string, item: object) => {
  const values = item as Record<string, unknown>;
  if (blockType === "works") {
    return `${blockType}|${normalized(String(values.kind ?? ""))}|${normalized(String(values.title ?? ""))}`;
  }
  if (blockType === "awards" || blockType === "certification") {
    return [
      blockType,
      normalized(String(values.title ?? "")),
      String(values.date ?? ""),
      normalized(String(values.issuer ?? "")),
    ].join("|");
  }
  return [
    blockType,
    String(values.startDate ?? ""),
    String(values.endDate ?? ""),
    normalized(String(values.organization ?? "")),
    normalized(String(values.role ?? "")),
    normalized(String(values.kind ?? "")),
  ].join("|");
};

const itemsMatch = (blockType: string, current: object, incoming: object) => {
  const currentEntityId = normalized(String((current as Record<string, unknown>).entityId ?? ""));
  const incomingEntityId = normalized(String((incoming as Record<string, unknown>).entityId ?? ""));
  if (currentEntityId && incomingEntityId) return currentEntityId === incomingEntityId;
  return itemFallbackKey(blockType, current) === itemFallbackKey(blockType, incoming);
};

const onlyNewItems = <T extends object>(items: T[], known: T[], blockType: string) => {
  const additions: T[] = [];
  for (const item of items) {
    if (known.some((candidate) => itemsMatch(blockType, candidate, item))) continue;
    known.push(item);
    additions.push(item);
  }
  return additions;
};

export const mergeRefreshedBlocks = (
  currentValue: unknown,
  refreshedValue: unknown,
  createId: IdFactory = randomUUID,
): ContentBlock[] => {
  const current = normalizeStoredBlocks(currentValue, createId);
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
      const known = [...existing.items];
      const additions = onlyNewItems(incoming.items, known, "works");
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
        const knownEntityIds = new Set(
          category.items
            .map((item) => normalized(item.entityId ?? ""))
            .filter(Boolean),
        );
        const knownNames = new Set(category.items.map((item) => normalized(item.name)));
        for (const item of incomingCategory.items) {
          const entityId = normalized(item.entityId ?? "");
          const name = normalized(item.name);
          if ((entityId && knownEntityIds.has(entityId)) || knownNames.has(name)) continue;
          category.items.push(item);
          if (entityId) knownEntityIds.add(entityId);
          knownNames.add(name);
        }
      }
      current[existingIndex] = { ...existing, categories };
      continue;
    }

    if ("items" in existing && "items" in incoming) {
      const existingTimeline = existing as TimelineBlock;
      const incomingTimeline = incoming as TimelineBlock;
      const known = [...existingTimeline.items];
      const additions = onlyNewItems<TimelineItem>(incomingTimeline.items, known, incomingTimeline.type);
      current[existingIndex] = {
        ...existingTimeline,
        items: [...existingTimeline.items, ...additions],
      } as ContentBlock;
    }
  }

  return current;
};
