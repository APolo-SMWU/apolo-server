import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";

import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe(
  "Online Card database persistence",
  { skip: testDatabaseUrl ? false : "TEST_DATABASE_URL is required" },
  () => {
    let prisma: PrismaClient;
    const userIds: number[] = [];

    before(() => {
      assert.ok(testDatabaseUrl);
      prisma = new PrismaClient({
        adapter: new PrismaPg({ connectionString: testDatabaseUrl }),
      });
    });

    after(async () => {
      if (!prisma) return;

      await prisma.portfolio.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      await prisma.$disconnect();
    });

    const createUser = async () => {
      const user = await prisma.user.create({
        data: {
          email: `portfolio-persistence-${randomUUID()}@example.com`,
          name: "Portfolio persistence test",
          password: "not-a-real-password",
        },
      });
      userIds.push(user.id);
      return user;
    };

    const createPortfolio = async () => {
      const user = await createUser();

      return prisma.portfolio.create({
        data: {
          userId: user.id,
          title: "Conference card",
          userType: "student",
          cardDesignId: "classic-card",
          siteDesignId: "classic-site",
          card: { name: "PARK DA-IN", headline: "Frontend Developer" },
          profile: { name: "PARK DA-IN", fields: [] },
          blocks: [{ id: randomUUID(), type: "about", visible: true, body: "Hello" }],
          sourceLinks: ["https://github.com/example"],
          sourceSnapshots: [
            {
              url: "https://github.com/example",
              contentHash: "sha256:abc123",
              lastFetchedAt: "2026-09-13T07:00:00.000Z",
            },
          ],
          schemaVersion: 1,
          status: "draft",
        },
      });
    };

    it("writes and reads every Online Card field", async () => {
      const created = await createPortfolio();
      const persisted = await prisma.portfolio.findUniqueOrThrow({
        where: { id: created.id },
      });

      assert.equal(persisted.userType, "student");
      assert.equal(persisted.cardDesignId, "classic-card");
      assert.equal(persisted.siteDesignId, "classic-site");
      assert.deepEqual(persisted.card, {
        name: "PARK DA-IN",
        headline: "Frontend Developer",
      });
      assert.deepEqual(persisted.profile, { name: "PARK DA-IN", fields: [] });
      assert.deepEqual(persisted.blocks, created.blocks);
      assert.deepEqual(persisted.sourceLinks, ["https://github.com/example"]);
      assert.deepEqual(persisted.sourceSnapshots, [
        {
          url: "https://github.com/example",
          contentHash: "sha256:abc123",
          lastFetchedAt: "2026-09-13T07:00:00.000Z",
        },
      ]);
      assert.equal(persisted.schemaVersion, 1);
      assert.equal(persisted.status, "draft");
    });

    it("stores share links separately and enforces unique share IDs", async () => {
      const portfolio = await createPortfolio();
      const shareId = randomUUID();
      const share = await prisma.portfolioShare.create({
        data: { portfolioId: portfolio.id, shareId },
        include: { portfolio: true },
      });

      assert.equal(share.portfolioId, portfolio.id);
      assert.equal(share.shareId, shareId);
      assert.equal(share.portfolio.id, portfolio.id);

      await assert.rejects(
        () =>
          prisma.portfolioShare.create({
            data: { portfolioId: portfolio.id, shareId },
          }),
        (error: unknown) => {
          assert.ok(error instanceof Prisma.PrismaClientKnownRequestError);
          assert.equal(error.code, "P2002");
          return true;
        },
      );
    });
  },
);
