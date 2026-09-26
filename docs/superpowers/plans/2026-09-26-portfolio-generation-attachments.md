# 포트폴리오 생성 첨부파일 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 명함 생성 multipart 요청의 첨부파일을 비공개 S3에 저장하고 생성된 포트폴리오에 연결한다.

**Architecture:** 기존 `POST /portfolios/generate`에 multipart 파서를 붙이고, 일반 필드는 JSON 문자열로 검증하며 파일은 메모리에서 MIME·개수를·용량을 검증한다. 생성 중 업로드한 S3 객체를 성공 시 `PortfolioAttachment` 메타데이터와 연결하고, 생성/DB 저장 실패 시 업로드 객체를 정리한다.

**Tech Stack:** Express 5, TypeScript, Multer memory storage, AWS SDK v3 S3, Prisma/PostgreSQL, Zod.

**Spec:** `docs/superpowers/specs/2026-09-26-portfolio-generation-attachments.md`

## Global Constraints

- 사용자용 첨부파일 조회·수정·삭제 API는 만들지 않는다.
- 지원 파일은 PDF, JPG/JPEG, PNG다.
- 요청당 최대 5개, 파일당 최대 10MB다.
- S3 버킷은 비공개로 유지하고 S3 키·자격 증명은 응답에 노출하지 않는다.
- 첨부파일 내용의 AI 추출/생성은 이번 범위에 포함하지 않는다.
- 기존 JSON 생성 요청과 기존 포트폴리오 API의 동작을 유지한다.

## Review Focus

- JSON 문자열 필드가 누락되거나 잘못된 경우 구체적인 4xx 오류를 반환하는지 — Task 2.
- 허용되지 않은 MIME/확장자 파일이 업로드되지 않는지 — Task 1.
- 5개 초과 및 파일당 10MB 초과를 차단하는지 — Task 1.
- AI 생성 실패 또는 DB 저장 실패 후 S3 고아 객체가 정리되는지 — Task 3.
- 기존 JSON 요청이 multipart 기능 추가 후에도 동작하는지 — Task 4.

### Task 1: 첨부파일 파서와 검증

**Files:**
- Create: `src/services/portfolio-attachment.ts`
- Create: `src/middlewares/portfolio-generation-upload.ts`
- Modify: `package.json`, `package-lock.json`

**Interfaces:**
- Produces `MAX_PORTFOLIO_ATTACHMENTS = 5`, `MAX_PORTFOLIO_ATTACHMENT_BYTES = 10 * 1024 * 1024`, `validatePortfolioAttachment(file)`, `createPortfolioAttachmentKey(portfolioId, file)`.

- [ ] Write failing unit tests for accepted PDF/JPG/PNG, rejected MIME/extension, size limit, and count limit.
- [ ] Run the focused tests and verify they fail because the helper/middleware does not exist.
- [ ] Implement validation and memory-storage multipart middleware with `attachments` field.
- [ ] Run focused tests and then the full test suite.

### Task 2: Prisma 첨부파일 모델과 multipart 입력 정규화

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260926000000_add_portfolio_attachments/migration.sql`
- Create: `src/services/portfolio-generation-input.ts`
- Create: `src/services/portfolio-generation-input.test.ts`

**Interfaces:**
- `parsePortfolioGenerationMultipart(body: Record<string, unknown>) -> CreatePortfolioInput` parses `externalLinks` from a JSON string while preserving existing JSON input behavior.
- `PortfolioAttachment` stores `portfolioId`, `s3Key`, `originalName`, `mimeType`, `size`, `createdAt`.

- [ ] Write failing tests for JSON-string `externalLinks`, optional requirements, and invalid JSON.
- [ ] Run focused tests and verify the expected missing-helper failure.
- [ ] Add Prisma relation/model and SQL migration with cascade delete and portfolio index.
- [ ] Implement the input parser and validation errors.
- [ ] Run focused tests and `npm run build`.

### Task 3: 생성 서비스에 S3 저장과 연결/정리 추가

**Files:**
- Modify: `src/services/portfolios.service.ts`
- Modify: `src/services/s3.service.ts`
- Modify: `src/controllers/portfolios.controller.ts`
- Modify: `src/routes/portfolios.routes.ts`
- Modify: `src/docs/swagger.ts`

**Interfaces:**
- `createOnlineCard(userId, input, attachments)` uploads each attachment under `portfolios/{portfolioId}/attachments/{uuid}.{ext}` after the portfolio id is available, then creates attachment metadata.

- [ ] Write failing service tests for successful metadata persistence and cleanup when AI/DB work fails.
- [ ] Run focused tests and verify failure before implementation.
- [ ] Implement multipart controller parsing and pass files into the service.
- [ ] Create the portfolio, upload files, create metadata, and clean up uploaded keys on failure.
- [ ] Return sanitized attachment metadata in generated portfolio responses.
- [ ] Run focused tests and full build.

### Task 4: 회귀 검증과 운영 문서

**Files:**
- Modify: `src/docs/swagger.ts`
- Modify: `.env.example` if present

- [ ] Verify the existing JSON request path remains accepted.
- [ ] Verify error responses for file count, size, type, and malformed multipart fields.
- [ ] Run `npm test` and `npm run build`.
- [ ] Record Lightsail deployment commands: `git pull`, `npm install`, `npm run build`, `pm2 restart apolo-server --update-env`, and apply the Prisma migration before restart.
