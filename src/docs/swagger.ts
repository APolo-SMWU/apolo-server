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
      post: { tags: ["Online Card"], security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["title", "cardDesignId", "siteDesignId", "externalLinks"], properties: { title: { type: "string" }, cardDesignId: { type: "string" }, siteDesignId: { type: "string" }, externalLinks: { type: "array", minItems: 1, items: { type: "string", format: "uri" } }, requirements: { type: "string", maxLength: 2000 } } } }, "multipart/form-data": { schema: { type: "object", required: ["title", "cardDesignId", "siteDesignId", "externalLinks"], properties: { title: { type: "string" }, cardDesignId: { type: "string" }, siteDesignId: { type: "string" }, externalLinks: { type: "string", description: "JSON 배열 문자열" }, requirements: { type: "string", maxLength: 2000 }, attachments: { type: "array", items: { type: "string", format: "binary" }, maxItems: 5 } } } } } }, responses: { 201: { description: "생성 성공", content: { "application/json": { schema: { $ref: "#/components/schemas/Portfolio" } } } }, 422: { description: "사용자 프로필 미완성 또는 첨부파일 오류" } } },
    },
    "/portfolios/{portfolioId}": {
      get: { tags: ["Online Card"], security: [{ bearerAuth: [] }], parameters: [{ $ref: "#/components/parameters/portfolioId" }], responses: { 200: { description: "상세 조회" }, 404: { description: "없음" } } },
      patch: { tags: ["Online Card"], description: "주소 수정은 card.organizationAddress로 전달한다. 문자열 또는 null을 허용하며, 해당 명함에만 반영한다. profile.organizationAddress와 최상위 organizationAddress는 허용하지 않는다.", security: [{ bearerAuth: [] }], parameters: [{ $ref: "#/components/parameters/portfolioId" }], requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } }, responses: { 200: { description: "수정 성공" } } },
      delete: { tags: ["Online Card"], security: [{ bearerAuth: [] }], parameters: [{ $ref: "#/components/parameters/portfolioId" }], responses: { 204: { description: "삭제 성공" } } },
    },
    "/portfolios/{portfolioId}/update-content": { post: { tags: ["Online Card"], security: [{ bearerAuth: [] }], parameters: [{ $ref: "#/components/parameters/portfolioId" }], responses: { 200: { description: "외부 소스 갱신 성공" } } } },
    "/portfolios/{portfolioId}/share": { post: { tags: ["Share"], security: [{ bearerAuth: [] }], parameters: [{ $ref: "#/components/parameters/portfolioId" }], responses: { 201: { description: "공유 링크 생성", content: { "application/json": { schema: { type: "object", properties: { shareId: { type: "string", format: "uuid" }, shareUrl: { type: "string", format: "uri" } } } } } } } } },
    "/portfolios/{portfolioId}/profile/avatar": {
      post: { tags: ["Online Card"], security: [{ bearerAuth: [] }], parameters: [{ $ref: "#/components/parameters/portfolioId" }], requestBody: { required: true, content: { "multipart/form-data": { schema: { type: "object", required: ["file"], properties: { file: { type: "string", format: "binary" } } } } } }, responses: { 200: { description: "프로필 사진 업로드 성공" }, 400: { description: "파일 누락" }, 422: { description: "지원하지 않는 형식 또는 용량 초과" } } },
      get: { tags: ["Online Card"], security: [{ bearerAuth: [] }], parameters: [{ $ref: "#/components/parameters/portfolioId" }], responses: { 302: { description: "S3 서명 URL로 이동" }, 404: { description: "프로필 사진 없음" } } },
    },
    "/users/me": {
      get: { tags: ["User"], security: [{ bearerAuth: [] }], responses: { 200: { description: "내 정보 조회", content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" }, user: { $ref: "#/components/schemas/User" } } } } } }, 401: { description: "인증 필요" } } },
    },
    "/users/me/onboarding": {
      post: { tags: ["User"], security: [{ bearerAuth: [] }], description: "회사·학교로 주소를 자동 조회해 내부 저장한다. 조회 실패 시 null이며, 주소는 요청·사용자 응답에 포함하지 않는다.", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ProfileInput" } } } }, responses: { 201: { description: "온보딩 저장 성공", content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" }, user: { $ref: "#/components/schemas/User" } } } } } }, 400: { description: "입력값 오류" }, 409: { description: "이미 온보딩 완료" } } },
    },
    "/users/me/profile": {
      patch: { tags: ["User"], security: [{ bearerAuth: [] }], description: "소속 기관(company·university)이 바뀐 경우에만 주소를 자동 조회해 내부 저장한다. organizationAddress 입력은 허용하지 않으며 사용자 응답에도 포함하지 않는다. 기존 명함 주소는 변경하지 않는다.", requestBody: { required: true, content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/ProfileInput" }, { type: "object", required: ["name"], properties: { name: { type: "string", minLength: 2 } } }] } } } }, responses: { 200: { description: "프로필 수정 성공", content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" }, user: { $ref: "#/components/schemas/User" } } } } } }, 400: { description: "입력값 오류" } } },
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
      User: { type: "object", properties: { id: { type: "integer" }, email: { type: "string", format: "email" }, name: { type: "string" }, role: { type: "string", nullable: true, enum: ["Professional", "Professor", "Student"] }, phone: { type: "string", nullable: true }, github: { type: "string", nullable: true }, company: { type: "string", nullable: true }, jobTitle: { type: "string", nullable: true }, tel: { type: "string", nullable: true }, university: { type: "string", nullable: true }, department: { type: "string", nullable: true }, major: { type: "string", nullable: true }, onboardingCompleted: { type: "boolean" }, createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" } } },
      ProfileInput: { type: "object", required: ["role", "phone"], description: "Professional: company·jobTitle·tel 필수 / Professor: university·department·tel 필수 / Student: university·major 필수", properties: { role: { type: "string", enum: ["Professional", "Professor", "Student"] }, phone: { type: "string", pattern: "^\\d{3}-\\d{4}-\\d{4}$", example: "010-1234-5678" }, github: { type: "string", format: "uri" }, company: { type: "string", maxLength: 200 }, jobTitle: { type: "string", maxLength: 200 }, tel: { type: "string", maxLength: 200 }, university: { type: "string", maxLength: 200 }, department: { type: "string", maxLength: 200 }, major: { type: "string", maxLength: 200 } } },
      BusinessCard: { type: "object", properties: { name: { type: "string" }, headline: { type: "string" }, phone: { type: "string", description: "휴대전화" }, tel: { type: "string", nullable: true, description: "기관·유선 전화. 기존 명함에는 없을 수 있음" }, email: { type: "string", format: "email" }, organizationAddress: { type: "string", nullable: true, description: "생성 시 Backend가 내부 사용자 주소를 복사한다. 이후 card.organizationAddress로만 수정하며 사용자 주소에는 역반영하지 않는다." }, logoUrl: { type: "string", format: "uri", nullable: true, description: "생성 시 소속 기관 로고(공식 홈페이지 아이콘 → 위키데이터 공식 로고). 못 찾으면 null, 이전 명함에는 없을 수 있음" } } },
      Portfolio: { type: "object", properties: { id: { type: "integer" }, title: { type: "string" }, userType: { type: "string" }, card: { $ref: "#/components/schemas/BusinessCard" }, profile: { type: "object" }, blocks: { type: "array", items: { type: "object" } }, sourceLinks: { type: "array", items: { type: "string" } }, sourceSnapshots: { type: "array", items: { type: "object" } } } },
    },
  },
} as const;

export default swaggerSpec;
