import { Company, SupportHistory } from "@/data/mockData";
import { extractSiGun } from "@/utils/format";

// GBSA Core Support Program Keywords compiled from homepage business fields
const GBSA_KEYWORDS = [
  "전시회", "박람회", "해외전시", "국내전시", "단체관", // 마케팅 및 전시회 지원
  "특허", "지식재산", "출원", "등록", "IP", // 특허 및 기술 보호 지원
  "디자인", "디자인개발", "디자인혁신", "CI", "BI", // 디자인 지원
  "시제품", "금형", "시작품", "목업", "mockup", // 시제품 제작 지원
  "마케팅", "수출", "바우처", "판로", "물류비", "번역", "홍보물", "동영상", // 마케팅 및 수출 지원
  "인증", "규격인증", "해외인증", "안전인증", "성능인증", "ISO", // 규격 인증 지원
  "컨설팅", "멘토링", "자문", "전문가", "지도", "기획", // 경영/기술 컨설팅 지원
  "기술개발", "연구개발", "R&D", "과제", "소부장", "산학협력", "로봇", "수소", // R&D 및 핵심산업 기술 개발
  "창업", "스타트업", "벤처", "엑셀러레이팅", "임차료", "입주", "공간", // 창업 및 인큐베이팅 지원
  "바이오", "의료기기", "임상", "비임상", "헬스케어", "메디컬", "천연물", // 바이오산업 및 보건의료 지원
  "메타버스", "AI", "인공지능", "스마트공장", "ICT", "SW", "소프트웨어", "디지털전환" // 디지털 및 4차산업 지원
];

// Helper to normalize Business Registration Numbers by removing dashes/spaces
export const normalizeBrn = (brn?: string): string => {
  if (!brn) return "";
  return brn.replace(/[^0-9]/g, "");
};

// Levenshtein distance implementation for typo matching
export const getLevenshteinDistance = (a: string, b: string): number => {
  const tmp: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1, // deletion
        tmp[i][j - 1] + 1, // insertion
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1) // substitution
      );
    }
  }
  return tmp[a.length][b.length];
};

// Check if candidate support field and history fields share any GBSA keywords.
// Search priority: 1) projectName (지원과제명), 2) programName (지원사업명), 3) notes (비고)
export const checkProgramOverlap = (
  candidateField: string,
  history: SupportHistory
): { keywords: string[]; matchedField: "projectName" | "programName" | "notes" | null } => {
  const normCandidate = (candidateField || "").toLowerCase().replace(/\s+/g, "");
  if (!normCandidate) return { keywords: [], matchedField: null };

  const searchTargets: { field: "projectName" | "programName" | "notes"; value: string }[] = [
    { field: "projectName", value: history.projectName || "" },
    { field: "programName", value: history.programName || "" },
    { field: "notes",       value: history.notes || "" },
  ];

  for (const target of searchTargets) {
    const normTarget = target.value.toLowerCase().replace(/\s+/g, "");
    if (!normTarget) continue;
    const matched = GBSA_KEYWORDS.filter(keyword => {
      const normKeyword = keyword.toLowerCase();
      return normCandidate.includes(normKeyword) && normTarget.includes(normKeyword);
    });
    if (matched.length > 0) {
      return { keywords: matched, matchedField: target.field };
    }
  }

  return { keywords: [], matchedField: null };
};

export const matchingService = {
  /**
   * Matches a candidate company against the internal company database.
   * NOTE: candidate.location and dbCo.location represent the FULL detailed address. 
   * City/county (소재지) matching is performed dynamically by extracting it via extractSiGun().
   * Priority:
   * 1. Exact match on Business Registration Number
   * 2. Typo match: BRN Levenshtein Distance <= 2 AND (name contains name OR location matches)
   * 3. If no BRN match/typo match, mark as Safe (NEW) and do not check further.
   */
  matchCompany(candidate: Partial<Company>, database: Company[]): Company {
    const candidateBrn = normalizeBrn(candidate.businessNumber);
    const candidateName = candidate.companyName || "";
    const candidateLocation = candidate.location || "";
    const candidateSupportField = candidate.supportField || "";

    let matchedDbCompany: Company | undefined = undefined;
    let matchType: "EXACT" | "FUZZY" | "NONE" = "NONE";
    let matchScore = 0;
    let systemNoteDetail = "";

    // 1. Exact Match by BRN
    if (candidateBrn) {
      const exactMatch = database.find(
        (dbCo) => normalizeBrn(dbCo.businessNumber) === candidateBrn
      );
      if (exactMatch) {
        matchedDbCompany = exactMatch;
        matchType = "EXACT";
        matchScore = 100;
        systemNoteDetail = "사업자등록번호가 정확히 일치하는 기업이 데이터베이스에 존재합니다.";
      }
    }

    // 2. Typo BRN Match (Only if exact match is not found)
    if (matchType === "NONE" && candidateBrn) {
      const normalizedCandidateName = candidateName.replace(/[\s\(\)\[\]\{\}\-\_\,\.\:\'\"]/g, "").toLowerCase();
      const candidateSiGun = extractSiGun(candidateLocation);

      for (const dbCo of database) {
        const dbBrn = normalizeBrn(dbCo.businessNumber);
        if (!dbBrn) continue;

        const distance = getLevenshteinDistance(dbBrn, candidateBrn);
        if (distance <= 2) {
          // Check name similarity (sub-string matching)
          const normalizedDbName = dbCo.companyName.replace(/[\s\(\)\[\]\{\}\-\_\,\.\:\'\"]/g, "").toLowerCase();
          const isNameMatch = normalizedCandidateName && normalizedDbName && 
            (normalizedCandidateName.includes(normalizedDbName) || normalizedDbName.includes(normalizedCandidateName));
          
          // Check location matching (same city or county)
          const dbSiGun = extractSiGun(dbCo.location);
          const isLocationMatch = candidateSiGun && dbSiGun && candidateSiGun === dbSiGun;

          if (isNameMatch || isLocationMatch) {
            matchedDbCompany = dbCo;
            matchType = "FUZZY";
            matchScore = Math.max(50, 90 - distance * 15);
            systemNoteDetail = `사업자등록번호 오타 의심 (입력: ${candidate.businessNumber} ↔ DB: ${dbCo.businessNumber}, 편집거리: ${distance}) 및 ${isNameMatch ? "기업명" : "소재지(시/군)"} 매칭 항목이 발견되었습니다.`;
            break;
          }
        }
      }
    }
    
    // 3. Name-based Match Fallback (For name-only searches)
    if (matchType === "NONE" && candidateName) {
      const normalizedCandidateName = candidateName.replace(/[\s\(\)\[\]\{\}\-\_\,\.\:\'\"]/g, "").toLowerCase();
      
      // Try exact name match first
      const exactNameMatch = database.find(dbCo => {
        const normalizedDbName = dbCo.companyName.replace(/[\s\(\)\[\]\{\}\-\_\,\.\:\'\"]/g, "").toLowerCase();
        return normalizedDbName === normalizedCandidateName;
      });

      if (exactNameMatch) {
        matchedDbCompany = exactNameMatch;
        matchType = "EXACT";
        matchScore = 100;
        systemNoteDetail = "기업명이 정확히 일치하는 기업이 데이터베이스에 존재합니다.";
      } else {
        // Try fuzzy name match
        for (const dbCo of database) {
          const normalizedDbName = dbCo.companyName.replace(/[\s\(\)\[\]\{\}\-\_\,\.\:\'\"]/g, "").toLowerCase();
          const isNameMatch = normalizedCandidateName && normalizedDbName && 
            (normalizedCandidateName.includes(normalizedDbName) || normalizedDbName.includes(normalizedCandidateName));
            
          if (isNameMatch) {
            matchedDbCompany = dbCo;
            matchType = "FUZZY";
            matchScore = 80;
            systemNoteDetail = "기업명이 유사한 기업이 데이터베이스에 존재합니다.";
            break;
          }
        }
      }
    }

    // If match found (Exact or Fuzzy Typo)
    if (matchedDbCompany && matchType !== "NONE") {
      const histories = matchedDbCompany.histories || [];
      // Filter out histories with "포기" or "제외"
      const activeHistories = histories.filter(h => h.status !== "포기" && h.status !== "제외");

      const overlappingHistories: { history: SupportHistory; keywords: string[] }[] = [];
      const allMatchedKeywords = new Set<string>();

      for (const history of activeHistories) {
        const result = checkProgramOverlap(candidateSupportField, history);
        if (result.keywords.length > 0) {
          overlappingHistories.push({ history, keywords: result.keywords });
          result.keywords.forEach(k => allMatchedKeywords.add(k));
        }
      }

      const isDuplicateSuspect = overlappingHistories.length > 0;
      let duplicateReason = "";
      let systemNote = "";

      if (isDuplicateSuspect) {
        const matchedKeywordsStr = Array.from(allMatchedKeywords).join(", ");
        const overlapDetails = overlappingHistories.map(item => {
          const fieldLabel = {
            projectName: "과제명",
            programName: "사업명",
            notes: "비고",
            null: "기타",
          }[String(item.keywords[0] ? "programName" : "notes")] || "기록";
          const displayName = item.history.projectName || item.history.programName;
          return `'${displayName}'(${item.history.year}년, ${item.history.status})`;
        }).join(", ");
        
        duplicateReason = `유사 지원 분야 키워드 [${matchedKeywordsStr}] 중복 감지. 관련 과거 이력: ${overlapDetails}`;
        systemNote = `⚠️ [중복 수혜 의심] ${systemNoteDetail} 과거 수혜 이력 중 유사 사업 키워드(${matchedKeywordsStr})가 포함된 내역이 발견되었습니다. 중복 지원 여부를 신중히 검토하십시오.`;
      } else {
        systemNote = `✅ [확인 필요] ${systemNoteDetail} 등록된 기업이나, 최근 완료/진행중인 과거 이력 중 신청 사업 분야(${candidateSupportField || "미지정"})와 중복되는 유사 키워드는 검출되지 않았습니다.`;
      }

      return {
        id: candidate.id || `c-${Date.now()}`,
        businessNumber: candidate.businessNumber || matchedDbCompany.businessNumber,
        companyName: candidate.companyName || matchedDbCompany.companyName,
        location: candidate.location || matchedDbCompany.location,
        mainProducts: candidate.mainProducts || matchedDbCompany.mainProducts,
        supportField: candidateSupportField || matchedDbCompany.supportField,
        matchStatus: matchType,
        matchScore: matchScore,
        histories: histories,
        requestedAmount: candidate.requestedAmount,
        appliedProgramName: candidate.appliedProgramName,
        appliedProjectName: candidate.appliedProjectName,
        dbCompanyName: matchedDbCompany.companyName,
        dbBusinessNumber: matchedDbCompany.businessNumber,
        dbLocation: matchedDbCompany.location,
        dbSupportField: matchedDbCompany.supportField,
        dbMainProducts: matchedDbCompany.mainProducts,
        systemNote: systemNote,
        isDuplicateSuspect: isDuplicateSuspect,
        duplicateReason: duplicateReason,
        overlappingKeywords: Array.from(allMatchedKeywords),
      };
    }

    // 3. Deemed as a New Company (If no match at all, verify is not required)
    return {
      id: candidate.id || `c-${Date.now()}`,
      businessNumber: candidate.businessNumber || "",
      companyName: candidate.companyName || "",
      location: candidate.location || "",
      mainProducts: candidate.mainProducts || "",
      supportField: candidateSupportField || "",
      matchStatus: "NEW",
      matchScore: 0,
      histories: [],
      requestedAmount: candidate.requestedAmount,
      appliedProgramName: candidate.appliedProgramName,
      appliedProjectName: candidate.appliedProjectName,
      systemNote: "일치하거나 유사한 사업자등록번호가 내부 DB에 존재하지 않는 신규 요청 건입니다. 중복 검증이 필요 없는 안전한 신청사입니다.",
      isDuplicateSuspect: false,
    };
  },

  matchCompanies(candidates: Partial<Company>[], database: Company[]): Company[] {
    return candidates.map((c) => this.matchCompany(c, database));
  }
};
