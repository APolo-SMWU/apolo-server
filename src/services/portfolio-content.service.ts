import { generateResponseSchema, type AiGenerateResponse } from "../schemas/ai-generate.schema";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import { z } from "zod";
import { AppError } from "../errors/app-error";
import {
  contentBlockSchema,
  contentBlocksSchema,
  storedContentBlocksSchema,
} from "../schemas/portfolio.schema";
import { migrateLegacyBlocks } from "./legacy-block-compatibility";
import type {
  ContentBlock,
  SkillCategory,
  SkillItem,
  SkillsBlock,
  TimelineBlock,
  TimelineItem,
  WorkItem,
} from "../types/portfolio";

export type IdFactory = () => string;

export const PORTFOLIO_SCHEMA_VERSION = 2;

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
      categories: block.categories.map((category) => {
        const itemsByName = new Map<string, (typeof category.items)[number]>();

        for (const item of category.items) {
          const key = normalized(item.name);
          const entityIds = skillEntityIds(item);
          const existing = itemsByName.get(key);

          if (!existing) {
            const { entityId: _legacyEntityId, entityIds: _entityIds, ...itemFields } = item;
            itemsByName.set(key, {
              ...itemFields,
              id: replaceIds || !item.id ? createId() : item.id,
              ...(entityIds.length > 0 ? { entityIds } : {}),
            });
            continue;
          }

          const mergedEntityIds = skillEntityIds({
            entityIds: [...(existing.entityIds ?? []), ...entityIds],
          });
          itemsByName.set(key, {
            ...existing,
            ...(mergedEntityIds.length > 0 ? { entityIds: mergedEntityIds } : {}),
          });
        }

        return {
          ...category,
          id: replaceIds || !category.id ? createId() : category.id,
          items: [...itemsByName.values()],
        };
      }),
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
): ContentBlock[] => {
  const blocks = parseWithAppError(
    storedContentBlocksSchema,
    migrateLegacyBlocks(value),
    "저장된 콘텐츠 블록 형식이 올바르지 않습니다.",
    "INVALID_PORTFOLIO_DATA",
  );
  return blocks.map((block) => normalizeBlockIds(block, createId, false));
};

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

const mergeRefreshedSkills = (existing: SkillsBlock, incoming: SkillsBlock): SkillsBlock => {
  const categories: SkillCategory[] = existing.categories.map((category) => ({
    ...category,
    items: [...category.items],
  }));
  const initiallyEmptyCategories = new Set(
    categories.filter((category) => category.items.length === 0),
  );
  const seenEntityIds = new Set<string>();

  for (const category of categories) {
    category.items = category.items.flatMap((item) => {
      const entityIds = skillEntityIds(item);
      if (entityIds.length === 0) return [item];

      const uniqueEntityIds = entityIds.filter((entityId) => {
        const key = normalized(entityId);
        if (seenEntityIds.has(key)) return false;
        seenEntityIds.add(key);
        return true;
      });
      if (uniqueEntityIds.length === 0) return [];
      if (uniqueEntityIds.length === entityIds.length) return [item];
      return [{ ...item, entityIds: uniqueEntityIds }];
    });
  }

  for (const incomingCategory of incoming.categories) {
    for (const item of incomingCategory.items) {
      let targetCategory = categories.find(
        (candidate) => normalized(candidate.category) === normalized(incomingCategory.category),
      );
      if (!targetCategory) {
        targetCategory = { ...incomingCategory, items: [] };
        categories.push(targetCategory);
      }

      const incomingIds = skillEntityIds(item);
      const incomingIdKeys = new Set(incomingIds.map((id) => normalized(id)));
      const incomingName = normalized(item.name);
      const matchedItems = categories.flatMap((category) =>
        category.items
          .filter((candidate) => {
            const sharesEntityId = skillEntityIds(candidate).some((id) =>
              incomingIdKeys.has(normalized(id)),
            );
            const sameNameInTarget =
              category === targetCategory && normalized(candidate.name) === incomingName;
            return sharesEntityId || sameNameInTarget;
          })
          .map((candidate) => ({ category, item: candidate })),
      );

      const matchedSkillItems = matchedItems.map(({ item: matched }) => matched);
      const targetMatches = matchedItems.filter(({ category }) => category === targetCategory);
      const targetInsertionIndex = targetMatches.length
        ? targetCategory.items.indexOf(targetMatches[0]!.item)
        : targetCategory.items.length;
      const allIds = skillEntityIds({
        entityIds: [...matchedSkillItems.flatMap(skillEntityIds), ...incomingIds],
      });
      const currentHasGroupedIds = matchedSkillItems.some(
        (matched) => skillEntityIds(matched).length > 1,
      );
      const keepCurrentRepresentative = incomingIds.length === 1 && currentHasGroupedIds;
      const representative = keepCurrentRepresentative
        ? matchedSkillItems.find((matched) => skillEntityIds(matched).length > 1)!
        : item;
      const preservedItem = targetMatches[0]?.item ?? matchedSkillItems[0];
      const { entityId: _legacyEntityId, entityIds: _entityIds, ...representativeFields } =
        representative;
      const mergedItem: SkillItem = {
        ...representativeFields,
        ...(preservedItem?.id ? { id: preservedItem.id } : {}),
        ...(allIds.length > 0 ? { entityIds: allIds } : {}),
        name: representative.name,
      };

      for (const category of categories) {
        const matchedInCategory = new Set(
          matchedItems
            .filter((match) => match.category === category)
            .map((match) => match.item),
        );
        if (matchedInCategory.size > 0) {
          category.items = category.items.filter((candidate) => !matchedInCategory.has(candidate));
        }
      }

      targetCategory.items.splice(
        Math.min(targetInsertionIndex, targetCategory.items.length),
        0,
        mergedItem,
      );
    }
  }

  return {
    ...existing,
    categories: categories.filter(
      (category) => category.items.length > 0 || initiallyEmptyCategories.has(category),
    ),
  };
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
      current[existingIndex] = mergeRefreshedSkills(existing, incoming);
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

const skillEntityIds = (item: {
  entityId?: string | undefined;
  entityIds?: string[] | undefined;
}): string[] => {
  const values = [...(item.entityIds ?? []), ...(item.entityId ? [item.entityId] : [])];
  const unique = new Map<string, string>();
  for (const value of values) {
    const key = normalized(value);
    if (key && !unique.has(key)) unique.set(key, value);
  }
  return [...unique.values()];
};
