"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Company } from "@/data/mockData";
import { companyService } from "@/services/companyService";
import BusinessNumber from "@/components/BusinessNumber";
import LoadingOverlay from "@/components/LoadingOverlay";

function formatDetailFields(c: Company): string {
  const parts: string[] = [];

  const matchLabel =
    c.matchStatus === "EXACT" ? "정확매칭"
    : c.matchStatus === "FUZZY" ? "유사매칭"
    : c.matchStatus === "NEW" ? "신규"
    : c.matchStatus;

  if (c.location) parts.push(c.location);
  if (c.supportField) parts.push(c.supportField);
  if (c.mainProducts) parts.push(c.mainProducts);
  if (matchLabel) parts.push(matchLabel);
  if (c.appliedProgramName) parts.push(`신청:${c.appliedProgramName}`);
  if (c.appliedProjectName) parts.push(`과제:${c.appliedProjectName}`);
  if (c.requestedAmount) parts.push(`${c.requestedAmount.toLocaleString()}원`);
  if (c.isDuplicateSuspect) parts.push("중복의심");

  return parts.join(" | ") || "-";
}

const PAGE_SIZE = 20;

export default function RequestCompaniesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<{ createdAt: string; id: string } | undefined>();
  const [totalCount, setTotalCount] = useState(0);
  const [searchMode, setSearchMode] = useState(false);
  const [searchTotal, setSearchTotal] = useState(0);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const searchCursorRef = useRef<{ createdAt: string; id: string } | undefined>(undefined);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const removed = await companyService.cleanupInquiryCompanies();
        if (removed > 0) console.log(`[Cleanup] ${removed} empty-BRN entries removed`);
        const result = await companyService.getInquiryCompanies(PAGE_SIZE);
        setCompanies(result.companies);
        setNextCursor(result.nextCursor);
        setTotalCount(result.total);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    setSearchTerm("");
    setSearchMode(false);
    setSearchTotal(0);
    searchCursorRef.current = undefined;
    try {
      const result = await companyService.getInquiryCompanies(PAGE_SIZE);
      setCompanies(result.companies);
      setNextCursor(result.nextCursor);
      setTotalCount(result.total);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await companyService.getInquiryCompanies(PAGE_SIZE, { cursor: nextCursor });
      setCompanies((prev) => [...prev, ...result.companies]);
      setNextCursor(result.nextCursor);
      setTotalCount(result.total);
    } finally {
      setLoadingMore(false);
    }
  };

  const executeSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setSearchMode(false);
      setSearchTotal(0);
      searchCursorRef.current = undefined;
      setLoading(true);
      try {
        const result = await companyService.getInquiryCompanies(PAGE_SIZE);
        setCompanies(result.companies);
        setNextCursor(result.nextCursor);
        setTotalCount(result.total);
      } finally {
        setLoading(false);
      }
      return;
    }

    setSearchMode(true);
    setLoading(true);
    searchCursorRef.current = undefined;
    try {
      const result = await companyService.getInquiryCompanies(PAGE_SIZE, { searchTerm: term });
      setCompanies(result.companies);
      searchCursorRef.current = result.nextCursor;
      setSearchTotal(result.total);
      setNextCursor(undefined);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      executeSearch(value);
    }, 300);
  };

  const handleSearchLoadMore = async () => {
    if (!searchCursorRef.current || loadingMore || !searchTerm.trim()) return;
    setLoadingMore(true);
    try {
      const result = await companyService.getInquiryCompanies(PAGE_SIZE, {
        cursor: searchCursorRef.current,
        searchTerm,
      });
      setCompanies((prev) => [...prev, ...result.companies]);
      searchCursorRef.current = result.nextCursor;
      setSearchTotal(result.total);
    } finally {
      setLoadingMore(false);
    }
  };

  const displayTotal = searchMode ? searchTotal : totalCount;
  const hasMore = searchMode ? !!searchCursorRef.current : !!nextCursor;

  return (
    <div suppressHydrationWarning={true} className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">조회요청기업</h2>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg shadow-sm hover:bg-gray-50 font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          새로고침
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="relative w-full">
          <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="기업명 또는 사업자등록번호 검색..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 h-11 rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="text-lg font-semibold text-gray-800">
            조회요청 기업 목록
            <span className="text-sm font-normal text-gray-500 ml-2">
              {searchMode && <span className="text-blue-500">검색 결과 </span>}
              총 <span className="font-mono">{displayTotal}</span>건
              {companies.length < displayTotal && (
                <span className="text-gray-400 ml-1">(이 중 {companies.length}건 표시)</span>
              )}
            </span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm table-fixed">
            <colgroup>
              <col className="w-16" />
              <col className="w-56" />
              <col className="w-44" />
              <col />
            </colgroup>
            <thead className="bg-[#F1F5F9] text-gray-600 border-b border-gray-200">
              <tr>
                <th className="py-4 px-6 font-medium text-center w-16 whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                    순번
                  </div>
                </th>
                <th className="py-4 px-6 font-medium text-left w-56 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    기업명
                  </div>
                </th>
                <th className="py-4 px-6 font-medium text-center w-44 whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    사업자등록번호
                  </div>
                </th>
                <th className="py-4 px-6 font-medium text-left whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    상세정보
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {companies.length > 0 ? (
                companies.map((company, idx) => (
                  <tr key={`${company.businessNumber}-${idx}`} className="hover:bg-[#EBF8FF] transition-colors group">
                    <td className="py-4 px-6 text-center text-gray-400 font-mono text-xs align-top">{companies.length - idx}</td>
                    <td className="py-4 px-6 font-medium text-gray-900 align-top truncate">{company.companyName}</td>
                    <td className="py-4 px-6 text-center text-gray-600 font-mono align-top">
                      <BusinessNumber value={company.businessNumber} />
                    </td>
                    <td className="py-4 px-6 text-gray-500 text-xs leading-relaxed whitespace-normal break-words align-top">{formatDetailFields(company)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-500">
                    {loading ? "데이터를 불러오는 중..." : "조회된 기업이 없습니다."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {hasMore && (
          <div className="px-6 py-4 border-t border-gray-100 flex justify-center">
            <button
              onClick={searchMode ? handleSearchLoadMore : handleLoadMore}
              disabled={loadingMore}
              className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl shadow-sm hover:bg-gray-50 font-medium transition-colors text-sm disabled:opacity-50"
            >
              {loadingMore ? "로딩 중..." : `더보기 (${companies.length} / ${displayTotal})`}
            </button>
          </div>
        )}
      </div>

      <LoadingOverlay show={loading} message="불러오는 중..." />
    </div>
  );
}
