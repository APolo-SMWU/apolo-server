import { randomUUID } from "node:crypto";

import type { Prisma, Portfolio } from "@prisma/client";

import { AppError } from "../errors/app-error";
import prisma from "../lib/prisma";
import { normalizeStoredBlocks } from "./portfolio-content.service";
import { deletePrivateObject, putPrivateObject } from "./s3.service";

export const MAX_WORK_UPLOAD_BYTES = 10 * 1024 * 1024;

const extensionByMimeType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const workImageKeyPattern = /^portfolios\/\d+\/works\/[0-9a-f-]+\.(?:jpg|png|webp)$/;

export type WorkImageFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

type PutObject = (input: { key: string; body: Buffer; contentType: string }) => Promise<void>;
type DeleteObject = (key: string) => Promise<void>;

interface PortfolioWorkImageDependencies {
  prisma: typeof prisma;
  createId: () => string;
  putObject: PutObject;
  deleteObject: DeleteObject;
}

const jsonValue = (value: unknown) => value as Prisma.InputJsonValue;

export const validateWorkImage = (file: WorkImageFile) => {
  if (!extensionByMimeType[file.mimetype]) {
    throw new AppError(422, "지원하지 않는 이미지 형식입니다. JPG, PNG, WebP만 업로드할 수 있습니다.", "INVALID_WORK_IMAGE_TYPE");
  }
  if (file.size > MAX_WORK_UPLOAD_BYTES) {
    throw new AppError(422, "프로젝트 이미지는 10MB 이하만 업로드할 수 있습니다.", "WORK_IMAGE_TOO_LARGE");
  }
};

export const createPortfolioWorkImageService = (
  overrides: Partial<PortfolioWorkImageDependencies> = {},
) => {
  const db = overrides.prisma ?? prisma;
  const createId = overrides.createId ?? randomUUID;
  const putObject = overrides.putObject ?? putPrivateObject;
  const deleteObject = overrides.deleteObject ?? deletePrivateObject;

  const uploadWorkImage = async (
    userId: number,
    portfolioId: number,
    itemId: string,
    file: WorkImageFile,
  ): Promise<Portfolio> => {
    validateWorkImage(file);

    const portfolio = await db.portfolio.findFirst({ where: { id: portfolioId, userId } });
    if (!portfolio) throw new AppError(404, "온라인 명함을 찾을 수 없습니다.", "NOT_FOUND");

    const blocks = normalizeStoredBlocks(portfolio.blocks);
    const worksBlock = blocks.find((block) => block.type === "works");
    const workItem = worksBlock?.items.find((item) => item.id === itemId);
    if (!workItem) {
      throw new AppError(404, "프로젝트를 찾을 수 없습니다.", "WORK_ITEM_NOT_FOUND");
    }

    const extension = extensionByMimeType[file.mimetype]!;
    const key = `portfolios/${portfolioId}/works/${createId()}.${extension}`;
    await putObject({ key, body: file.buffer, contentType: file.mimetype });

    const previousKey = workItem.imageKey;
    const updatedBlocks = blocks.map((block) => {
      if (block.type !== "works") return block;
      return {
        ...block,
        items: block.items.map((item) =>
          item.id === itemId ? { ...item, imageUrl: null, imageKey: key } : item,
        ),
      };
    });

    try {
      const updated = await db.portfolio.update({
        where: { id: portfolioId },
        data: { blocks: jsonValue(updatedBlocks) },
      });

      if (previousKey && workImageKeyPattern.test(previousKey)) {
        await deleteObject(previousKey).catch((error) => {
          console.error("기존 프로젝트 이미지 삭제에 실패했습니다.", error);
        });
      }
      return updated;
    } catch (error) {
      await deleteObject(key).catch(() => undefined);
      throw error;
    }
  };

  return { uploadWorkImage };
};

const service = createPortfolioWorkImageService();

export const uploadWorkImage = service.uploadWorkImage;
