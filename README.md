# APolo Server

> **APolo (Personal Online Link Organizer)** — 온톨로지 기반 온라인 명함 웹사이트의 Backend 서버

🔗 [AI (apolo-ai)](https://github.com/APolo-SMWU/apolo-ai)
🔗 [Frontend (apolo-client)](https://github.com/APolo-SMWU/apolo-client)

## Description

Frontend와 AI 서버 사이에서 회원 · 포트폴리오(온라인 명함) · 공유를 담당합니다.
AI 서버에 생성을 요청하고, 돌아온 결과를 검증해 PostgreSQL(`public` 스키마)과 S3에 저장합니다.

## API

| 경로 | 설명 |
|---|---|
| `/auth` | 회원가입 · 로그인 · 토큰 재발급 · 로그아웃 |
| `/users/me` | 내 정보 · 온보딩 · 프로필 · 비밀번호 |
| `/portfolios` | 포트폴리오 생성 · 조회 · 수정 · 삭제, 콘텐츠 갱신, CV, 이미지 |
| `/share/:shareId` | 공유된 포트폴리오 조회 (로그인 불필요) |
| `/health` | 상태 확인 |

자세한 명세는 서버 실행 후 `/api-docs`(Swagger)에서 확인할 수 있습니다.

## Getting Started

```bash
npm ci
cp .env.example .env
docker compose up -d        # 로컬 PostgreSQL
npx prisma generate
npm run db:migrate
npm run dev                 # http://localhost:3000
```

`.env`에 DB(`DATABASE_URL`), JWT 비밀키, S3, AI 서버 주소(`AI_BASE_URL`)를 입력합니다.
포트폴리오 생성은 [apolo-ai](https://github.com/APolo-SMWU/apolo-ai) 서버가 함께 실행 중이어야 합니다.

### 배포
`main`에 병합되면 GitHub Actions가 빌드를 확인한 뒤 SSH로 AWS Lightsail 서버의 배포 스크립트를 실행합니다(Nginx · PM2).

## Tech Stack

| 구분 | 기술 |
|---|---|
| Language | TypeScript, Node.js 24 |
| API | Express, Zod, Swagger |
| Database | PostgreSQL, Prisma |
| Storage | AWS S3 |
| Auth | JWT, bcrypt |
| Deploy | AWS Lightsail, Nginx, PM2, GitHub Actions |
