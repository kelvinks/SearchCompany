export type SupportHistory = {
  id: string;
  brn?: string;
  year: string;
  programName: string;
  projectName?: string;  // 지원과제명 (검색 1순위)
  status: "선정" | "완료" | "포기" | "제외";
  selectedAmount: number;
  supportAmount: number;
  notes?: string;
};

export type Company = {
  id: string;
  businessNumber: string;
  companyName: string;
  location: string;
  mainProducts: string;
  supportField: string;
  matchStatus: "EXACT" | "FUZZY" | "NEW";
  matchScore: number;
  histories: SupportHistory[];
  
  // New fields for comparison (from _1/code.html)
  requestedAmount?: number;
  appliedProgramName?: string;   // 신청 지원사업명 (엑셀/수동 입력)
  appliedProjectName?: string;   // 신청 지원과제명 (엑셀/수동 입력)
  dbCompanyName?: string;
  dbBusinessNumber?: string;
  dbLocation?: string;
  dbSupportField?: string;
  dbMainProducts?: string;
  systemNote?: string;

  // Fields for the revised duplicate benefit detection
  isDuplicateSuspect?: boolean;
  duplicateReason?: string;
  overlappingKeywords?: string[];
};

export const mockCompanies: Company[] = [
  {
    id: "1",
    businessNumber: "123-45-67890",
    companyName: "㈜경기테크노밸리",
    location: "경기도 수원시 영통구 광교로 107",
    mainProducts: "인공지능 소프트웨어 개발 및 서비스",
    supportField: "SW 개발",
    matchStatus: "EXACT",
    matchScore: 100,
    requestedAmount: 50000000,
    dbCompanyName: "경기테크노밸리 주식회사",
    dbLocation: "경기도 수원시 영통구 광교로 107 (이의동)",
    dbSupportField: "소프트웨어 개발 및 공급업",
    dbMainProducts: "인공지능 서비스",
    systemNote: "사업자등록번호가 정확히 일치하며 소재지가 매우 유사합니다. 동일 기업의 중복 지원 신청일 확률이 99% 이상입니다.",
    histories: [
      {
        id: "h1",
        year: "2023",
        programName: "2023년 유망 중소기업 지원사업",
        status: "완료",
        selectedAmount: 50000000,
        supportAmount: 50000000,
      },
      {
        id: "h2",
        year: "2024",
        programName: "2024년 글로벌 진출 지원사업",
        status: "포기",
        selectedAmount: 30000000,
        supportAmount: 0,
        notes: "사업 포기",
      },
    ],
  },
  {
    id: "2",
    businessNumber: "234-56-78901",
    companyName: "혁신기술(주)",
    location: "경기도 성남시 분당구 판교로 123",
    mainProducts: "산업용 스마트 로봇 관절 모듈",
    supportField: "제조",
    matchStatus: "FUZZY",
    matchScore: 85,
    requestedAmount: 40000000,
    dbCompanyName: "혁신기술 주식회사",
    dbLocation: "경기도 성남시 분당구 대왕판교로 645",
    dbSupportField: "기계 및 로봇 부품 제조업",
    dbMainProducts: "로봇 부품",
    systemNote: "기업명이 85% 유사하며 소재지가 인근으로 나타납니다. 동일 기업 혹은 계열사의 우회 지원 여부를 검토하십시오.",
    histories: [
      {
        id: "h3",
        year: "2022",
        programName: "2022년 창업도약패키지",
        status: "제외",
        selectedAmount: 100000000,
        supportAmount: 0,
        notes: "타 기관 중복으로 제외 처리됨",
      },
    ],
  },
  {
    id: "3",
    businessNumber: "345-67-89012",
    companyName: "미래소재",
    location: "경기도 안양시 동안구 시민대로 230",
    mainProducts: "친환경 플라스틱 생분해성 필름",
    supportField: "소재/부품",
    matchStatus: "NEW",
    matchScore: 0,
    requestedAmount: 30000000,
    systemNote: "일치하는 사업자등록번호가 없고 기업명에 대해서도 내부 DB 내 유사 매칭 항목이 발견되지 않았습니다. 신규 안전 신청 건입니다.",
    histories: [],
  },
];
