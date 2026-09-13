import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createHash } from "node:crypto";

import { Prisma } from "@prisma/client";
import { AppError } from "../errors/app-error.js";
import { createPortfolioService } from "./portfolios.service.js";

const portfolioCreateInput = {
  userId: 1,
  title: "Conference card",
  userType: "student",
  cardDesignId: "classic-card",
  siteDesignId: "classic-site",
  card: { name: "PARK DA-IN" },
  profile: { name: "PARK DA-IN" },
  blocks: [],
  sourceLinks: ["https://github.com/example"],
  sourceSnapshots: [],
  schemaVersion: 1,
  status: "draft",
} satisfies Prisma.PortfolioUncheckedCreateInput;

const shareCreateInput = {
  portfolioId: 1,
  shareId: "share-id",
} satisfies Prisma.PortfolioShareUncheckedCreateInput;

const shareLookup = {
  shareId: "share-id",
} satisfies Prisma.PortfolioShareWhereUniqueInput;

const getModel = (name: string) => {
  const model = Prisma.dmmf.datamodel.models.find((candidate) => candidate.name === name);

  assert.ok(model, `expected generated Prisma model ${name}`);
  return model;
};

describe("Online Card persistence model", () => {
  it("persists the complete Online Card document in dedicated Portfolio fields", () => {
    const portfolio = getModel("Portfolio");
    const scalarFields = Object.fromEntries(
      portfolio.fields
        .filter((field) => field.kind !== "object")
        .map((field) => [field.name, field.type]),
    );

    assert.deepEqual(scalarFields, {
      id: "Int",
      userId: "Int",
      title: "String",
      userType: "UserType",
      cardDesignId: "String",
      siteDesignId: "String",
      card: "Json",
      profile: "Json",
      blocks: "Json",
      sourceLinks: "Json",
      sourceSnapshots: "Json",
      schemaVersion: "Int",
      status: "PortfolioStatus",
      createdAt: "DateTime",
      updatedAt: "DateTime",
    });

    const relationFields = portfolio.fields
      .filter((field) => field.kind === "object")
      .map((field) => field.name)
      .sort();

    assert.deepEqual(relationFields, ["shares", "user"]);
    assert.equal(portfolioCreateInput.status, "draft");
  });

  it("creates share links as separate PortfolioShare records", () => {
    const share = getModel("PortfolioShare");
    const fields = Object.fromEntries(share.fields.map((field) => [field.name, field]));

    assert.deepEqual(
      share.fields.map((field) => field.name),
      ["id", "portfolioId", "shareId", "portfolio", "createdAt"],
    );
    assert.equal(fields.shareId?.type, "String");
    assert.equal(fields.portfolioId?.type, "Int");
    assert.equal(fields.portfolio?.type, "Portfolio");
    assert.equal(fields.portfolio?.kind, "object");
    assert.equal(fields.portfolio?.relationName, "PortfolioToPortfolioShare");
    assert.deepEqual(shareCreateInput, { portfolioId: 1, shareId: "share-id" });
    assert.deepEqual(shareLookup, { shareId: "share-id" });
  });
});

const now = new Date("2026-09-13T07:00:00.000Z");

const user = {
  id: 1,
  email: "dain@example.com",
  name: "PARK DA-IN",
  role: "Student",
  phone: "010-1234-5678",
  github: "https://github.com/example",
  company: null,
  jobTitle: null,
  tel: null,
  university: "Example University",
  department: null,
  major: "Computer Science",
};

const persistedPortfolio = {
  id: 7,
  userId: 1,
  title: "Conference card",
  userType: "student" as const,
  cardDesignId: "classic-card",
  siteDesignId: "classic-site",
  card: {
    name: "PARK DA-IN",
    headline: "Computer Science",
    phone: "010-1234-5678",
    email: "dain@example.com",
    organizationAddress: "",
  },
  profile: {
    name: "PARK DA-IN",
    title: "Computer Science",
    avatarUrl: null,
    fields: [
      { kind: "email", label: "Email", value: "dain@example.com" },
      { kind: "phone", label: "Phone", value: "010-1234-5678" },
    ],
  },
  blocks: [],
  sourceLinks: ["https://github.com/example"],
  sourceSnapshots: [],
  schemaVersion: 1,
  status: "draft" as const,
  createdAt: now,
  updatedAt: now,
};

describe("Online Card service", () => {
  it("generates IDs and persists a normalized AI document with source snapshots", async () => {
    let createData: Record<string, unknown> | undefined;
    let generationRequest: Record<string, unknown> | undefined;
    const ids = [
      "10000000-0000-4000-8000-000000000001",
      "10000000-0000-4000-8000-000000000002",
      "10000000-0000-4000-8000-000000000003",
    ];

    const service = createPortfolioService({
      prisma: {
        user: { findUnique: async () => user },
        portfolio: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            createData = data;
            return { ...persistedPortfolio, ...data };
          },
        },
      },
      ai: {
        generate: async (request: Record<string, unknown>) => {
          generationRequest = request;
          return {
            card: persistedPortfolio.card,
            profile: persistedPortfolio.profile,
            blocks: [
              { type: "about", visible: true, body: "Generated biography" },
              {
                type: "works",
                visible: true,
                items: [
                  {
                    kind: "project",
                    title: "APolo",
                    description: "Online card service",
                    links: [{ label: "GitHub", href: "https://github.com/example/apolo" }],
                  },
                ],
              },
            ],
          };
        },
        refresh: async () => ({ blocks: [] }),
      },
      sourceFetcher: async (url: string) => ({ url, content: "profile source" }),
      createId: () => ids.shift()!,
      now: () => now,
    } as never);

    await service.createOnlineCard(1, {
      title: "Conference card",
      cardDesignId: "classic-card",
      siteDesignId: "classic-site",
      externalLinks: ["https://github.com/example", "https://github.com/example"],
      requirements: "Highlight product work",
    });

    assert.equal(generationRequest?.user, user);
    assert.deepEqual(generationRequest?.sources, [
      { url: "https://github.com/example", content: "profile source" },
    ]);
    assert.equal(createData?.userType, "student");
    assert.deepEqual(createData?.sourceLinks, ["https://github.com/example"]);
    assert.deepEqual(createData?.sourceSnapshots, [
      {
        url: "https://github.com/example",
        contentHash: `sha256:${createHash("sha256").update("profile source").digest("hex")}`,
        lastFetchedAt: now.toISOString(),
      },
    ]);

    const blocks = createData?.blocks as Array<Record<string, unknown>>;
    assert.equal(blocks[0]?.id, "10000000-0000-4000-8000-000000000001");
    assert.equal(
      (blocks[1]?.items as Array<Record<string, unknown>>)[0]?.id,
      "10000000-0000-4000-8000-000000000003",
    );
  });

  it("returns lightweight cards in most-recently-updated order", async () => {
    let findManyArgs: Record<string, unknown> | undefined;
    const summaries = [
      {
        id: 7,
        title: "Conference card",
        userType: "student",
        cardDesignId: "classic-card",
        siteDesignId: "classic-site",
        status: "draft",
        createdAt: now,
        updatedAt: now,
      },
    ];
    const service = createPortfolioService({
      prisma: {
        portfolio: {
          findMany: async (args: Record<string, unknown>) => {
            findManyArgs = args;
            return summaries;
          },
        },
      },
    } as never);

    assert.deepEqual(await service.getMyOnlineCards(1), summaries);
    assert.deepEqual(findManyArgs, {
      where: { userId: 1 },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        userType: true,
        cardDesignId: true,
        siteDesignId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it("rejects a malformed AI response as an application error", async () => {
    const service = createPortfolioService({
      prisma: { user: { findUnique: async () => user } },
      ai: {
        generate: async () => null,
        refresh: async () => ({ blocks: [] }),
      },
      sourceFetcher: async (url: string) => ({ url, content: "profile source" }),
    } as never);

    await assert.rejects(
      service.createOnlineCard(1, {
        title: "Conference card",
        cardDesignId: "classic-card",
        siteDesignId: "classic-site",
        externalLinks: ["https://github.com/example"],
      }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.errorCode, "INVALID_AI_RESPONSE");
        return true;
      },
    );
  });

  it("denies reads, updates, and deletes when no owned card exists", async () => {
    const service = createPortfolioService({
      prisma: {
        portfolio: { findFirst: async () => null },
      },
    } as never);

    for (const operation of [
      () => service.getOwnedOnlineCard(2, 7),
      () => service.updateOnlineCard(2, 7, { title: "Not mine" }),
      () => service.deleteOnlineCard(2, 7),
    ]) {
      await assert.rejects(operation, (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.statusCode, 404);
        assert.equal(error.errorCode, "NOT_FOUND");
        return true;
      });
    }
  });

  it("rejects a malformed AI refresh response as an application error", async () => {
    const existing = {
      ...persistedPortfolio,
      sourceSnapshots: [],
    };
    const service = createPortfolioService({
      prisma: { portfolio: { findFirst: async () => existing } },
      ai: {
        generate: async () => ({
          card: persistedPortfolio.card,
          profile: persistedPortfolio.profile,
          blocks: [],
        }),
        refresh: async () => null,
      },
      sourceFetcher: async (url: string) => ({ url, content: "changed" }),
    } as never);

    await assert.rejects(service.refreshOnlineCardContent(1, 7), (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.errorCode, "INVALID_AI_RESPONSE");
      return true;
    });
  });

  it("patches card data independently and preserves caller block order", async () => {
    const updates: Array<Record<string, unknown>> = [];
    const ids = [
      "20000000-0000-4000-8000-000000000001",
      "20000000-0000-4000-8000-000000000002",
      "20000000-0000-4000-8000-000000000003",
    ];
    const service = createPortfolioService({
      prisma: {
        portfolio: {
          findFirst: async () => persistedPortfolio,
          update: async ({ data }: { data: Record<string, unknown> }) => {
            updates.push(data);
            return { ...persistedPortfolio, ...data };
          },
        },
      },
      createId: () => ids.shift()!,
    } as never);

    await service.updateOnlineCard(1, 7, { card: { headline: "Product Engineer" } });
    await service.updateOnlineCard(1, 7, {
      blocks: [
        { type: "about", visible: true, body: "Manual biography" },
        { type: "skills", visible: true, categories: [{ category: "Languages", items: ["TypeScript"] }] },
      ],
    });

    assert.deepEqual(updates[0], {
      card: { ...persistedPortfolio.card, headline: "Product Engineer" },
    });
    assert.equal("profile" in updates[0]!, false);
    assert.deepEqual(
      (updates[1]?.blocks as Array<Record<string, unknown>>).map((block) => block.type),
      ["about", "skills"],
    );
    assert.equal(
      (updates[1]?.blocks as Array<Record<string, unknown>>)[0]?.id,
      "20000000-0000-4000-8000-000000000001",
    );
    assert.equal(
      ((updates[1]?.blocks as Array<Record<string, unknown>>)[1]?.categories as Array<Record<string, unknown>>)[0]?.id,
      "20000000-0000-4000-8000-000000000003",
    );
  });

  it("refreshes changed persisted sources and merges new items without replacing manual content", async () => {
    const unchangedContent = "same content";
    const existing = {
      ...persistedPortfolio,
      sourceLinks: ["https://example.com/same", "https://example.com/changed"],
      sourceSnapshots: [
        {
          url: "https://example.com/same",
          contentHash: `sha256:${createHash("sha256").update(unchangedContent).digest("hex")}`,
          lastFetchedAt: "2026-09-01T00:00:00.000Z",
        },
        {
          url: "https://example.com/changed",
          contentHash: "sha256:stale",
          lastFetchedAt: "2026-09-01T00:00:00.000Z",
        },
      ],
      blocks: [
        {
          id: "30000000-0000-4000-8000-000000000001",
          type: "about",
          visible: true,
          body: "Manually edited biography",
        },
        {
          id: "30000000-0000-4000-8000-000000000002",
          type: "works",
          visible: true,
          items: [
            {
              id: "30000000-0000-4000-8000-000000000003",
              kind: "project",
              title: "APolo",
              description: "Manually edited description",
              links: [],
            },
          ],
        },
      ],
    };
    let refreshRequest: Record<string, unknown> | undefined;
    let updateData: Record<string, unknown> | undefined;
    const fetchedUrls: string[] = [];
    const service = createPortfolioService({
      prisma: {
        portfolio: {
          findFirst: async () => existing,
          update: async ({ data }: { data: Record<string, unknown> }) => {
            updateData = data;
            return { ...existing, ...data };
          },
        },
      },
      ai: {
        generate: async () => ({
          card: persistedPortfolio.card,
          profile: persistedPortfolio.profile,
          blocks: [],
        }),
        refresh: async (request: Record<string, unknown>) => {
          refreshRequest = request;
          return {
            blocks: [
              { type: "about", visible: true, body: "AI replacement must not win" },
              {
                type: "works",
                visible: true,
                items: [
                  {
                    kind: "project",
                    title: "APolo",
                    description: "AI duplicate must not win",
                    links: [],
                  },
                  {
                    kind: "project",
                    title: "New project",
                    description: "New source-backed work",
                    links: [],
                  },
                  {
                    kind: "project",
                    title: "New project",
                    description: "Duplicate AI item",
                    links: [],
                  },
                ],
              },
            ],
          };
        },
      },
      sourceFetcher: async (url: string) => {
        fetchedUrls.push(url);
        return { url, content: url.endsWith("same") ? unchangedContent : "new content" };
      },
      createId: () => "30000000-0000-4000-8000-000000000004",
      now: () => now,
    } as never);

    const refreshed = await service.refreshOnlineCardContent(1, 7);

    assert.deepEqual(fetchedUrls, existing.sourceLinks);
    assert.deepEqual(refreshRequest?.changedSources, [
      { url: "https://example.com/changed", content: "new content" },
    ]);
    const blocks = updateData?.blocks as Array<Record<string, unknown>>;
    assert.equal(blocks[0]?.body, "Manually edited biography");
    const works = blocks[1]?.items as Array<Record<string, unknown>>;
    assert.equal(works.length, 2);
    assert.equal(works[0]?.description, "Manually edited description");
    assert.equal(works[1]?.title, "New project");
    assert.equal((refreshed.blocks as unknown[]).length, 2);
    assert.equal((updateData?.sourceSnapshots as unknown[]).length, 2);
  });
});
