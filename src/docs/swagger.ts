const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "APolo Server API",
    version: "1.0.0",
    description: "APolo 백엔드 API 문서",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local server",
    },
  ],
  tags: [
    { name: "Auth", description: "인증 API" },
    { name: "Portfolio", description: "포트폴리오 API" },
    { name: "Archive", description: "공개 아카이브 API" },
    { name: "Comment", description: "댓글 API" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      SignupRequest: {
        type: "object",
        required: ["email", "nickname", "password", "passwordCheck"],
        properties: {
          email: { type: "string", example: "test@example.com" },
          nickname: { type: "string", example: "testuser" },
          password: { type: "string", example: "password123" },
          passwordCheck: { type: "string", example: "password123" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", example: "test@example.com" },
          password: { type: "string", example: "password123" },
        },
      },
      CommentRequest: {
        type: "object",
        required: ["content"],
        properties: {
          content: {
            type: "string",
            example: "포트폴리오가 깔끔해서 보기 좋아요.",
          },
        },
      },
      MeResponse: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          email: { type: "string", example: "test@example.com" },
          nickname: { type: "string", example: "testuser" },
        },
      },
      Portfolio: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          userId: { type: "integer", example: 1 },
          title: { type: "string", example: "나의 첫 포트폴리오" },
          jobRole: { type: "string", example: "Frontend Developer" },
          careerLevel: { type: "string", example: "Student" },
          directionPrompt: {
            type: "string",
            example: "미니멀하고 프로젝트 중심의 포트폴리오로 만들고 싶어요.",
          },
          externalLinks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string", example: "GitHub" },
                url: { type: "string", example: "https://github.com/..." },
              },
            },
          },
          currentContentJson: {
            type: "object",
            example: {
              blocks: [{ type: "hero", text: "version test" }],
            },
          },
          isPublic: { type: "boolean", example: true },
          isShared: { type: "boolean", example: false },
          shareToken: { type: "string", nullable: true, example: null },
          sharedAt: {
            type: "string",
            format: "date-time",
            nullable: true,
            example: null,
          },
          createdAt: {
            type: "string",
            format: "date-time",
            example: "2026-07-28T07:29:46.319Z",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
            example: "2026-07-28T07:53:12.485Z",
          },
        },
      },
      CreatePortfolioRequest: {
        type: "object",
        required: [
          "title",
          "jobRole",
          "careerLevel",
          "directionPrompt",
          "externalLinks",
          "currentContentJson",
        ],
        properties: {
          title: { type: "string", example: "나의 첫 포트폴리오" },
          jobRole: { type: "string", example: "Frontend Developer" },
          careerLevel: { type: "string", example: "Student" },
          directionPrompt: {
            type: "string",
            example: "미니멀하고 프로젝트 중심의 포트폴리오로 만들고 싶어요.",
          },
          externalLinks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string", example: "GitHub" },
                url: { type: "string", example: "https://github.com/..." },
              },
            },
          },
          currentContentJson: {
            type: "object",
            example: {
              blocks: [],
            },
          },
        },
      },
      UpdatePortfolioRequest: {
        type: "object",
        properties: {
          title: { type: "string", example: "수정된 포트폴리오 제목" },
          jobRole: { type: "string", example: "Frontend Developer" },
          careerLevel: { type: "string", example: "Student" },
          directionPrompt: {
            type: "string",
            example: "조금 더 차분한 느낌으로 바꾸고 싶어요.",
          },
          externalLinks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string", example: "GitHub" },
                url: { type: "string", example: "https://github.com/..." },
              },
            },
          },
          currentContentJson: {
            type: "object",
            example: {
              blocks: [{ type: "hero", text: "updated" }],
            },
          },
        },
      },
      UpdateVisibilityRequest: {
        type: "object",
        required: ["isPublic"],
        properties: {
          isPublic: { type: "boolean", example: true },
        },
      },
      AiEditRequest: {
        type: "object",
        required: ["prompt"],
        properties: {
          prompt: {
            type: "string",
            example: "프로젝트 섹션을 위로 올리고 전체 톤을 더 차분하게 바꿔줘.",
          },
        },
      },
      Comment: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          portfolioId: { type: "integer", example: 1 },
          authorId: { type: "integer", example: 1 },
          content: {
            type: "string",
            example: "포트폴리오가 깔끔해서 보기 좋아요.",
          },
          createdAt: {
            type: "string",
            format: "date-time",
            example: "2026-07-31T06:33:11.508Z",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
            example: "2026-07-31T06:33:11.508Z",
          },
        },
      },
    },
  },
  paths: {
    "/auth/signup": {
      post: {
        tags: ["Auth"],
        summary: "회원가입",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/SignupRequest",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "회원가입 성공",
          },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "로그인",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/LoginRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "로그인 성공",
          },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "내 정보 조회",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "내 정보 조회 성공",
          },
        },
      },
    },
    "/portfolios": {
      get: {
        tags: ["Portfolio"],
        summary: "내 포트폴리오 목록 조회",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "내 포트폴리오 목록 조회 성공",
          },
        },
      },
      post: {
        tags: ["Portfolio"],
        summary: "포트폴리오 생성",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CreatePortfolioRequest",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "포트폴리오 생성 성공",
          },
        },
      },
    },
    "/portfolios/{portfolioId}": {
      get: {
        tags: ["Portfolio"],
        summary: "포트폴리오 상세 조회",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "portfolioId",
            in: "path",
            required: true,
            schema: { type: "integer", example: 1 },
          },
        ],
        responses: {
          "200": {
            description: "포트폴리오 상세 조회 성공",
          },
        },
      },
      patch: {
        tags: ["Portfolio"],
        summary: "포트폴리오 수정",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "portfolioId",
            in: "path",
            required: true,
            schema: { type: "integer", example: 1 },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UpdatePortfolioRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "포트폴리오 수정 성공",
          },
        },
      },
    },
    "/portfolios/{portfolioId}/visibility": {
      patch: {
        tags: ["Portfolio"],
        summary: "포트폴리오 공개 여부 수정",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "portfolioId",
            in: "path",
            required: true,
            schema: { type: "integer", example: 1 },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UpdateVisibilityRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "포트폴리오 공개 여부 수정 성공",
          },
        },
      },
    },
    "/portfolios/{portfolioId}/generate": {
      post: {
        tags: ["Portfolio"],
        summary: "AI 초안 생성",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "portfolioId",
            in: "path",
            required: true,
            schema: { type: "integer", example: 1 },
          },
        ],
        responses: {
          "200": {
            description: "AI 초안 생성 성공",
          },
        },
      },
    },
    "/portfolios/{portfolioId}/ai-edit": {
      post: {
        tags: ["Portfolio"],
        summary: "AI 수정 반영",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "portfolioId",
            in: "path",
            required: true,
            schema: { type: "integer", example: 1 },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/AiEditRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "AI 수정 반영 성공",
          },
        },
      },
    },
    "/archive/portfolios": {
      get: {
        tags: ["Archive"],
        summary: "공개 포트폴리오 목록 조회",
        responses: {
          "200": {
            description: "공개 포트폴리오 목록 조회 성공",
          },
        },
      },
    },
    "/archive/portfolios/{portfolioId}": {
      get: {
        tags: ["Archive"],
        summary: "공개 포트폴리오 상세 조회",
        parameters: [
          {
            name: "portfolioId",
            in: "path",
            required: true,
            schema: { type: "integer", example: 1 },
          },
        ],
        responses: {
          "200": {
            description: "공개 포트폴리오 상세 조회 성공",
          },
        },
      },
    },
    "/portfolios/{portfolioId}/comments": {
      get: {
        tags: ["Comment"],
        summary: "댓글 목록 조회",
        parameters: [
          {
            name: "portfolioId",
            in: "path",
            required: true,
            schema: { type: "integer", example: 1 },
          },
        ],
        responses: {
          "200": {
            description: "댓글 목록 조회 성공",
          },
        },
      },
      post: {
        tags: ["Comment"],
        summary: "댓글 작성",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "portfolioId",
            in: "path",
            required: true,
            schema: { type: "integer", example: 1 },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CommentRequest",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "댓글 작성 성공",
          },
        },
      },
    },
    "/comments/{commentId}": {
      delete: {
        tags: ["Comment"],
        summary: "댓글 삭제",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "commentId",
            in: "path",
            required: true,
            schema: { type: "integer", example: 1 },
          },
        ],
        responses: {
          "200": {
            description: "댓글 삭제 성공",
          },
        },
      },
    },
  },
};

export default swaggerSpec;