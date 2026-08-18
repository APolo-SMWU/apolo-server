const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "APolo Server API",
    version: "1.0.0",
    description: "APolo 백엔드 API 문서",
  },
  servers: [
    {
      url: "https://apolo-server.onrender.com",
      description: "Production server",
    },
    {
      url: "http://localhost:3000",
      description: "Local server",
    },
  ],
  tags: [
    { name: "Auth", description: "인증 API" },
    { name: "Portfolio", description: "포트폴리오 API" },
    { name: "Version", description: "포트폴리오 버전 API" },
    { name: "Archive", description: "공개 아카이브 API" },
    { name: "Shared", description: "공유 포트폴리오 API" },
    { name: "Comment", description: "댓글 API" },
    { name: "User", description: "사용자 API" },
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
      ErrorResponse: {
        type: "object",
        properties: {
          message: {
            type: "string",
            example: "입력값이 올바르지 않습니다.",
          },
          errorCode: {
            type: "string",
            example: "INVALID_INPUT",
          },
          errors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: { type: "string", example: "email" },
                message: {
                  type: "string",
                  example: "올바른 이메일 형식이 아닙니다.",
                },
              },
            },
            example: [
              {
                field: "email",
                message: "올바른 이메일 형식이 아닙니다.",
              },
            ],
          },
        },
      },

      User: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          email: { type: "string", example: "test@example.com" },
          nickname: { type: "string", example: "testuser" },
        },
      },

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

      LoginResponse: {
        type: "object",
        properties: {
          message: { type: "string", example: "로그인에 성공했습니다." },
          accessToken: { type: "string", example: "jwt-token-example" },
          expiresIn: { type: "integer", example: 3600 },
        },
      },

      UserResponse: {
        type: "object",
        properties: {
          message: { type: "string", example: "내 정보 조회 성공" },
          user: {
            $ref: "#/components/schemas/User",
          },
        },
      },

      PasswordUpdateResponse: {
        type: "object",
        properties: {
          message: {
            type: "string",
            example: "비밀번호 변경이 완료되었습니다.",
          },
        },
      },

      ExternalLink: {
        type: "object",
        required: ["label", "url"],
        properties: {
          label: {
            type: "string",
            minLength: 1,
            maxLength: 30,
            example: "GitHub",
          },
          url: {
            type: "string",
            format: "uri",
            example: "https://github.com/test",
          },
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
              $ref: "#/components/schemas/ExternalLink",
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
          shareToken: {
            type: "string",
            nullable: true,
            example: null,
          },
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
            example: "2026-07-31T07:24:21.385Z",
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
          title: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            example: "나의 첫 포트폴리오",
          },
          jobRole: {
            type: "string",
            minLength: 1,
            maxLength: 50,
            example: "Frontend Developer",
          },
          careerLevel: {
            type: "string",
            minLength: 1,
            maxLength: 30,
            example: "Student",
          },
          directionPrompt: {
            type: "string",
            minLength: 1,
            maxLength: 500,
            example: "미니멀하고 프로젝트 중심의 포트폴리오로 만들고 싶어요.",
          },
          externalLinks: {
            type: "array",
            maxItems: 10,
            items: {
              $ref: "#/components/schemas/ExternalLink",
            },
          },
          currentContentJson: {
            type: "object",
            additionalProperties: true,
            example: {
              blocks: [],
            },
          },
        },
      },

      UpdatePortfolioRequest: {
        type: "object",
        minProperties: 1,
        properties: {
          title: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            example: "수정된 포트폴리오 제목",
          },
          jobRole: {
            type: "string",
            minLength: 1,
            maxLength: 50,
            example: "Frontend Developer",
          },
          careerLevel: {
            type: "string",
            minLength: 1,
            maxLength: 30,
            example: "Student",
          },
          directionPrompt: {
            type: "string",
            minLength: 1,
            maxLength: 500,
            example: "조금 더 차분한 느낌으로 바꾸고 싶어요.",
          },
          externalLinks: {
            type: "array",
            maxItems: 10,
            items: {
              $ref: "#/components/schemas/ExternalLink",
            },
          },
          currentContentJson: {
            type: "object",
            additionalProperties: true,
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

      UpdateShareRequest: {
        type: "object",
        required: ["isShared"],
        properties: {
          isShared: { type: "boolean", example: true },
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

      PortfolioVersion: {
        type: "object",
        properties: {
          id: { type: "integer", example: 3 },
          portfolioId: { type: "integer", example: 2 },
          versionNumber: { type: "integer", example: 2 },
          contentJson: {
            type: "object",
            example: {
              title: "두 번째 포트폴리오",
              currentContentJson: {
                blocks: [{ type: "hero", text: "initial version" }],
                aiEditPrompt: "프로젝트 섹션을 위로 올리고 전체 톤을 더 차분하게 바꿔줘.",
              },
            },
          },
          changeType: {
            type: "string",
            example: "AI_EDIT",
          },
          changePrompt: {
            type: "string",
            nullable: true,
            example: "프로젝트 섹션을 위로 올리고 전체 톤을 더 차분하게 바꿔줘.",
          },
          createdAt: {
            type: "string",
            format: "date-time",
            example: "2026-07-28T08:04:50.812Z",
          },
        },
      },

      PortfolioResponse: {
        type: "object",
        properties: {
          message: { type: "string", example: "포트폴리오 상세 조회 성공" },
          portfolio: {
            $ref: "#/components/schemas/Portfolio",
          },
        },
      },

      PortfolioListResponse: {
        type: "object",
        properties: {
          message: { type: "string", example: "내 포트폴리오 목록 조회 성공" },
          portfolios: {
            type: "array",
            items: {
              $ref: "#/components/schemas/Portfolio",
            },
          },
        },
      },

      PortfolioVersionResponse: {
        type: "object",
        properties: {
          message: { type: "string", example: "포트폴리오 버전 상세 조회 성공" },
          version: {
            $ref: "#/components/schemas/PortfolioVersion",
          },
        },
      },

      PortfolioVersionListResponse: {
        type: "object",
        properties: {
          message: { type: "string", example: "포트폴리오 버전 목록 조회 성공" },
          versions: {
            type: "array",
            items: {
              $ref: "#/components/schemas/PortfolioVersion",
            },
          },
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

      Comment: {
        type: "object",
        properties: {
          id: { type: "integer", example: 2 },
          portfolioId: { type: "integer", example: 1 },
          authorId: { type: "integer", example: 1 },
          content: {
            type: "string",
            example: "수정된 댓글입니다.",
          },
          createdAt: {
            type: "string",
            format: "date-time",
            example: "2026-07-31T06:33:27.525Z",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
            example: "2026-07-31T07:28:35.575Z",
          },
        },
      },

      CommentResponse: {
        type: "object",
        properties: {
          message: { type: "string", example: "댓글 작성 성공" },
          comment: {
            $ref: "#/components/schemas/Comment",
          },
        },
      },

      CommentListResponse: {
        type: "object",
        properties: {
          message: { type: "string", example: "댓글 목록 조회 성공" },
          comments: {
            type: "array",
            items: {
              $ref: "#/components/schemas/Comment",
            },
          },
        },
      },

      UpdateProfileRequest: {
        type: "object",
        required: ["nickname"],
        properties: {
          nickname: { type: "string", example: "newNickname" },
        },
      },

      UpdatePasswordRequest: {
        type: "object",
        required: ["currentPassword", "newPassword", "newPasswordCheck"],
        properties: {
          currentPassword: { type: "string", example: "password123" },
          newPassword: { type: "string", example: "newpassword123" },
          newPasswordCheck: { type: "string", example: "newpassword123" },
        },
      },
    },
    responses: {
      ValidationError: {
        description: "잘못된 요청",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
            example: {
              message: "입력값이 올바르지 않습니다.",
              errorCode: "INVALID_INPUT",
              errors: [
                {
                  field: "email",
                  message: "올바른 이메일 형식이 아닙니다.",
                },
              ],
            },
          },
        },
      },
      UnauthorizedError: {
        description: "인증 실패",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
            example: {
              message: "유효하지 않은 토큰입니다.",
              errorCode: "UNAUTHORIZED",
              errors: [],
            },
          },
        },
      },
      ForbiddenError: {
        description: "권한 없음",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
            example: {
              message: "본인이 작성한 댓글만 수정할 수 있습니다.",
              errorCode: "FORBIDDEN",
              errors: [],
            },
          },
        },
      },
      NotFoundError: {
        description: "리소스를 찾을 수 없음",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
            example: {
              message: "포트폴리오를 찾을 수 없습니다.",
              errorCode: "NOT_FOUND",
              errors: [],
            },
          },
        },
      },
      ConflictError: {
        description: "중복 또는 충돌",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
            example: {
              message: "이미 사용 중인 이메일입니다.",
              errorCode: "CONFLICT",
              errors: [],
            },
          },
        },
      },
      InternalServerError: {
        description: "서버 내부 오류",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
            example: {
              message: "서버 내부 오류가 발생했습니다.",
              errorCode: "INTERNAL_SERVER_ERROR",
              errors: [],
            },
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
              example: {
                email: "test@example.com",
                nickname: "testuser",
                password: "password123",
                passwordCheck: "password123",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "회원가입 성공",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UserResponse",
                },
                example: {
                  message: "회원가입이 완료되었습니다.",
                  user: {
                    id: 1,
                    email: "test@example.com",
                    nickname: "testuser",
                  },
                },
              },
            },
          },
          "400": {
            description: "입력값 검증 실패 또는 비밀번호 불일치",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
                examples: {
                  검증실패: {
                    summary: "입력값 검증 실패",
                    value: {
                      message: "입력값이 올바르지 않습니다.",
                      errorCode: "INVALID_INPUT",
                      errors: [
                        {
                          field: "email",
                          message: "올바른 이메일 형식이 아닙니다.",
                        },
                      ],
                    },
                  },
                  비밀번호불일치: {
                    summary: "비밀번호와 비밀번호 확인 불일치",
                    value: {
                      message: "비밀번호가 일치하지 않습니다.",
                      errorCode: "BAD_REQUEST",
                      errors: [],
                    },
                  },
                },
              },
            },
          },
          "409": {
            description: "이메일 또는 닉네임 중복",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
                examples: {
                  이메일중복: {
                    summary: "이메일 중복",
                    value: {
                      message: "이미 사용 중인 이메일입니다.",
                      errorCode: "EMAIL_ALREADY_EXISTS",
                      errors: [],
                    },
                  },
                  닉네임중복: {
                    summary: "닉네임 중복",
                    value: {
                      message: "이미 사용 중인 닉네임입니다.",
                      errorCode: "NICKNAME_ALREADY_EXISTS",
                      errors: [],
                    },
                  },
                },
              },
            },
          },
          "500": {
            $ref: "#/components/responses/InternalServerError",
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
              example: {
                email: "test@example.com",
                password: "password123",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "로그인 성공",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/LoginResponse",
                },
                example: {
                  message: "로그인에 성공했습니다.",
                  accessToken: "jwt-token-example",
                  expiresIn: 3600,
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/ValidationError",
          },
          "401": {
            description: "이메일 또는 비밀번호 불일치",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
                example: {
                  message: "이메일 또는 비밀번호가 일치하지 않습니다.",
                  errorCode: "INVALID_CREDENTIALS",
                  errors: [],
                },
              },
            },
          },
          "500": {
            $ref: "#/components/responses/InternalServerError",
          },
        },
      },
    },

    "/users/me": {
      patch: {
        tags: ["User"],
        summary: "내 프로필 수정",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UpdateProfileRequest",
              },
              example: {
                nickname: "newNickname",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "내 프로필 수정 성공",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UserResponse",
                },
                example: {
                  message: "내 프로필 수정 성공",
                  user: {
                    id: 1,
                    email: "test@example.com",
                    nickname: "newNickname",
                  },
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/ValidationError",
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "409": {
            $ref: "#/components/responses/ConflictError",
          },
          "500": {
            $ref: "#/components/responses/InternalServerError",
          },
        },
      },
    },

    "/users/me/password": {
      patch: {
        tags: ["User"],
        summary: "내 비밀번호 변경",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UpdatePasswordRequest",
              },
              example: {
                currentPassword: "password123",
                newPassword: "newpassword123",
                newPasswordCheck: "newpassword123",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "비밀번호 변경 성공",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/PasswordUpdateResponse",
                },
                example: {
                  message: "비밀번호 변경이 완료되었습니다.",
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/ValidationError",
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "404": {
            $ref: "#/components/responses/NotFoundError",
          },
          "500": {
            $ref: "#/components/responses/InternalServerError",
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
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/PortfolioListResponse",
                },
                example: {
                  message: "내 포트폴리오 목록 조회 성공",
                  portfolios: [
                    {
                      id: 2,
                      userId: 1,
                      title: "두 번째 포트폴리오",
                      jobRole: "Backend Developer",
                      careerLevel: "Junior",
                      directionPrompt: "미니멀하고 프로젝트 중심의 포트폴리오로 만들고 싶어요.",
                      externalLinks: [
                        {
                          label: "GitHub",
                          url: "https://github.com/test",
                        },
                      ],
                      currentContentJson: {
                        blocks: [
                          { type: "hero", text: "안녕하세요. 백엔드 개발자입니다." },
                        ],
                      },
                      isPublic: true,
                      isShared: false,
                      shareToken: null,
                      sharedAt: null,
                      createdAt: "2026-07-28T07:29:46.319Z",
                      updatedAt: "2026-07-31T07:24:21.385Z",
                    },
                  ],
                },
              },
            },
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "500": {
            $ref: "#/components/responses/InternalServerError",
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
              example: {
                title: "나의 첫 포트폴리오",
                jobRole: "Backend Developer",
                careerLevel: "Junior",
                directionPrompt: "미니멀하고 프로젝트 중심의 포트폴리오로 만들고 싶어요.",
                externalLinks: [
                  {
                    label: "GitHub",
                    url: "https://github.com/test",
                  },
                ],
                currentContentJson: {
                  blocks: [],
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "포트폴리오 생성 성공",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/PortfolioResponse",
                },
                example: {
                  message: "포트폴리오 생성 성공",
                  portfolio: {
                    id: 1,
                    userId: 1,
                    title: "나의 첫 포트폴리오",
                    jobRole: "Backend Developer",
                    careerLevel: "Junior",
                    directionPrompt: "미니멀하고 프로젝트 중심의 포트폴리오로 만들고 싶어요.",
                    externalLinks: [
                      {
                        label: "GitHub",
                        url: "https://github.com/test",
                      },
                    ],
                    currentContentJson: {
                      blocks: [],
                    },
                    isPublic: false,
                    isShared: false,
                    shareToken: null,
                    sharedAt: null,
                    createdAt: "2026-08-05T06:00:00.000Z",
                    updatedAt: "2026-08-05T06:00:00.000Z",
                  },
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/ValidationError",
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "500": {
            $ref: "#/components/responses/InternalServerError",
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
            description: "조회할 포트폴리오 ID",
            schema: { type: "integer", example: 1 },
          },
        ],
        responses: {
          "200": {
            description: "포트폴리오 상세 조회 성공",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/PortfolioResponse",
                },
                example: {
                  message: "포트폴리오 상세 조회 성공",
                  portfolio: {
                    id: 1,
                    userId: 1,
                    title: "나의 첫 포트폴리오",
                    jobRole: "Backend Developer",
                    careerLevel: "Junior",
                    directionPrompt: "미니멀하고 프로젝트 중심의 포트폴리오로 만들고 싶어요.",
                    externalLinks: [
                      {
                        label: "GitHub",
                        url: "https://github.com/test",
                      },
                    ],
                    currentContentJson: {
                      blocks: [
                        { type: "hero", text: "안녕하세요. 백엔드 개발자입니다." },
                      ],
                    },
                    isPublic: false,
                    isShared: false,
                    shareToken: null,
                    sharedAt: null,
                    createdAt: "2026-08-05T06:00:00.000Z",
                    updatedAt: "2026-08-05T06:10:00.000Z",
                  },
                },
              },
            },
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "404": {
            $ref: "#/components/responses/NotFoundError",
          },
          "500": {
            $ref: "#/components/responses/InternalServerError",
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
            description: "수정할 포트폴리오 ID",
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
              example: {
                title: "수정된 포트폴리오 제목",
                currentContentJson: {
                  blocks: [
                    { type: "hero", text: "안녕하세요. 문제 해결을 즐기는 백엔드 개발자입니다." },
                    { type: "project", text: "대표 프로젝트 섹션" },
                  ],
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "포트폴리오 수정 성공",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/PortfolioResponse",
                },
                example: {
                  message: "포트폴리오 수정 성공",
                  portfolio: {
                    id: 1,
                    userId: 1,
                    title: "수정된 포트폴리오 제목",
                    jobRole: "Backend Developer",
                    careerLevel: "Junior",
                    directionPrompt: "미니멀하고 프로젝트 중심의 포트폴리오로 만들고 싶어요.",
                    externalLinks: [
                      {
                        label: "GitHub",
                        url: "https://github.com/test",
                      },
                    ],
                    currentContentJson: {
                      blocks: [
                        { type: "hero", text: "안녕하세요. 문제 해결을 즐기는 백엔드 개발자입니다." },
                        { type: "project", text: "대표 프로젝트 섹션" },
                      ],
                    },
                    isPublic: false,
                    isShared: false,
                    shareToken: null,
                    sharedAt: null,
                    createdAt: "2026-08-05T06:00:00.000Z",
                    updatedAt: "2026-08-05T06:15:00.000Z",
                  },
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/ValidationError",
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "404": {
            $ref: "#/components/responses/NotFoundError",
          },
          "500": {
            $ref: "#/components/responses/InternalServerError",
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
            description: "공개 여부를 바꿀 포트폴리오 ID",
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
              example: {
                isPublic: true,
              },
            },
          },
        },
        responses: {
          "200": {
            description: "포트폴리오 공개 여부 수정 성공",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/PortfolioResponse",
                },
                example: {
                  message: "포트폴리오 공개 여부 수정 성공",
                  portfolio: {
                    id: 1,
                    userId: 1,
                    title: "나의 첫 포트폴리오",
                    jobRole: "Backend Developer",
                    careerLevel: "Junior",
                    directionPrompt: "미니멀하고 프로젝트 중심의 포트폴리오로 만들고 싶어요.",
                    externalLinks: [],
                    currentContentJson: {
                      blocks: [],
                    },
                    isPublic: true,
                    isShared: false,
                    shareToken: null,
                    sharedAt: null,
                    createdAt: "2026-08-05T06:00:00.000Z",
                    updatedAt: "2026-08-05T06:20:00.000Z",
                  },
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/ValidationError",
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "404": {
            $ref: "#/components/responses/NotFoundError",
          },
          "500": {
            $ref: "#/components/responses/InternalServerError",
          },
        },
      },
    },

    "/portfolios/{portfolioId}/share": {
      patch: {
        tags: ["Portfolio"],
        summary: "포트폴리오 공유 여부 수정",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "portfolioId",
            in: "path",
            required: true,
            description: "공유 여부를 바꿀 포트폴리오 ID",
            schema: { type: "integer", example: 1 },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UpdateShareRequest",
              },
              example: {
                isShared: true,
              },
            },
          },
        },
        responses: {
          "200": {
            description: "포트폴리오 공유 여부 수정 성공",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/PortfolioResponse",
                },
                example: {
                  message: "포트폴리오 공유 여부 수정 성공",
                  portfolio: {
                    id: 1,
                    userId: 1,
                    title: "나의 첫 포트폴리오",
                    jobRole: "Backend Developer",
                    careerLevel: "Junior",
                    directionPrompt: "미니멀하고 프로젝트 중심의 포트폴리오로 만들고 싶어요.",
                    externalLinks: [],
                    currentContentJson: {
                      blocks: [],
                    },
                    isPublic: false,
                    isShared: true,
                    shareToken: "cace5987-f901-4840-bc49-f6c897e1e446",
                    sharedAt: "2026-08-05T06:25:00.000Z",
                    createdAt: "2026-08-05T06:00:00.000Z",
                    updatedAt: "2026-08-05T06:25:00.000Z",
                  },
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/ValidationError",
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "404": {
            $ref: "#/components/responses/NotFoundError",
          },
          "500": {
            $ref: "#/components/responses/InternalServerError",
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
            description: "AI 초안을 생성할 포트폴리오 ID",
            schema: { type: "integer", example: 1 },
          },
        ],
        responses: {
          "200": {
            description: "AI 초안 생성 성공",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/PortfolioResponse",
                },
                example: {
                  message: "AI 초안 생성 성공",
                  portfolio: {
                    id: 1,
                    userId: 1,
                    title: "나의 첫 포트폴리오",
                    jobRole: "Backend Developer",
                    careerLevel: "Junior",
                    directionPrompt: "미니멀하고 프로젝트 중심의 포트폴리오로 만들고 싶어요.",
                    externalLinks: [],
                    currentContentJson: {
                      blocks: [
                        { type: "hero", text: "AI가 생성한 포트폴리오 초안입니다." },
                        { type: "about", text: "간단한 자기소개 섹션" },
                        { type: "project", text: "대표 프로젝트 섹션" },
                      ],
                    },
                    isPublic: false,
                    isShared: false,
                    shareToken: null,
                    sharedAt: null,
                    createdAt: "2026-08-05T06:00:00.000Z",
                    updatedAt: "2026-08-05T06:30:00.000Z",
                  },
                },
              },
            },
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "404": {
            $ref: "#/components/responses/NotFoundError",
          },
          "409": {
            $ref: "#/components/responses/ConflictError",
          },
          "500": {
            $ref: "#/components/responses/InternalServerError",
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
            description: "AI로 수정할 포트폴리오 ID",
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
              example: {
                prompt: "hero 문구를 더 자신감 있게 바꾸고 프로젝트 섹션을 위로 올려줘.",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "AI 수정 반영 성공",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/PortfolioResponse",
                },
                example: {
                  message: "AI 수정 반영 성공",
                  portfolio: {
                    id: 1,
                    userId: 1,
                    title: "나의 첫 포트폴리오",
                    jobRole: "Backend Developer",
                    careerLevel: "Junior",
                    directionPrompt: "미니멀하고 프로젝트 중심의 포트폴리오로 만들고 싶어요.",
                    externalLinks: [],
                    currentContentJson: {
                      blocks: [
                        { type: "hero", text: "안녕하세요. 안정적인 서비스를 만드는 백엔드 개발자입니다." },
                        { type: "project", text: "대표 프로젝트 섹션" },
                      ],
                      aiEditPrompt: "hero 문구를 더 자신감 있게 바꾸고 프로젝트 섹션을 위로 올려줘.",
                      editedAt: "2026-08-05T06:35:00.000Z",
                    },
                    isPublic: false,
                    isShared: false,
                    shareToken: null,
                    sharedAt: null,
                    createdAt: "2026-08-05T06:00:00.000Z",
                    updatedAt: "2026-08-05T06:35:00.000Z",
                  },
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/ValidationError",
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "404": {
            $ref: "#/components/responses/NotFoundError",
          },
          "500": {
            $ref: "#/components/responses/InternalServerError",
          },
        },
      },
    },

    "/portfolios/{portfolioId}/versions": {
      get: {
        tags: ["Version"],
        summary: "포트폴리오 버전 목록 조회",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "portfolioId",
            in: "path",
            required: true,
            description: "버전 목록을 조회할 포트폴리오 ID",
            schema: { type: "integer", example: 2 },
          },
        ],
        responses: {
          "200": {
            description: "포트폴리오 버전 목록 조회 성공",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/PortfolioVersionListResponse",
                },
                example: {
                  message: "포트폴리오 버전 목록 조회 성공",
                  versions: [
                    {
                      id: 3,
                      portfolioId: 2,
                      versionNumber: 3,
                      contentJson: {
                        title: "두 번째 포트폴리오",
                        jobRole: "Backend Developer",
                        careerLevel: "Junior",
                        directionPrompt: "미니멀하고 프로젝트 중심의 포트폴리오로 만들고 싶어요.",
                        externalLinks: [],
                        currentContentJson: {
                          blocks: [
                            { type: "hero", text: "안녕하세요. 백엔드 개발자입니다." },
                          ],
                        },
                        isPublic: false,
                      },
                      changeType: "MANUAL_EDIT",
                      changePrompt: null,
                      createdAt: "2026-08-05T06:40:00.000Z",
                    },
                    {
                      id: 2,
                      portfolioId: 2,
                      versionNumber: 2,
                      contentJson: {
                        title: "두 번째 포트폴리오",
                        jobRole: "Backend Developer",
                        careerLevel: "Junior",
                        directionPrompt: "미니멀하고 프로젝트 중심의 포트폴리오로 만들고 싶어요.",
                        externalLinks: [],
                        currentContentJson: {
                          blocks: [
                            { type: "hero", text: "AI가 생성한 포트폴리오 초안입니다." },
                          ],
                        },
                        isPublic: false,
                      },
                      changeType: "INITIAL_GENERATION",
                      changePrompt: null,
                      createdAt: "2026-08-05T06:30:00.000Z",
                    },
                  ],
                },
              },
            },
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "404": {
            $ref: "#/components/responses/NotFoundError",
          },
          "500": {
            $ref: "#/components/responses/InternalServerError",
          },
        },
      },
    },

    "/portfolios/{portfolioId}/versions/{versionId}": {
      get: {
        tags: ["Version"],
        summary: "포트폴리오 버전 상세 조회",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "portfolioId",
            in: "path",
            required: true,
            description: "버전이 속한 포트폴리오 ID",
            schema: { type: "integer", example: 2 },
          },
          {
            name: "versionId",
            in: "path",
            required: true,
            description: "조회할 버전 ID",
            schema: { type: "integer", example: 3 },
          },
        ],
        responses: {
          "200": {
            description: "포트폴리오 버전 상세 조회 성공",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/PortfolioVersionResponse",
                },
                example: {
                  message: "포트폴리오 버전 상세 조회 성공",
                  version: {
                    id: 3,
                    portfolioId: 2,
                    versionNumber: 3,
                    contentJson: {
                      title: "두 번째 포트폴리오",
                      jobRole: "Backend Developer",
                      careerLevel: "Junior",
                      directionPrompt: "미니멀하고 프로젝트 중심의 포트폴리오로 만들고 싶어요.",
                      externalLinks: [],
                      currentContentJson: {
                        blocks: [
                          { type: "hero", text: "안녕하세요. 백엔드 개발자입니다." },
                        ],
                      },
                      isPublic: false,
                    },
                    changeType: "MANUAL_EDIT",
                    changePrompt: null,
                    createdAt: "2026-08-05T06:40:00.000Z",
                  },
                },
              },
            },
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "404": {
            $ref: "#/components/responses/NotFoundError",
          },
          "500": {
            $ref: "#/components/responses/InternalServerError",
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
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/PortfolioListResponse",
                },
                example: {
                  message: "공개 포트폴리오 목록 조회 성공",
                  portfolios: [
                    {
                      id: 1,
                      userId: 1,
                      title: "나의 첫 포트폴리오",
                      jobRole: "Backend Developer",
                      careerLevel: "Junior",
                      directionPrompt: "미니멀하고 프로젝트 중심의 포트폴리오로 만들고 싶어요.",
                      externalLinks: [],
                      currentContentJson: {
                        blocks: [
                          { type: "hero", text: "안녕하세요. 백엔드 개발자입니다." },
                        ],
                      },
                      isPublic: true,
                      isShared: false,
                      shareToken: null,
                      sharedAt: null,
                      createdAt: "2026-08-05T06:00:00.000Z",
                      updatedAt: "2026-08-05T06:20:00.000Z",
                    },
                  ],
                },
              },
            },
          },
          "500": {
            $ref: "#/components/responses/InternalServerError",
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
            description: "조회할 공개 포트폴리오 ID",
            schema: { type: "integer", example: 1 },
          },
        ],
        responses: {
          "200": {
            description: "공개 포트폴리오 상세 조회 성공",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/PortfolioResponse",
                },
                example: {
                  message: "공개 포트폴리오 상세 조회 성공",
                  portfolio: {
                    id: 1,
                    userId: 1,
                    title: "나의 첫 포트폴리오",
                    jobRole: "Backend Developer",
                    careerLevel: "Junior",
                    directionPrompt: "미니멀하고 프로젝트 중심의 포트폴리오로 만들고 싶어요.",
                    externalLinks: [],
                    currentContentJson: {
                      blocks: [
                        { type: "hero", text: "안녕하세요. 백엔드 개발자입니다." },
                      ],
                    },
                    isPublic: true,
                    isShared: false,
                    shareToken: null,
                    sharedAt: null,
                    createdAt: "2026-08-05T06:00:00.000Z",
                    updatedAt: "2026-08-05T06:20:00.000Z",
                  },
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/ValidationError",
          },
          "404": {
            $ref: "#/components/responses/NotFoundError",
          },
          "500": {
            $ref: "#/components/responses/InternalServerError",
          },
        },
      },
    },

    "/shared/portfolios/{shareToken}": {
      get: {
        tags: ["Shared"],
        summary: "공유 포트폴리오 조회",
        parameters: [
          {
            name: "shareToken",
            in: "path",
            required: true,
            description: "공유 포트폴리오 조회용 토큰",
            schema: {
              type: "string",
              example: "cace5987-f901-4840-bc49-f6c897e1e446",
            },
          },
        ],
        responses: {
          "200": {
            description: "공유 포트폴리오 조회 성공",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/PortfolioResponse",
                },
                example: {
                  message: "공유 포트폴리오 조회 성공",
                  portfolio: {
                    id: 1,
                    userId: 1,
                    title: "나의 첫 포트폴리오",
                    jobRole: "Backend Developer",
                    careerLevel: "Junior",
                    directionPrompt: "미니멀하고 프로젝트 중심의 포트폴리오로 만들고 싶어요.",
                    externalLinks: [],
                    currentContentJson: {
                      blocks: [
                        { type: "hero", text: "안녕하세요. 백엔드 개발자입니다." },
                      ],
                    },
                    isPublic: false,
                    isShared: true,
                    shareToken: "cace5987-f901-4840-bc49-f6c897e1e446",
                    sharedAt: "2026-08-05T06:25:00.000Z",
                    createdAt: "2026-08-05T06:00:00.000Z",
                    updatedAt: "2026-08-05T06:25:00.000Z",
                  },
                },
              },
            },
          },
          "404": {
            $ref: "#/components/responses/NotFoundError",
          },
          "500": {
            $ref: "#/components/responses/InternalServerError",
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
            description: "댓글 목록을 조회할 공개 포트폴리오 ID",
            schema: { type: "integer", example: 1 },
          },
        ],
        responses: {
          "200": {
            description: "댓글 목록 조회 성공",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CommentListResponse",
                },
                example: {
                  message: "댓글 목록 조회 성공",
                  comments: [
                    {
                      id: 1,
                      portfolioId: 1,
                      authorId: 2,
                      content: "포트폴리오가 깔끔해서 보기 좋아요.",
                      createdAt: "2026-08-05T06:50:00.000Z",
                      updatedAt: "2026-08-05T06:50:00.000Z",
                    },
                    {
                      id: 2,
                      portfolioId: 1,
                      authorId: 3,
                      content: "프로젝트 설명이 명확해서 좋았습니다.",
                      createdAt: "2026-08-05T06:55:00.000Z",
                      updatedAt: "2026-08-05T06:55:00.000Z",
                    },
                  ],
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/ValidationError",
          },
          "404": {
            $ref: "#/components/responses/NotFoundError",
          },
          "500": {
            $ref: "#/components/responses/InternalServerError",
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
            description: "댓글을 작성할 공개 포트폴리오 ID",
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
              example: {
                content: "포트폴리오가 깔끔해서 보기 좋아요.",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "댓글 작성 성공",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CommentResponse",
                },
                example: {
                  message: "댓글 작성 성공",
                  comment: {
                    id: 2,
                    portfolioId: 1,
                    authorId: 1,
                    content: "포트폴리오가 깔끔해서 보기 좋아요.",
                    createdAt: "2026-08-05T06:55:00.000Z",
                    updatedAt: "2026-08-05T06:55:00.000Z",
                  },
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/ValidationError",
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "404": {
            $ref: "#/components/responses/NotFoundError",
          },
          "500": {
            $ref: "#/components/responses/InternalServerError",
          },
        },
      },
    },

    "/comments/{commentId}": {
      patch: {
        tags: ["Comment"],
        summary: "댓글 수정",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "commentId",
            in: "path",
            required: true,
            description: "수정할 댓글 ID",
            schema: { type: "integer", example: 2 },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CommentRequest",
              },
              example: {
                content: "수정된 댓글입니다.",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "댓글 수정 성공",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CommentResponse",
                },
                example: {
                  message: "댓글 수정 성공",
                  comment: {
                    id: 2,
                    portfolioId: 1,
                    authorId: 1,
                    content: "수정된 댓글입니다.",
                    createdAt: "2026-08-05T06:55:00.000Z",
                    updatedAt: "2026-08-05T07:00:00.000Z",
                  },
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/ValidationError",
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "403": {
            $ref: "#/components/responses/ForbiddenError",
          },
          "404": {
            $ref: "#/components/responses/NotFoundError",
          },
          "500": {
            $ref: "#/components/responses/InternalServerError",
          },
        },
      },
      delete: {
        tags: ["Comment"],
        summary: "댓글 삭제",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "commentId",
            in: "path",
            required: true,
            description: "삭제할 댓글 ID",
            schema: { type: "integer", example: 2 },
          },
        ],
        responses: {
          "200": {
            description: "댓글 삭제 성공",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CommentResponse",
                },
                example: {
                  message: "댓글 삭제 성공",
                  comment: {
                    id: 2,
                    portfolioId: 1,
                    authorId: 1,
                    content: "수정된 댓글입니다.",
                    createdAt: "2026-08-05T06:55:00.000Z",
                    updatedAt: "2026-08-05T07:00:00.000Z",
                  },
                },
              },
            },
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "403": {
            $ref: "#/components/responses/ForbiddenError",
          },
          "404": {
            $ref: "#/components/responses/NotFoundError",
          },
          "500": {
            $ref: "#/components/responses/InternalServerError",
          },
        },
      },
    },
  },
};

export default swaggerSpec;
