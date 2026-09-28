import { generateResponseSchema, type AiGenerateResponse } from "../schemas/ai-generate.schema";
import { randomUUID } from "node:crypto";

import { z } from "zod";
import { AppError } from "../errors/app-error";
import { contentBlockSchema } from "../schemas/portfolio.schema";
import { migrateLegacyBlocks } from "./legacy-block-compatibility";
import type {
  ContentBlock,
  TimelineBlock,
  TimelineItem,
  WorkItem,
} from "../types/portfolio";

export type IdFactory = () => string;

const blocksSchema = z.array(contentBlockSchema);

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

const itemKey = (blockType: string, item: object) => {
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
      const known = new Set(existing.items.map((item) => itemKey("works", item)));
      const additions = onlyNewItems(incoming.items, known, (item) => itemKey("works", item));
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
        const knownItems = new Set(category.items.map((item) => normalized(item.name)));
        category.items.push(
          ...onlyNewItems(
            incomingCategory.items,
            knownItems,
            (item) => normalized(item.name),
          ),
        );
      }
      current[existingIndex] = { ...existing, categories };
      continue;
    }

    if ("items" in existing && "items" in incoming) {
      const existingTimeline = existing as TimelineBlock;
      const incomingTimeline = incoming as TimelineBlock;
      const known = new Set(
        existingTimeline.items.map((item) => itemKey(existingTimeline.type, item)),
      );
      const additions = onlyNewItems<TimelineItem>(
        incomingTimeline.items,
        known,
        (item) => itemKey(incomingTimeline.type, item),
      );
      current[existingIndex] = {
        ...existingTimeline,
        items: [...existingTimeline.items, ...additions],
      } as ContentBlock;
    }
  }

  return current;
};
