"use client";

import { useState, useEffect } from "react";
import { companyService } from "@/services/companyService";
import { Company, SupportHistory } from "@/data/mockData";
import HistoryModal from "@/components/modal/HistoryModal";
import SearchResultModal from "@/components/modal/SearchResultModal";
import BusinessNumber from "@/components/BusinessNumber";
import LoadingOverlay from "@/components/LoadingOverlay";
import { extractSiGun } from "@/utils/format";

export default function VerificationResultsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  // Search result popup state
  const [searchPopup, setSearchPopup] = useState<{
    type: "SINGLE" | "BATCH";
    results?: Company[];
    result?: Company;
    title?: string;
    query?: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Check for search results from 통합검색 page
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("gbsa_search_results");
      if (stored) {
        try {
          const data = JSON.parse(stored);
          sessionStorage.removeItem("gbsa_search_results");
          setSearchPopup(data);
        } catch {
          // ignore parse errors
        }
      }
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await companyService.getCompanies();
      setCompanies(data);
    } catch (error) {
      console.error("Error loading companies:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateHistory = async (companyId: string, historyId: string, updates: Partial<SupportHistory>) => {
    setSaving(true);
    try {
      const updatedCo = await companyService.updateSupportHistory(companyId, historyId, updates);
      setCompanies((prev) => prev.map((c) => (c.id === companyId ? { ...c, ...updatedCo } : c)));
      if (selectedCompany && selectedCompany.id === companyId) {
        setSelectedCompany((prev) => (prev ? { ...prev, ...updatedCo } : null));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDuplicate = async (companyId: string) => {
    setSaving(true);
    try {
      const updatedCo = await companyService.updateCompany(companyId, { matchStatus: "EXACT", matchScore: 100 });
      setCompanies((prev) => prev.map((c) => (c.id === companyId ? { ...c, ...updatedCo } : c)));
      if (selectedCompany && selectedCompany.id === companyId) {
        setSelectedCompany((prev) => (prev ? { ...prev, ...updatedCo } : null));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleFalseAlarm = async (companyId: string) => {
    setSaving(true);
    try {
      const updatedCo = await companyService.updateCompany(companyId, { matchStatus: "NEW", matchScore: 0 });
      setCompanies((prev) => prev.map((c) => (c.id === companyId ? { ...c, ...updatedCo } : c)));
      if (selectedCompany && selectedCompany.id === companyId) {
        setSelectedCompany((prev) => (prev ? { ...prev, ...updatedCo } : null));
      }
    } finally {
      setSaving(false);
    }
  };

  const getMatchStatusBadge = (company: Company) => {
    let badgeClass = "";
    let badgeText = "";
    
    if (company.matchStatus === "EXACT") {
      if (company.isDuplicateSuspect) {
        badgeClass = "bg-[var(--color-status-red)] text-white";
        badgeText = "중복의심 (일치)";
      } else {
        badgeClass = "bg-blue-600 text-white";
        badgeText = "일치";
      }
    } else if (company.matchStatus === "FUZZY") {
      if (company.isDuplicateSuspect) {
        badgeClass = "bg-[var(--color-status-orange)] text-white";
        badgeText = `중복의심 (${company.matchScore}%)`;
      } else {
        badgeClass = "bg-yellow-500 text-white";
        badgeText = `유사 (${company.matchScore}%)`;
      }
    } else if (company.matchStatus === "NEW") {
      badgeClass = "bg-[var(--color-status-green)] text-white";
      badgeText = "신규";
    } else {
      badgeClass = "bg-gray-400 text-white";
      badgeText = company.matchStatus;
    }

    return (
      <div className="flex flex-col sm:flex-row gap-1.5 sm:items-center">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${badgeClass}`}>
          {badgeText}
        </span>
        {company.matchStatus === "FUZZY" && company.matchScore && (
          <span className="font-mono text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 font-semibold">
            {company.matchScore}%
          </span>
        )}
      </div>
    );
  };

  const getValidTotal = (company: Company) => {
    if (!company.histories || company.histories.length === 0) return 0;
    return company.histories
      .filter(h => h.status !== "포기" && h.status !== "제외")
      .reduce((sum, h) => sum + h.supportAmount, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400 flex items-center gap-3">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          로딩 중...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 shrink-0 rounded-full bg-red-100 flex items-center justify-center text-red-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-red-600 truncate">중복 의심</p>
            <p className="text-lg font-bold text-red-700 mt-0.5">{companies.filter(c => c.isDuplicateSuspect).length}<span className="text-sm font-normal text-gray-500 ml-0.5">건</span></p>
          </div>
        </div>
        
        <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 shrink-0 rounded-full bg-green-100 flex items-center justify-center text-green-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500 font-medium truncate">신규 요청</p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">{companies.filter(c => c.matchStatus === "NEW").length}<span className="text-sm font-normal text-gray-500 ml-0.5">건</span></p>
          </div>
        </div>
        
        <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-[var(--color-gbsa-primary)]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500 font-medium truncate">총 누적 지원</p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">{companies.reduce((sum, c) => sum + (c.histories?.length || 0), 0).toLocaleString()}<span className="text-sm font-normal text-gray-500 ml-0.5">건</span></p>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="text-lg font-semibold text-gray-800">최근 검증 결과</h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">총 {companies.length}건</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F1F5F9] text-gray-600">
              <tr>
                <th className="py-4 px-6 font-medium text-center w-28">
                  <div className="flex items-center justify-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                    번호
                  </div>
                </th>
                <th className="py-4 px-6 font-medium text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    구분
                  </div>
                </th>
                <th className="py-4 px-6 font-medium text-left">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    기업명
                  </div>
                </th>
                <th className="py-4 px-6 font-medium text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    사업자등록번호
                  </div>
                </th>
                <th className="py-4 px-6 font-medium text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    소재지
                  </div>
                </th>
                <th className="py-4 px-6 font-medium text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                    지원분야
                  </div>
                </th>
                <th className="py-4 px-6 font-medium text-left">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    지원과제명
                  </div>
                </th>
                <th className="py-4 px-6 font-medium text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    지원금 총합
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {companies.map((company, index) => {
                const validTotal = getValidTotal(company);
                const lastHist = company.histories && company.histories.length > 0
                  ? company.histories[company.histories.length - 1]
                  : null;
                return (
                  <tr 
                    key={company.id} 
                    className="hover:bg-gray-50 transition-colors group cursor-pointer"
                    onClick={() => setSelectedCompany(company)}
                  >
                    <td className="py-4 px-6 text-center font-mono text-gray-400 text-xs">{companies.length - index}</td>
                    <td className="py-4 px-6 text-center">{getMatchStatusBadge(company)}</td>
                    <td className="py-4 px-6 text-left font-medium text-gray-800">{company.companyName}</td>
                    <td className="py-4 px-6 text-center font-mono text-gray-600">
                      <BusinessNumber value={company.businessNumber} />
                    </td>
                    <td className="py-4 px-6 text-center text-gray-500">{extractSiGun(company.location)}</td>
                    <td className="py-4 px-6 text-center text-gray-500">{company.supportField}</td>
                    <td className="py-4 px-6 text-left text-gray-500">
                      {lastHist ? (
                        <div>
                          <span className="font-semibold text-gray-800">{lastHist.year} {lastHist.programName}</span>
                          {lastHist.projectName && <span className="text-gray-500"> ({lastHist.projectName})</span>}
                          {lastHist.notes && <div className="text-[11px] text-orange-500">비고: {lastHist.notes}</div>}
                        </div>
                      ) : "-"}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {validTotal > 0 ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--color-gbsa-primary)] text-white text-sm font-bold">
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
      </div>

      {/* History Modal */}
      {selectedCompany && (
        <HistoryModal 
          company={selectedCompany} 
          onClose={() => setSelectedCompany(null)} 
          onUpdateHistory={handleUpdateHistory}
          onConfirmDuplicate={handleConfirmDuplicate}
          onFalseAlarm={handleFalseAlarm}
        />
      )}

      {/* Search Result Popup */}
      {searchPopup && (
        <SearchResultModal
          type={searchPopup.type}
          results={searchPopup.results}
          result={searchPopup.result}
          title={searchPopup.title}
          query={searchPopup.query}
          onClose={() => setSearchPopup(null)}
        />
      )}
      <LoadingOverlay show={saving} message="저장 중..." />
    </div>
  );
}
