"use client";

import { useState, useEffect } from "react";
import { companyService, SearchLog } from "@/services/companyService";
import BusinessNumber from "@/components/BusinessNumber";
import { Company, SupportHistory } from "@/data/mockData";
import { matchingService } from "@/services/matchingService";
import HistoryModal from "@/components/modal/HistoryModal";

const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffMins < 1) return "방금 전";
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
};

interface ParsedDesc {
  desc?: string;
  sourceFile?: string;
  isBulk?: boolean;
  results?: Company[];
}

const parseDescription = (raw?: string): ParsedDesc => {
  if (!raw) return {};
  try { return JSON.parse(raw) as ParsedDesc; } catch { return { desc: raw }; }
};

// Extract batch companies from a BATCH log using already-loaded fields
// (avoids extra network calls per log)
const extractBatchCompanies = (log: SearchLog): Company[] => {
  // 1) Try additionalData.results (populated when Supabase additional_data column exists)
  if (log.additionalData && (log.additionalData as any).results) {
    const res = (log.additionalData as any).results;
    if (Array.isArray(res) && res.length > 0) return res;
  }
  // 2) Try description JSON .results
  const parsed = parseDescription(log.description);
  if (parsed.results && Array.isArray(parsed.results) && parsed.results.length > 0) {
    return parsed.results;
  }
  return [];
};

interface DisplayItem {
  id: string;
  title: string;
  brn?: string;
  orgName?: string;
  docNum?: string;
  createdAt: string;
  riskLevel?: string;
  desc?: string;
  sourceFile?: string;
  isBulk: boolean;
  batchCompany?: Company;
  manualCompany?: Company;
  appliedProgramName?: string;
  appliedProjectName?: string;
}

export default function HistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [displayItems, setDisplayItems] = useState<DisplayItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [batchFallbackPending, setBatchFallbackPending] = useState<SearchLog[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const [logs, dbCompanies] = await Promise.all([
        companyService.getSearchLogs(),
        companyService.getCompanies(),
      ]);
      setCompanies(dbCompanies);

      const items: DisplayItem[] = [];
      const needFallback: SearchLog[] = [];

      for (const log of logs) {
        if (log.type === "BATCH") {
          // Try to expand inline (no extra network call)
          const results = extractBatchCompanies(log);
          if (results.length > 0) {
            const parsed = parseDescription(log.description);
            results.forEach((company, idx) => {
              const isDuplicate =
                (company as any).matchStatus === "EXACT" ||
                (company as any).matchStatus === "FUZZY";
              items.push({
                id: `${log.id}_${idx}`,
                title: company.companyName || company.businessNumber || "(이름 없음)",
                brn: company.businessNumber || undefined,
                orgName: log.orgName,
                docNum: log.docNum,
                createdAt: log.createdAt,
                riskLevel: isDuplicate ? "High Risk" : "Safe",
                desc: parsed.desc || undefined,
                sourceFile: log.title,
                isBulk: true,
                batchCompany: {
                  ...company,
                  appliedProgramName: company.appliedProgramName || (company as any).appliedProgramName,
                  appliedProjectName: company.appliedProjectName || (company as any).appliedProjectName,
                },
                appliedProgramName: company.appliedProgramName || (company as any).appliedProgramName,
                appliedProjectName: company.appliedProjectName || (company as any).appliedProjectName,
              });
            });
          } else {
            // No inline data – fall back to getBatchResults (separate query / localStorage)
            needFallback.push(log);
          }
        } else {
          const parsed = parseDescription(log.description);
          
          // Check if there is an audited single match result in additional_data
          let manualCo: Company | undefined = undefined;
          if (log.additionalData && (log.additionalData as any).matchedCompany) {
            manualCo = (log.additionalData as any).matchedCompany as Company;
          }

          items.push({
            id: log.id,
            title: log.title,
            brn: log.brn || (manualCo ? (manualCo.businessNumber || (manualCo as any).business_number || (manualCo as any).brn) : undefined),
            orgName: log.orgName,
            docNum: log.docNum,
            createdAt: log.createdAt,
            riskLevel: log.riskLevel,
            desc: parsed.desc,
            sourceFile: parsed.sourceFile,
            isBulk: !!parsed.isBulk,
            manualCompany: manualCo,
            appliedProgramName: (parsed as any).appliedProgramName,
            appliedProjectName: (parsed as any).appliedProjectName,
          });
        }
      }

      setDisplayItems(items);
      setBatchFallbackPending(needFallback);
      setIsLoading(false);
    };
    loadData();
  }, []);

  // Fallback: fetch any BATCH logs that had no inline data (localStorage or separate Supabase query)
  useEffect(() => {
    if (batchFallbackPending.length === 0) return;
    const resolveFallbacks = async () => {
      const extra: DisplayItem[] = [];
      for (const log of batchFallbackPending) {
        const results = await companyService.getBatchResults(log.id);
        if (results && results.length > 0) {
          const parsed = parseDescription(log.description);
          results.forEach((company, idx) => {
            const isDuplicate =
              (company as any).matchStatus === "EXACT" ||
              (company as any).matchStatus === "FUZZY";
            extra.push({
              id: `${log.id}_${idx}`,
              title: company.companyName || company.businessNumber || "(이름 없음)",
              brn: company.businessNumber || undefined,
              orgName: log.orgName,
              docNum: log.docNum,
              createdAt: log.createdAt,
              riskLevel: isDuplicate ? "High Risk" : "Safe",
              desc: parsed.desc || undefined,
              sourceFile: log.title,
              isBulk: true,
              batchCompany: {
                ...company,
                appliedProgramName: company.appliedProgramName || (company as any).appliedProgramName,
                appliedProjectName: company.appliedProjectName || (company as any).appliedProjectName,
              },
              appliedProgramName: company.appliedProgramName || (company as any).appliedProgramName,
              appliedProjectName: company.appliedProjectName || (company as any).appliedProjectName,
            });
          });
        }
        // If getBatchResults also returns nothing, we silently skip (no data to show)
      }
      if (extra.length > 0) {
        setDisplayItems((prev) => [...prev, ...extra]);
      }
    };
    resolveFallbacks();
  }, [batchFallbackPending]);

  const handleViewDetails = (item: DisplayItem) => {
    // 1. If we have a serialized bulk result, use it directly (1st priority)
    if (item.batchCompany) {
      setSelectedCompany(item.batchCompany);
      return;
    }

    // 2. If we have a serialized manual search result, use it directly (1st priority)
    if (item.manualCompany) {
      setSelectedCompany(item.manualCompany);
      return;
    }

    // 3. Fallback: Reconstruct matching against current DB state
    const isBrn = item.brn || (/^[0-9\-\s]+$/.test(item.title) ? item.title : "");
    const candidate: Partial<Company> = isBrn
      ? { 
          businessNumber: isBrn,
          appliedProgramName: item.appliedProgramName,
          appliedProjectName: item.appliedProjectName
        }
      : { 
          companyName: item.title,
          appliedProgramName: item.appliedProgramName,
          appliedProjectName: item.appliedProjectName
        };
    setSelectedCompany(matchingService.matchCompany(candidate, companies));
  };

  const handleUpdateHistory = async (
    companyId: string,
    historyId: string,
    updates: Partial<SupportHistory>
  ) => {
    await companyService.updateSupportHistory(companyId, historyId, updates);
    const data = await companyService.getCompanies();
    setCompanies(data);
    if (selectedCompany) {
      const candidate: Partial<Company> = selectedCompany.businessNumber
        ? { businessNumber: selectedCompany.businessNumber }
        : { companyName: selectedCompany.companyName };
      setSelectedCompany(matchingService.matchCompany(candidate, data));
    }
  };

  const filteredItems = displayItems.filter((item) => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    return (
      item.title.toLowerCase().includes(term) ||
      (item.orgName && item.orgName.toLowerCase().includes(term)) ||
      (item.docNum && item.docNum.toLowerCase().includes(term)) ||
      (item.desc && item.desc.toLowerCase().includes(term)) ||
      (item.brn && item.brn.toLowerCase().includes(term)) ||
      (item.sourceFile && item.sourceFile.toLowerCase().includes(term))
    );
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex justify-end items-center">
        <span className="text-sm text-gray-400 font-medium">총 <span className="font-mono">{filteredItems.length}</span>건</span>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center">
        <div className="relative flex-1 w-full">
          <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="기업명, 사업자번호, 요청기관, 문서번호, 파일명 등 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm"
          />
        </div>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 text-sm gap-3">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          기록을 불러오는 중...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.length > 0 ? filteredItems.map((item) => {
            const isHighRisk = item.riskLevel === "High Risk";
            return (
              <div
                key={item.id}
                className="bg-white/90 backdrop-blur-sm border border-gray-100 rounded-2xl p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
                onClick={() => handleViewDetails(item)}
              >
                <div className="flex justify-between items-start">
                  <div className="p-2.5 bg-blue-50 rounded-xl text-[var(--color-gbsa-primary)] group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {item.isBulk && (
                      <span className="font-semibold text-xs px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700">대량</span>
                    )}
                    <span className={`font-semibold text-xs px-3 py-1.5 rounded-full ${
                      item.riskLevel === "High Risk" ? "bg-red-100 text-red-700" :
                      item.riskLevel === "Safe" ? "bg-emerald-100 text-emerald-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {item.riskLevel === "High Risk" ? "중복의심" :
                       item.riskLevel === "Safe" ? "안전" : "단일검색"}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className={`text-lg font-bold text-gray-900 truncate ${/^[0-9\-\s]+$/.test(item.title) ? 'font-mono' : ''}`}>
                    {/^[0-9\-\s]+$/.test(item.title) ? <BusinessNumber value={item.title} /> : item.title}
                  </h3>
                  {item.brn && (
                    <p className="text-xs text-gray-400 font-mono mt-0.5"><BusinessNumber value={item.brn} /></p>
                  )}
                  <p className="text-sm text-gray-400 mt-1">조회 일시: {formatTime(item.createdAt)}</p>
                </div>

                <div className="flex flex-col gap-1.5 text-sm text-gray-600">
                  {item.orgName && (
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="truncate">요청기관: {item.orgName}</span>
                    </div>
                  )}
                  {item.docNum && (
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <span>문서번호: {item.docNum}</span>
                    </div>
                  )}
                  {item.desc && (
                    <p className="text-xs text-gray-500 italic bg-gray-50 px-2 py-1.5 rounded-lg line-clamp-1 mt-1">&ldquo;{item.desc}&rdquo;</p>
                  )}
                  {item.isBulk && item.sourceFile && (
                    <p className="text-[10px] text-indigo-500 truncate">📎 {item.sourceFile}</p>
                  )}
                </div>

                <div className="mt-auto pt-4 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleViewDetails(item); }}
                    className="text-[var(--color-gbsa-primary)] hover:underline flex items-center gap-1 text-sm font-medium"
                  >
                    상세 보기
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          }) : (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 py-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">
              검색 결과가 없습니다.
            </div>
          )}
        </div>
      )}

      {selectedCompany && (
        <HistoryModal
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
          onUpdateHistory={handleUpdateHistory}
        />
      )}
    </div>
  );
}
