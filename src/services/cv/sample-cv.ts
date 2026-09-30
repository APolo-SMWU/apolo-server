import type { CvData } from "../../types/cv";

/** 첨부 이력서(resume_kor.pdf)를 그대로 옮긴 렌더러 확인용 픽스처. 연락처는 더미 값이다. */
export const sampleCv: CvData = {
  header: {
    name: "김미지",
    contacts: [
      { label: "거주지", value: "서울 / 천안" },
      { label: "이메일", value: "example@example.com" },
      { label: "연락처", value: "010-0000-0000" },
    ],
    links: [
      { label: "GitHub", href: "https://github.com/example" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/example" },
      { label: "포트폴리오", href: "https://example.com" },
    ],
  },
  sections: [
    {
      title: "학력",
      layout: "entries",
      entries: [
        {
          title: "숙명여자대학교",
          date: "2022.03 – 2027.02 (졸업 예정)",
          subtitle: "통계학 전공; 소프트웨어융합 복수전공",
          location: "서울",
          bullets: ["학점: 3.81 / 4.5     이수 학점: 119"],
        },
      ],
    },
    {
      title: "경력",
      layout: "entries",
      entries: [
        {
          title: "운영조교",
          date: "2023.03 – 2025.02, 2026.03 – 2026.12",
          subtitle: "서울빅데이터캠퍼스 숙명여자대학교 분원",
          location: "서울",
          bullets: [
            "현장 이용 예약 관리",
            "데이터 반입·반출 요청 관리",
            "빅데이터전공(COSS) 컨소시엄 강의 메타데이터 전처리",
          ],
        },
        {
          title: "통계조사보조원",
          date: "2025.04 – 2025.11",
          subtitle: "한국은행 통계교육단",
          location: "서울",
          bullets: [
            "학습 및 평가용 뉴스 레이블링 데이터셋 구축",
            "뉴스심리지수(NSI)를 위한 다단계 LLM 분류 시스템 모델링 및 평가, sLLM과 Encoder 모델 벤치마킹",
            "일별 지수 산출 및 키워드 추출 모듈 개발",
          ],
        },
      ],
    },
    {
      title: "논문",
      layout: "bullets",
      entries: [
        {
          title:
            "「의료 AI 모델 보안을 위한 적대적 공격 기법 분석 및 최적화」, ACK 2025, 한국정보처리학회, 2025.11 (공동 제1저자)",
        },
        {
          title:
            "「적대적 AI 공격에 대응하는 ISO 6346 컨테이너 코드 인식 보안 강화 솔루션 구현」, ACK 2025, 한국정보처리학회, 2025.11 (공동 제1저자)",
        },
      ],
    },
    {
      title: "프로젝트",
      layout: "entries",
      entries: [
        {
          title: "QAD-RAG — 질의 적응형 Multi-hop RAG",
          link: { label: "Source Code", href: "https://github.com/example/qad-rag" },
          bullets: [
            "LogicRAG(AAAI 2026)를 재현하고 GraphRAG와 비교 실험하여 동적 질의 분해의 우위를 확인, 베이스라인으로 채택",
            "통제 실험으로 질의 분해만 분리해 병목이 검색이 아닌 분해 품질에 있음을 규명",
            "질의를 chain/branching으로 분류해 유형별 프롬프트로 라우팅하는 Query Classifier & Router를 제안, 단일 프롬프트 대비 전 지표 개선",
          ],
        },
        {
          title: "Reservia — 멀티에이전트 예약 응대 시스템",
          link: { label: "Source Code", href: "https://github.com/example/reservia" },
          bullets: [
            "웹훅 수신부터 결제 확인·캘린더 등록까지 예약 처리 전 과정을 LangGraph 상태 그래프로 구현",
            "LLM, 규칙 기반 Policy Engine, Human-in-the-loop의 담당 기준 설계",
            "이전 대화 맥락을 이어받아 짧은 답변의 오분류를 개선하고, 누락 정보 수에 따라 후속 질의를 분기하여 필수 정보 수집을 최대 7번에서 1번으로 단축",
          ],
        },
        {
          title: "TorchDocs — PyTorch 공식 문서 기반 RAG 챗봇",
          link: { label: "Source Code", href: "https://github.com/example/torchdocs" },
          bullets: [
            "문서 청크화·임베딩부터 FAISS 검색, MMR 리랭킹까지 검색 파이프라인 전 과정 구축",
            "RAGAS로 faithfulness, context precision, recall 평가",
          ],
        },
        {
          title: "NetSecure — Azure 기반 보안 리포트 자동화 시스템",
          link: { label: "Source Code", href: "https://github.com/example/netsecure" },
          bullets: [
            "네트워크 침입 탐지부터 대응 리포트 생성까지 전 과정을 자동화하는 보안 관제 시스템 구축, Microsoft Azure PaaS 서비스만으로 구성",
            "CPU만으로 학습·추론이 가능한 모델과 배포 구성을 선택하고, 경량 Container Instances 엔드포인트로 저비용을 유지하는 구조 설계",
          ],
        },
      ],
    },
    {
      title: "수상",
      layout: "entries",
      entries: [
        { title: "우수상, Upstage Low-Code AI Challenge 해커톤", date: "2026.06" },
        { title: "장려상, 한이음 드림업 (ICT 멘토링) 공모전", date: "2025.11" },
        { title: "우수상, 제3회 월간 빅데이터캠퍼스 공모전", date: "2024.08" },
        { title: "대상, SM-Data 시각화 경진대회", date: "2024.05" },
      ],
    },
    {
      title: "대외활동",
      layout: "entries",
      entries: [
        {
          title: "해외연구프로그램, 빅데이터혁신공유사업단",
          date: "2026.06 – 2026.07",
          subtitle: "퍼듀대학교",
          location: "미국 인디애나주 웨스트라피엣",
          bullets: ["머신러닝 및 최적화 연구 프로젝트 수행"],
        },
        {
          title: "BOAZ (빅데이터 연합 동아리)",
          date: "2025.07 – 2026.07",
          subtitle: "분석 트랙 25기; 운영진 기획팀",
          location: "서울",
          bullets: ["RAG 및 GraphRAG 프로젝트 수행, 동아리 행사 기획 및 운영"],
        },
        {
          title: "DACOS (소프트웨어융합전공 데이터 분석 동아리)",
          date: "2024.03 – 2026.01",
          subtitle: "2기 부원 및 기획팀; 3기 부회장",
          location: "서울",
          bullets: ["NLP 프로젝트 수행, 동아리 운영 총괄"],
        },
        {
          title: "Sooktat (통계학과 데이터분석 학회)",
          date: "2023.02 – 2024.02",
          subtitle: "숙명여자대학교 5기",
          location: "서울",
          bullets: ["Python 라이브러리를 활용한 머신러닝 스터디 수료"],
        },
      ],
    },
    {
      title: "봉사활동",
      layout: "entries",
      entries: [
        {
          title: "빅데이터혁신공유사업단 Peer-Mentoring",
          date: "2024.11, 2026.09",
          subtitle: "숙명여자대학교",
          location: "서울",
          bullets: ["비전공 학생 대상 Python 및 기초 데이터 분석 멘토링"],
        },
        {
          title: "서울런 멘토단",
          date: "2022.09 – 2024.01",
          subtitle: "서울특별시",
          location: "서울",
          bullets: ["중학생 대상 수학 학습 지도"],
        },
        {
          title: "통계교육 재능기부단 9기",
          date: "2023.05 – 2023.12",
          subtitle: "통계청",
          location: "서울",
          bullets: ["초·중·고등학생 대상 통계 포스터 및 데이터 리터러시 교육"],
        },
      ],
    },
    {
      title: "자격 및 어학",
      layout: "bullets",
      entries: [
        { title: "TOEIC Speaking, Advanced Low — AL (170) (2026.09)" },
        { title: "SQL 개발자(SQLD), 한국데이터산업진흥원 (2024.12)" },
        { title: "데이터분석 준전문가(ADsP), 한국데이터산업진흥원 (2023.11)" },
      ],
    },
  ],
};
