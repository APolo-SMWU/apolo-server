import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  contentBlockSchema,
  createPortfolioSchema,
  sourceSnapshotSchema,
  updateContentSchema,
  updatePortfolioSchema,
} from "./portfolio.schema.js";
import type { PortfolioDocument, ProfileData } from "../types/portfolio.js";

const validGenerationInput = {
  title: "학회 지원용",
  cardDesignId: "classic-card",
  siteDesignId: "classic-site",
  externalLinks: ["https://github.com/example"],
  requirements: "프론트엔드 경험이 잘 드러나게 만들어주세요.",
};

const validProfile: ProfileData = {
  name: "PARK DA-IN",
  title: "Frontend Developer",
  avatarUrl: null,
  fields: [
    { kind: "email", label: "Email", value: "example@email.com" },
    { kind: "phone", label: "Phone", value: "010-1234-5678" },
    {
      kind: "github",
      label: "GitHub",
      value: "https://github.com/example",
    },
  ],
};

describe("createPortfolioSchema", () => {
  it("requires title, both design IDs, and at least one external link", () => {
    assert.equal(createPortfolioSchema.safeParse(validGenerationInput).success, true);

    for (const field of [
      "title",
      "cardDesignId",
      "siteDesignId",
      "externalLinks",
    ] as const) {
      const input: Partial<typeof validGenerationInput> = {
        ...validGenerationInput,
      };
      delete input[field];
      assert.equal(
        createPortfolioSchema.safeParse(input).success,
        false,
        `${field} must be required`,
      );
    }

    assert.equal(
      createPortfolioSchema.safeParse({
        ...validGenerationInput,
        externalLinks: [],
      }).success,
      false,
    );
  });

  it("accepts only HTTP(S) external links", () => {
    assert.equal(
      createPortfolioSchema.safeParse({
        ...validGenerationInput,
        externalLinks: ["ftp://example.com/profile"],
      }).success,
      false,
    );
  });

  it("rejects legacy portfolio fields instead of silently stripping them", () => {
    assert.equal(
      createPortfolioSchema.safeParse({
        ...validGenerationInput,
        jobRole: "Frontend Developer",
        careerLevel: "Junior",
        directionPrompt: "Legacy prompt",
        currentContentJson: {},
        isPublic: true,
      }).success,
      false,
    );
  });
});

describe("contentBlockSchema", () => {
  it("accepts About, all Timeline variants, Works, and Skills blocks", () => {
    const blocks = [
      {
        type: "about",
        visible: true,
        body: "사용자 경험에 관심이 많습니다.",
      },
      ...[
        "education",
        "experience",
        "activities",
        "awards",
        "certification",
      ].map((type) => ({
        type,
        visible: true,
        items: [
          {
            startDate: "2024.03",
            endDate: "Present",
            organization: "APolo",
            role: "Frontend Developer",
            description: "UI 시스템 구축",
            kind: "fulltime",
          },
        ],
      })),
      {
        type: "works",
        visible: true,
        items: [
          {
            kind: "project",
            title: "APolo",
            role: "Frontend Leader",
            skills: ["React", "TypeScript"],
            description: "온라인 명함 서비스",
            imageUrl: "https://cdn.example.com/project.jpg",
            links: [
              {
                label: "GitHub",
                href: "https://github.com/example/project",
              },
            ],
          },
        ],
      },
      {
        type: "skills",
        visible: true,
        categories: [
          { category: "Languages", items: ["TypeScript", "JavaScript"] },
        ],
      },
    ];

    for (const block of blocks) {
      assert.equal(
        contentBlockSchema.safeParse(block).success,
        true,
        `expected ${block.type} to be supported`,
      );
    }
  });

  it("rejects unsupported block types and invalid timeline dates", () => {
    assert.equal(
      contentBlockSchema.safeParse({
        type: "hero",
        visible: true,
        body: "Legacy block",
      }).success,
      false,
    );

    assert.equal(
      contentBlockSchema.safeParse({
        type: "experience",
        visible: true,
        items: [
          {
            startDate: "March 2024",
            endDate: "present",
            organization: "APolo",
          },
        ],
      }).success,
      false,
    );
  });

  it("requires Works links to be a validated label/href array", () => {
    const works = {
      type: "works",
      visible: true,
      items: [
        {
          kind: "project",
          title: "APolo",
          description: "온라인 명함 서비스",
          links: "https://github.com/example/project",
        },
      ],
    };

    assert.equal(contentBlockSchema.safeParse(works).success, false);
    assert.equal(
      contentBlockSchema.safeParse({
        ...works,
        items: [
          {
            ...works.items[0],
            links: [
              {
                label: "GitHub",
                href: "javascript:alert(document.domain)",
              },
            ],
          },
        ],
      }).success,
      false,
    );
  });
});

describe("updatePortfolioSchema", () => {
  it("accepts partial title, card, profile, blocks, and design updates", () => {
    assert.equal(updatePortfolioSchema.safeParse({ title: "이력서용" }).success, true);
    assert.equal(
      updatePortfolioSchema.safeParse({
        card: {
          name: "PARK DA-IN",
          headline: "컴퓨터공학전공",
          phone: "010-1234-5678",
          email: "example@email.com",
          organizationAddress: "서울",
        },
        profile: validProfile,
        blocks: [
          { type: "about", visible: true, body: "직접 수정한 자기소개" },
        ],
        cardDesignId: "modern-card",
        siteDesignId: "modern-site",
      }).success,
      true,
    );
  });

  it("allows an empty organization address when external data cannot verify it", () => {
    assert.equal(
      updatePortfolioSchema.safeParse({
        card: { organizationAddress: "" },
      }).success,
      true,
    );
  });

  it("enforces email and phone as the minimum profile fields", () => {
    assert.equal(
      updatePortfolioSchema.safeParse({
        profile: {
          ...validProfile,
          fields: validProfile.fields.filter((field) => field.kind !== "phone"),
        },
      }).success,
      false,
    );
  });

  it("rejects company/school names on the card front and all legacy fields", () => {
    assert.equal(
      updatePortfolioSchema.safeParse({
        card: { companyName: "Example Company" },
      }).success,
      false,
    );
    assert.equal(
      updatePortfolioSchema.safeParse({
        card: { schoolName: "Example University" },
      }).success,
      false,
    );

    for (const field of [
      "jobRole",
      "careerLevel",
      "directionPrompt",
      "externalLinks",
      "currentContentJson",
      "isPublic",
      "isShared",
      "shareToken",
    ]) {
      assert.equal(
        updatePortfolioSchema.safeParse({ [field]: "legacy" }).success,
        false,
        `${field} must be rejected`,
      );
    }
  });

  it("rejects an empty patch", () => {
    assert.equal(updatePortfolioSchema.safeParse({}).success, false);
  });
});

describe("updateContentSchema", () => {
  it("accepts only the empty refresh request body", () => {
    assert.equal(updateContentSchema.safeParse({}).success, true);
    assert.equal(
      updateContentSchema.safeParse({ currentContentJson: {} }).success,
      false,
    );
  });
});

describe("sourceSnapshotSchema", () => {
  it("validates persisted external-source metadata", () => {
    assert.equal(
      sourceSnapshotSchema.safeParse({
        url: "https://github.com/example",
        contentHash: "sha256:abc123",
        lastFetchedAt: "2026-09-13T07:00:00.000Z",
      }).success,
      true,
    );
    assert.equal(
      sourceSnapshotSchema.safeParse({
        url: "file:///etc/passwd",
        contentHash: "",
        lastFetchedAt: "yesterday",
      }).success,
      false,
    );
  });
});

describe("PortfolioDocument type", () => {
  it("represents the complete Online Card document", () => {
    const document: PortfolioDocument = {
      id: "portfolio-uuid",
      title: "학회 지원용",
      userType: "student",
      cardDesignId: "classic-card",
      siteDesignId: "classic-site",
      card: {
        name: "PARK DA-IN",
        headline: "컴퓨터공학전공",
        phone: "010-1234-5678",
        email: "example@email.com",
        organizationAddress: "서울",
      },
      profile: validProfile,
      blocks: [],
      sourceLinks: ["https://github.com/example"],
      sourceSnapshots: [],
      schemaVersion: 1,
      status: "draft",
      createdAt: "2026-09-13T07:00:00.000Z",
      updatedAt: "2026-09-13T07:00:00.000Z",
    };

    assert.equal(document.blocks.length, 0);
  });
});
