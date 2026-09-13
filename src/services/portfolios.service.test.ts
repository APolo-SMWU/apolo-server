import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Prisma } from "@prisma/client";

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
