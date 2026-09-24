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
    "/users/me": {
      get: { tags: ["User"], security: [{ bearerAuth: [] }], responses: { 200: { description: "내 정보 조회", content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" }, user: { $ref: "#/components/schemas/User" } } } } } }, 401: { description: "인증 필요" } } },
    },
    "/users/me/onboarding": {
      post: { tags: ["User"], security: [{ bearerAuth: [] }], description: "company(재직자) 또는 university(교수·학생)로 organizationAddress를 자동 조회해 저장한다. 조회 실패 시 주소만 null로 저장된다.", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ProfileInput" } } } }, responses: { 201: { description: "온보딩 저장 성공", content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" }, user: { $ref: "#/components/schemas/User" } } } } } }, 400: { description: "입력값 오류" }, 409: { description: "이미 온보딩 완료" } } },
    },
    "/users/me/profile": {
      patch: { tags: ["User"], security: [{ bearerAuth: [] }], description: "소속 기관(company·university)이 바뀐 경우에만 organizationAddress를 다시 조회한다. organizationAddress를 기존과 다른 값으로 보내면 조회하지 않고 그 값을 저장한다.", requestBody: { required: true, content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/ProfileInput" }, { type: "object", required: ["name"], properties: { name: { type: "string", minLength: 2 } } }] } } } }, responses: { 200: { description: "프로필 수정 성공", content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" }, user: { $ref: "#/components/schemas/User" } } } } } }, 400: { description: "입력값 오류" } } },
    },
    "/share/{shareId}": { get: { tags: ["Share"], parameters: [{ $ref: "#/components/parameters/shareId" }], responses: { 200: { description: "공유 명함 조회" }, 404: { description: "공유 링크 없음" } } } },
  },
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
    parameters: {
      portfolioId: { name: "portfolioId", in: "path", required: true, schema: { type: "integer", minimum: 1 } },
      shareId: { name: "shareId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
    },
    schemas: {
      User: { type: "object", properties: { id: { type: "integer" }, email: { type: "string", format: "email" }, name: { type: "string" }, role: { type: "string", nullable: true, enum: ["Professional", "Professor", "Student"] }, phone: { type: "string", nullable: true }, github: { type: "string", nullable: true }, company: { type: "string", nullable: true }, jobTitle: { type: "string", nullable: true }, tel: { type: "string", nullable: true }, university: { type: "string", nullable: true }, department: { type: "string", nullable: true }, major: { type: "string", nullable: true }, organizationAddress: { type: "string", nullable: true, description: "소속 기관 주소. 자동 조회 실패 시 null" }, onboardingCompleted: { type: "boolean" }, createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" } } },
      ProfileInput: { type: "object", required: ["role", "phone"], description: "Professional: company·jobTitle·tel 필수 / Professor: university·department·tel 필수 / Student: university·major 필수", properties: { role: { type: "string", enum: ["Professional", "Professor", "Student"] }, phone: { type: "string", pattern: "^\\d{3}-\\d{4}-\\d{4}$", example: "010-1234-5678" }, github: { type: "string", format: "uri" }, company: { type: "string", maxLength: 200 }, jobTitle: { type: "string", maxLength: 200 }, tel: { type: "string", maxLength: 200 }, university: { type: "string", maxLength: 200 }, department: { type: "string", maxLength: 200 }, major: { type: "string", maxLength: 200 }, organizationAddress: { type: "string", nullable: true, maxLength: 500, description: "생략하거나 기존 값 그대로 보내면 자동 조회(소속 기관이 바뀐 경우만). 기존과 다른 값을 보내면 조회 없이 그 값을 저장하며, \"\" 또는 null은 주소 삭제" } } },
      BusinessCard: { type: "object", properties: { name: { type: "string" }, headline: { type: "string" }, phone: { type: "string" }, email: { type: "string", format: "email" }, organizationAddress: { type: "string", nullable: true, description: "생성 시 사용자 프로필의 organizationAddress" } } },
      Portfolio: { type: "object", properties: { id: { type: "integer" }, title: { type: "string" }, userType: { type: "string" }, card: { $ref: "#/components/schemas/BusinessCard" }, profile: { type: "object" }, blocks: { type: "array", items: { type: "object" } }, sourceLinks: { type: "array", items: { type: "string" } }, sourceSnapshots: { type: "array", items: { type: "object" } } } },
    },
  },
} as const;

export default swaggerSpec;
