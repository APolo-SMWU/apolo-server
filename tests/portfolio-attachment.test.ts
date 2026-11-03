import assert from "node:assert/strict";
import { test } from "node:test";

import { AppError } from "../src/errors/app-error";
import { toAiAttachments, validatePortfolioAttachment } from "../src/services/portfolio-attachment";

const docx = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

test("PDF·DOCX만 AI에 전달하고 이미지는 기존 첨부로 유지한다", async () => {
  const signed: string[] = [];
  const result = await toAiAttachments([
    { originalName: "resume.docx", mimeType: docx, s3Key: "docx-key" },
    { originalName: "photo.png", mimeType: "image/png", s3Key: "image-key" },
    { originalName: "resume.pdf", mimeType: "application/pdf", s3Key: "pdf-key" },
  ], async (key) => { signed.push(key); return `signed:${key}`; });
  assert.deepEqual(signed, ["docx-key", "pdf-key"]);
  assert.deepEqual(result.map((file) => [file.fileName, file.sourceUrl, file.downloadUrl]), [
    ["resume.docx", "docx-key", "signed:docx-key"],
    ["resume.pdf", "pdf-key", "signed:pdf-key"],
  ]);
});

test("Word 첨부를 허용하고 확장자·종류 불일치를 거부한다", () => {
  validatePortfolioAttachment({ originalname: "resume.DOCX", mimetype: docx, size: 100 });
  assert.throws(() => validatePortfolioAttachment({ originalname: "resume.pdf", mimetype: docx, size: 100 }),
    (error: unknown) => error instanceof AppError && error.errorCode === "INVALID_ATTACHMENT_EXTENSION");
  assert.throws(() => validatePortfolioAttachment({ originalname: "resume.docx", mimetype: docx, size: 0 }));
});
