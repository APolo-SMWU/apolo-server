const swaggerSpec = {
  openapi: "3.0.0",
  info: { title: "APolo Online Card API", version: "2.0.0", description: "온라인 명함 생성·편집·공유 API" },
  servers: [
    { url: "https://13.209.192.134.nip.io", description: "AWS production" },
    { url: "http://localhost:3000", description: "Local" },
  ],
  paths: {
    "/portfolios": {
      get: { tags: ["Online Card"], security: [{ bearerAuth: [] }], responses: { 200: { description: "내 온라인 명함 목록", content: { "application/json": { schema: { type: "object", properties: { portfolios: { type: "array", items: { $ref: "#/components/schemas/Portfolio" } } } } } } } } },
    },
    "/portfolios/generate": {
      post: { tags: ["Online Card"], security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["title", "cardDesignId", "siteDesignId", "externalLinks"], properties: { title: { type: "string" }, cardDesignId: { type: "string" }, siteDesignId: { type: "string" }, externalLinks: { type: "array", minItems: 1, items: { type: "string", format: "uri" } }, requirements: { type: "string", maxLength: 2000 } } } } } }, responses: { 201: { description: "생성 성공", content: { "application/json": { schema: { $ref: "#/components/schemas/Portfolio" } } } }, 422: { description: "사용자 프로필 미완성" } } },
    },
    "/portfolios/{portfolioId}": {
      get: { tags: ["Online Card"], security: [{ bearerAuth: [] }], parameters: [{ $ref: "#/components/parameters/portfolioId" }], responses: { 200: { description: "상세 조회" }, 404: { description: "없음" } } },
      patch: { tags: ["Online Card"], security: [{ bearerAuth: [] }], parameters: [{ $ref: "#/components/parameters/portfolioId" }], requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } }, responses: { 200: { description: "수정 성공" } } },
      delete: { tags: ["Online Card"], security: [{ bearerAuth: [] }], parameters: [{ $ref: "#/components/parameters/portfolioId" }], responses: { 204: { description: "삭제 성공" } } },
    },
    "/portfolios/{portfolioId}/update-content": { post: { tags: ["Online Card"], security: [{ bearerAuth: [] }], parameters: [{ $ref: "#/components/parameters/portfolioId" }], responses: { 200: { description: "외부 소스 갱신 성공" } } } },
    "/portfolios/{portfolioId}/share": { post: { tags: ["Share"], security: [{ bearerAuth: [] }], parameters: [{ $ref: "#/components/parameters/portfolioId" }], responses: { 201: { description: "공유 링크 생성", content: { "application/json": { schema: { type: "object", properties: { shareId: { type: "string", format: "uuid" }, shareUrl: { type: "string", format: "uri" } } } } } } } } },
    "/share/{shareId}": { get: { tags: ["Share"], parameters: [{ $ref: "#/components/parameters/shareId" }], responses: { 200: { description: "공유 명함 조회" }, 404: { description: "공유 링크 없음" } } } },
  },
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
    parameters: {
      portfolioId: { name: "portfolioId", in: "path", required: true, schema: { type: "integer", minimum: 1 } },
      shareId: { name: "shareId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
    },
    schemas: {
      Portfolio: { type: "object", properties: { id: { type: "integer" }, title: { type: "string" }, userType: { type: "string" }, card: { type: "object" }, profile: { type: "object" }, blocks: { type: "array", items: { type: "object" } }, sourceLinks: { type: "array", items: { type: "string" } }, sourceSnapshots: { type: "array", items: { type: "object" } } } },
    },
  },
} as const;

export default swaggerSpec;
