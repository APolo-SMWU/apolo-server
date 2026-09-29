import assert from "node:assert/strict";
import test from "node:test";

import {
  materializeWorkImages,
  preserveStoredWorkImageKeys,
  withSignedWorkImageUrls,
} from "./portfolio-work-image";
import type { ContentBlock } from "../types/portfolio";
import { contentBlocksSchema } from "../schemas/portfolio.schema";

const sourceUrl = "https://github.com/user-attachments/assets/example";

const works = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    type: "works" as const,
    visible: true,
    items: [
      {
        id: "00000000-0000-4000-8000-000000000002",
        kind: "project" as const,
        title: "Project",
        links: [],
        imageUrl: sourceUrl,
      },
    ],
  },
];

test("stores a reachable remote work image in S3 and records its object key", async () => {
  const uploaded: Array<{ key: string; body: Buffer; contentType: string }> = [];
  const result = await materializeWorkImages(works, 42, {
    createId: () => "00000000-0000-4000-8000-000000000003",
    fetch: async () =>
      new Response(Buffer.from("image-bytes"), {
        status: 200,
        headers: { "content-type": "image/png" },
      }),
    putObject: async (input) => {
      uploaded.push(input);
    },
  });

  assert.equal(uploaded.length, 1);
  assert.equal(uploaded[0]?.contentType, "image/png");
  assert.deepEqual(uploaded[0]?.body, Buffer.from("image-bytes"));
  assert.equal(
    result.blocks[0]?.type === "works" && result.blocks[0].items[0]?.imageKey,
    "portfolios/42/works/00000000-0000-4000-8000-000000000003.png",
  );
  assert.deepEqual(result.uploadedKeys, [
    "portfolios/42/works/00000000-0000-4000-8000-000000000003.png",
  ]);
});

test("removes an unavailable remote image instead of persisting a broken URL", async () => {
  const result = await materializeWorkImages(works, 42, {
    fetch: async () => new Response("not found", { status: 404 }),
    putObject: async () => {
      throw new Error("must not upload an unavailable image");
    },
  });

  assert.equal(result.blocks[0]?.type === "works" && result.blocks[0].items[0]?.imageUrl, null);
  assert.equal(result.blocks[0]?.type === "works" && result.blocks[0].items[0]?.imageKey, undefined);
  assert.deepEqual(result.uploadedKeys, []);
});

test("returns a presigned URL and hides the internal S3 key", async () => {
  const blocks: ContentBlock[] = [
    {
      id: works[0]!.id,
      type: "works",
      visible: true,
      items: [{ ...works[0]!.items[0]!, imageKey: "portfolios/42/works/image.png" }],
    },
  ];

  const result = await withSignedWorkImageUrls(blocks, async (key) => `https://s3.test/${key}`);
  assert.equal(result[0]?.type === "works" && result[0].items[0]?.imageUrl, "https://s3.test/portfolios/42/works/image.png");
  assert.equal(result[0]?.type === "works" && "imageKey" in result[0].items[0]!, false);
});

test("preserves an existing S3 key for an unchanged signed image but not for a replacement URL", () => {
  const existing: ContentBlock[] = [
    {
      ...works[0]!,
      items: [{ ...works[0]!.items[0]!, imageKey: "portfolios/42/works/current.png" }],
    },
  ];
  const signedUrl = "https://s3.test/current.png?X-Amz-Signature=signature";

  const unchanged = preserveStoredWorkImageKeys(existing, [
    {
      ...works[0]!,
      items: [{ ...works[0]!.items[0]!, imageUrl: signedUrl }],
    },
  ]);
  assert.equal(unchanged[0]?.type === "works" && unchanged[0].items[0]?.imageKey, "portfolios/42/works/current.png");

  const replaced = preserveStoredWorkImageKeys(existing, [
    {
      ...works[0]!,
      items: [{ ...works[0]!.items[0]!, imageUrl: "https://example.com/new.png" }],
    },
  ]);
  assert.equal(replaced[0]?.type === "works" && replaced[0].items[0]?.imageKey, undefined);
});

test("does not accept the internal S3 key in client block input", () => {
  const result = contentBlocksSchema.safeParse([
    {
      id: "00000000-0000-4000-8000-000000000001",
      type: "works",
      visible: true,
      items: [
        {
          id: "00000000-0000-4000-8000-000000000002",
          kind: "project",
          title: "Project",
          links: [],
          imageKey: "portfolios/42/works/image.png",
        },
      ],
    },
  ]);
  assert.equal(result.success, false);
});
