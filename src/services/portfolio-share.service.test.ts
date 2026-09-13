import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AppError } from "../errors/app-error.js";
import { createPortfolioShareService } from "./portfolio-share.service.js";

const portfolio = {
  id: 7,
  userId: 1,
  title: "Conference card",
};

describe("Portfolio share service", () => {
  it("creates a separate UUID share record and returns its public URL", async () => {
    let createData: Record<string, unknown> | undefined;
    const shareId = "40000000-0000-4000-8000-000000000001";
    const service = createPortfolioShareService({
      prisma: {
        portfolio: { findFirst: async () => portfolio },
        portfolioShare: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            createData = data;
            return { id: 1, ...data, createdAt: new Date() };
          },
        },
      },
      createId: () => shareId,
      publicBaseUrl: "https://api.example.com/root/",
    } as never);

    assert.deepEqual(await service.createShareLink(1, 7), {
      shareId,
      shareUrl: `https://api.example.com/share/${shareId}`,
    });
    assert.deepEqual(createData, { portfolioId: 7, shareId });
  });

  it("denies share creation for a card the user does not own", async () => {
    const service = createPortfolioShareService({
      prisma: {
        portfolio: { findFirst: async () => null },
      },
    } as never);

    await assert.rejects(service.createShareLink(2, 7), (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 404);
      assert.equal(error.errorCode, "NOT_FOUND");
      return true;
    });
  });

  it("returns the linked card and rejects a missing share ID", async () => {
    const foundService = createPortfolioShareService({
      prisma: {
        portfolioShare: {
          findUnique: async () => ({ id: 1, portfolioId: 7, shareId: "found", portfolio }),
        },
      },
    } as never);
    assert.equal(await foundService.getSharedOnlineCard("found"), portfolio);

    const missingService = createPortfolioShareService({
      prisma: {
        portfolioShare: { findUnique: async () => null },
      },
    } as never);
    await assert.rejects(missingService.getSharedOnlineCard("missing"), (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 404);
      assert.equal(error.errorCode, "NOT_FOUND");
      return true;
    });
  });
});
