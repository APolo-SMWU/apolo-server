import assert from "node:assert/strict";
import test from "node:test";

import { normalizeBlocks, normalizeStoredBlocks } from "./portfolio-content.service";
import type { SkillsBlock } from "../types/portfolio";

const makeIdFactory = () => {
  let nextId = 1;
  return () => `00000000-0000-4000-8000-${String(nextId++).padStart(12, "0")}`;
};

const readSkills = (value: unknown): SkillsBlock => {
  const [block] = normalizeStoredBlocks(value, makeIdFactory());
  assert.ok(block);
  assert.equal(block.type, "skills");
  return block;
};

const storedSkills = (items: unknown[]) => [
  {
    type: "skills",
    visible: true,
    categories: [{ category: "Tools", items }],
  },
];

test("legacy Skill entityId is normalized to entityIds when read", () => {
  const skills = readSkills(
    storedSkills([{ entityId: "kg-skill-1", name: "TypeScript" }]),
  );

  assert.deepEqual(skills.categories[0]?.items[0]?.entityIds, ["kg-skill-1"]);
  assert.equal("entityId" in (skills.categories[0]?.items[0] ?? {}), false);
});

test("multiple Skill entityIds survive normalization and a stored read", () => {
  const normalizedForSave = normalizeBlocks(
    storedSkills([
      {
        entityId: "kg-skill-1",
        entityIds: ["kg-skill-1", "kg-skill-2"],
        name: "Azure",
      },
    ]),
    makeIdFactory(),
  );
  const readBack = readSkills(JSON.parse(JSON.stringify(normalizedForSave)));

  assert.deepEqual(readBack.categories[0]?.items[0]?.entityIds, [
    "kg-skill-1",
    "kg-skill-2",
  ]);
});

test("a manually added Skill without KG IDs remains valid", () => {
  const skills = readSkills(storedSkills([{ name: "Figma" }]));
  const item = skills.categories[0]?.items[0];

  assert.ok(item);
  assert.equal(item.name, "Figma");
  assert.equal("entityId" in item, false);
  assert.equal("entityIds" in item, false);
});

test("duplicate Skill representative names are shown once and preserve all KG IDs", () => {
  const skills = readSkills(
    storedSkills([
      { entityId: "kg-azure", name: "Azure" },
      { entityIds: ["kg-aci", "kg-azure"], name: "azure" },
      { name: "Figma" },
    ]),
  );

  assert.deepEqual(
    skills.categories[0]?.items.map((item) => item.name),
    ["Azure", "Figma"],
  );
  assert.deepEqual(skills.categories[0]?.items[0]?.entityIds, [
    "kg-azure",
    "kg-aci",
  ]);
});
