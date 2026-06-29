"use client";

import { useEffect } from "react";
import { Company } from "@/data/mockData";
import BusinessNumber from "@/components/BusinessNumber";
import { extractSiGun } from "@/utils/format";

interface SearchResultModalProps {
  type: "SINGLE" | "BATCH";
  results?: Company[];
  result?: Company;
  title?: string;
  query?: string;
  onClose: () => void;
}

export default function SearchResultModal({
  type,
  results,
  result,
  title,
  query,
  onClose,
}: SearchResultModalProps) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const getMatchStatusBadge = (company: Company) => {
    let badgeClass = "";
    let badgeText = "";

    if (company.matchStatus === "EXACT") {
      badgeClass = "bg-blue-600 text-white";
      badgeText = "일치";
    } else if (company.matchStatus === "FUZZY") {
      badgeClass = "bg-yellow-500 text-white";
      badgeText = `유사 (${company.matchScore}%)`;
    } else {
      badgeClass = "bg-green-500 text-white";
      badgeText = "신규";
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${badgeClass}`}>
        {badgeText}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl text-[var(--color-gbsa-primary)]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                {type === "SINGLE" ? "단일 검색 결과" : "대량 검색 결과"}
              </h2>
              <p className="text-xs text-gray-400">
                {type === "SINGLE"
                  ? `"${query || result?.companyName || ""}" 검색 결과`
                  : `${title || ""} - ${results?.length || 0}개 기업`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {type === "SINGLE" && result ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xl font-bold text-gray-900">{result.companyName}</span>
                {getMatchStatusBadge(result)}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 font-semibold mb-1">사업자등록번호</p>
                  <p className="font-mono font-bold"><BusinessNumber value={result.businessNumber} /></p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 font-semibold mb-1">소재지</p>
                  <p className="font-medium">{result.location || "-"}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 font-semibold mb-1">지원분야</p>
                  <p className="font-medium">{result.supportField || "-"}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 font-semibold mb-1">매칭도</p>
                  <p className="font-bold">
                    {result.matchStatus === "EXACT" ? "100%" : result.matchStatus === "FUZZY" ? `${result.matchScore}%` : "-"}
                  </p>
                </div>
              </div>
              {result.histories && result.histories.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-bold text-gray-700 mb-2">과거 지원 이력</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 text-gray-600">
                        <tr>
                          <th className="py-2 px-3 text-left font-semibold">년도</th>
                          <th className="py-2 px-3 text-left font-semibold">지원사업명</th>
                          <th className="py-2 px-3 text-left font-semibold">상태</th>
                          <th className="py-2 px-3 text-right font-semibold">지원금액</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {result.histories.map((h) => (
                          <tr key={h.id} className="hover:bg-gray-50">
                            <td className="py-2 px-3 font-mono">{h.year}</td>
                            <td className="py-2 px-3">
                              {h.programName}{h.projectName ? ` (${h.projectName})` : ""}
                            </td>
                            <td className="py-2 px-3">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                h.status === "완료" ? "bg-green-100 text-green-700" :
                                h.status === "선정" ? "bg-blue-100 text-blue-700" :
                                "bg-gray-100 text-gray-700"
                              }`}>
                                {h.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono">{h.supportAmount.toLocaleString()}원</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : type === "BATCH" && results && results.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F1F5F9] text-gray-600">
                  <tr>
                    <th className="py-3 px-4 font-semibold text-center">상태</th>
                    <th className="py-3 px-4 font-semibold text-left">기업명</th>
                    <th className="py-3 px-4 font-semibold text-left">사업자등록번호</th>
                    <th className="py-3 px-4 font-semibold text-left">지원사업명</th>
                    <th className="py-3 px-4 font-semibold text-center">소재지</th>
                    <th className="py-3 px-4 font-semibold text-right">누적지원금액</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {results.map((company, idx) => {
                    const validTotal = company.histories
                      ? company.histories
                          .filter((h) => h.status !== "포기" && h.status !== "제외")
                          .reduce((sum, h) => sum + h.supportAmount, 0)
                      : 0;
                    return (
                      <tr key={company.id || idx} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-center">{getMatchStatusBadge(company)}</td>
                        <td className="py-3 px-4 font-medium text-gray-800">{company.companyName}</td>
                        <td className="py-3 px-4 font-mono text-gray-600">
                          <BusinessNumber value={company.businessNumber} />
                        </td>
                        <td className="py-3 px-4 text-gray-500">{company.appliedProgramName || "-"}</td>
                        <td className="py-3 px-4 text-center text-gray-500">{extractSiGun(company.location)}</td>
                        <td className="py-3 px-4 text-right">
                          {validTotal > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[var(--color-gbsa-primary)] text-white text-xs font-bold">
                              <span className="font-mono">{validTotal.toLocaleString()}</span><span className="font-sans ml-0.5">원</span>
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              검색 결과가 없습니다.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
