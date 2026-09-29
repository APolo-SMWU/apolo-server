import { randomUUID } from "node:crypto";

import type { ContentBlock, WorksBlock } from "../types/portfolio";
import { createPrivateObjectUrl, putPrivateObject } from "./s3.service";

export const MAX_WORK_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_REDIRECTS = 3;

const extensionByContentType: Record<string, string> = {
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type PutObject = (input: { key: string; body: Buffer; contentType: string }) => Promise<void>;
type FetchImage = (input: string, init?: RequestInit) => Promise<Response>;

export type WorkImageDependencies = {
  createId: () => string;
  fetch: FetchImage;
  putObject: PutObject;
};

const defaultDependencies: WorkImageDependencies = {
  createId: randomUUID,
  fetch: (input, init) => fetch(input, init),
  putObject: putPrivateObject,
};

const isBlockedHost = (hostname: string) => {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  if (
    normalized === "localhost" ||
    normalized === "metadata.google.internal" ||
    normalized === "169.254.169.254" ||
    normalized === "127.0.0.1" ||
    normalized === "0.0.0.0"
  ) {
    return true;
  }

  const ipv4 = normalized.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!ipv4) return false;
  const first = Number(ipv4[1]);
  const second = Number(ipv4[2]);
  return first === 10 || first === 127 || (first === 169 && second === 254) || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
};

const parseRemoteImageUrl = (value: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(url.protocol) || isBlockedHost(url.hostname)) return null;
  return url;
};

const fetchRemoteImage = async (sourceUrl: string, fetchImage: FetchImage): Promise<{ body: Buffer; contentType: string } | null> => {
  let url = parseRemoteImageUrl(sourceUrl);
  if (!url) return null;

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const response = await fetchImage(url.toString(), {
      headers: { Accept: "image/*" },
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirect === MAX_REDIRECTS) return null;
      url = parseRemoteImageUrl(new URL(location, url).toString());
      if (!url) return null;
      continue;
    }

    if (!response.ok) return null;
    const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.toLowerCase();
    if (!contentType || !extensionByContentType[contentType]) return null;

    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_WORK_IMAGE_BYTES) return null;

    const body = Buffer.from(await response.arrayBuffer());
    if (body.length > MAX_WORK_IMAGE_BYTES) return null;
    return { body, contentType };
  }

  return null;
};

const workBlocks = (blocks: ContentBlock[]) =>
  blocks.filter((block): block is WorksBlock => block.type === "works");

export const materializeWorkImages = async (
  blocks: ContentBlock[],
  portfolioId: number,
  overrides: Partial<WorkImageDependencies> = {},
): Promise<{ blocks: ContentBlock[]; uploadedKeys: string[] }> => {
  const dependencies = { ...defaultDependencies, ...overrides };
  const nextBlocks = structuredClone(blocks);
  const uploadedKeys: string[] = [];

  for (const block of workBlocks(nextBlocks)) {
    for (const item of block.items) {
      if (!item.imageUrl || item.imageKey) continue;

      try {
        const downloaded = await fetchRemoteImage(item.imageUrl, dependencies.fetch);
        if (!downloaded) {
          item.imageUrl = null;
          continue;
        }

        const extension = extensionByContentType[downloaded.contentType]!;
        const key = `portfolios/${portfolioId}/works/${dependencies.createId()}.${extension}`;
        await dependencies.putObject({ key, body: downloaded.body, contentType: downloaded.contentType });
        item.imageKey = key;
        uploadedKeys.push(key);
      } catch {
        item.imageUrl = null;
      }
    }
  }

  return { blocks: nextBlocks, uploadedKeys };
};

export const withSignedWorkImageUrls = async (
  blocks: ContentBlock[],
  signUrl: (key: string) => Promise<string> = createPrivateObjectUrl,
): Promise<ContentBlock[]> => {
  const nextBlocks = structuredClone(blocks);
  for (const block of workBlocks(nextBlocks)) {
    for (const item of block.items) {
      if (!item.imageKey) continue;
      item.imageUrl = await signUrl(item.imageKey);
      delete item.imageKey;
    }
  }
  return nextBlocks;
};

export const preserveStoredWorkImageKeys = (
  existingBlocks: ContentBlock[],
  incomingBlocks: ContentBlock[],
): ContentBlock[] => {
  const existingById = new Map<string, { imageKey: string; imageUrl: string | null | undefined }>();
  for (const block of workBlocks(existingBlocks)) {
    for (const item of block.items) {
      if (item.id && item.imageKey) existingById.set(item.id, { imageKey: item.imageKey, imageUrl: item.imageUrl });
    }
  }

  const nextBlocks = structuredClone(incomingBlocks);
  for (const block of workBlocks(nextBlocks)) {
    for (const item of block.items) {
      if (item.imageKey || !item.id) continue;
      const existing = existingById.get(item.id);
      if (!existing) continue;

      if (item.imageUrl === undefined) {
        if (existing.imageUrl !== undefined) item.imageUrl = existing.imageUrl;
        item.imageKey = existing.imageKey;
        continue;
      }

      let isSignedUrl = false;
      try {
        if (typeof item.imageUrl !== "string") continue;
        const url = new URL(item.imageUrl);
        isSignedUrl = url.searchParams.has("X-Amz-Signature") || url.searchParams.has("X-Amz-Credential");
      } catch {
        isSignedUrl = false;
      }
      if (item.imageUrl === existing.imageUrl || isSignedUrl) {
        item.imageKey = existing.imageKey;
      }
    }
  }
  return nextBlocks;
};
