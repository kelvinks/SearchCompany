import { Company } from "@/data/mockData";
import Fuse from "fuse.js";

// Helper to normalize Business Registration Numbers by removing dashes/spaces
export const normalizeBrn = (brn?: string): string => {
  if (!brn) return "";
  return brn.replace(/[^0-9]/g, "");
};

export const matchingService = {
  /**
   * Matches a candidate company against the internal company database.
   * Priority:
   * 1. Exact match on Business Registration Number
   * 2. Fuzzy match on Company Name (via fuse.js)
   * 3. Deemed as a new candidate
   */
  matchCompany(candidate: Partial<Company>, database: Company[]): Company {
    const candidateBrn = normalizeBrn(candidate.businessNumber);

    // 1. Exact Match by BRN
    if (candidateBrn) {
      const exactMatch = database.find(
        (dbCo) => normalizeBrn(dbCo.businessNumber) === candidateBrn
      );
      if (exactMatch) {
        return {
          id: candidate.id || `c-${Date.now()}`,
          businessNumber: candidate.businessNumber || exactMatch.businessNumber,
          companyName: candidate.companyName || "",
          location: candidate.location || "",
          mainProducts: candidate.mainProducts || "",
          supportField: candidate.supportField || "",
          matchStatus: "EXACT",
          matchScore: 100,
          histories: exactMatch.histories,
          requestedAmount: candidate.requestedAmount,
          dbCompanyName: exactMatch.companyName,
          dbLocation: exactMatch.location,
          dbSupportField: exactMatch.supportField,
          dbMainProducts: exactMatch.mainProducts,
          systemNote: "사업자등록번호가 정확히 일치하며, 기존 등록 기업의 중복 지원 신청일 확률이 99% 이상입니다. 과거 지원 이력을 검토하십시오.",
        };
      }
    }

    // 2. Fuzzy Match on Company Name
    if (candidate.companyName) {
      const fuse = new Fuse(database, {
        keys: ["companyName"],
        includeScore: true,
        threshold: 0.5, // 0.0 is perfect match, 1.0 matches anything. 0.5 allows decent similarity.
      });

      const results = fuse.search(candidate.companyName);
      if (results.length > 0 && results[0].score !== undefined) {
        const bestMatch = results[0].item;
        const score = results[0].score;
        // Convert fuse score (0 = exact match, 1 = no match) to similarity percentage (0% to 100%)
        const similarity = Math.round((1 - score) * 100);

        if (similarity >= 50) {


          return {
            id: candidate.id || `c-${Date.now()}`,
            businessNumber: candidate.businessNumber || "",
            companyName: candidate.companyName || "",
            location: candidate.location || "",
            mainProducts: candidate.mainProducts || "",
            supportField: candidate.supportField || "",
            matchStatus: "FUZZY",
            matchScore: similarity,
            histories: bestMatch.histories,
            requestedAmount: candidate.requestedAmount,
            dbCompanyName: bestMatch.companyName,
            dbLocation: bestMatch.location,
            dbSupportField: bestMatch.supportField,
            dbMainProducts: bestMatch.mainProducts,
            systemNote: `기업명이 ${similarity}% 유사하며, 소재지가 인근일 수 있으므로 동일 기업 혹은 계열사의 우회 지원 여부를 검토하십시오.`,
          };
        }
      }
    }

    // 3. Deemed as a New Company
    return {
      id: candidate.id || `c-${Date.now()}`,
      businessNumber: candidate.businessNumber || "",
      companyName: candidate.companyName || "",
      location: candidate.location || "",
      mainProducts: candidate.mainProducts || "",
      supportField: candidate.supportField || "",
      matchStatus: "NEW",
      matchScore: 0,
      histories: [],
      requestedAmount: candidate.requestedAmount,
      systemNote: "일치하는 사업자등록번호가 없고 기업명에 대해서도 내부 DB 내 유사 매칭 항목이 발견되지 않았습니다. 신규 안전 신청 건입니다.",
    };
  },

  matchCompanies(candidates: Partial<Company>[], database: Company[]): Company[] {
    return candidates.map((c) => this.matchCompany(c, database));
  }
};
