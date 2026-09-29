const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const nullableDate = (value: unknown): unknown => (value === "" || value === undefined ? null : value);

const migrateTimelineItem = (value: unknown, blockType?: string): unknown => {
  if (!isRecord(value)) return value;

  const migrated = { ...value };
  if (blockType === "education" || blockType === "experience" || blockType === "activities") {
    migrated.startDate = nullableDate(migrated.startDate);
    migrated.endDate = nullableDate(migrated.endDate);
  } else if (blockType === "awards" || blockType === "certification") {
    migrated.date = nullableDate(migrated.date);
  } else {
    if ("startDate" in migrated) migrated.startDate = nullableDate(migrated.startDate);
    if ("endDate" in migrated) migrated.endDate = nullableDate(migrated.endDate);
    if ("date" in migrated) migrated.date = nullableDate(migrated.date);
  }
  return migrated;
};

const migrateSkillsBlock = (block: Record<string, unknown>): Record<string, unknown> => {
  if (!Array.isArray(block.categories)) return block;

  return {
    ...block,
    categories: block.categories.map((category) => {
      if (!isRecord(category) || !Array.isArray(category.items)) return category;
      return {
        ...category,
        items: category.items.map((item) =>
          typeof item === "string" ? { name: item } : item,
        ),
      };
    }),
  };
};

export const migrateLegacyBlock = (value: unknown): unknown => {
  if (!isRecord(value) || typeof value.type !== "string") return value;

  if (value.type === "about" && value.description === undefined && typeof value.body === "string") {
    const { body: _body, ...rest } = value;
    return { ...rest, description: value.body };
  }

  if (value.type === "skills") return migrateSkillsBlock(value);

  if (Array.isArray(value.items)) {
    return {
      ...value,
      items: value.items.map((item) =>
        migrateTimelineItem(item, typeof value.type === "string" ? value.type : undefined),
      ),
    };
  }

  return value;
};

export const migrateLegacyBlocks = (value: unknown): unknown =>
  Array.isArray(value) ? value.map(migrateLegacyBlock) : value;
