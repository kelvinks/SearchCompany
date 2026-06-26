"use client";

import { useState, useEffect } from "react";
import { companyService, SearchLog } from "@/services/companyService";
import { formatBusinessNumber } from "@/utils/format";

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

export default function HistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [historyLogs, setHistoryLogs] = useState<SearchLog[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const logs = await companyService.getSearchLogs();
      setHistoryLogs(logs);
    };
    loadData();
  }, []);

  const filteredHistory = historyLogs.filter((item) => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    
    return (
      item.title.toLowerCase().includes(term) ||
      (item.orgName && item.orgName.toLowerCase().includes(term)) ||
      (item.docNum && item.docNum.toLowerCase().includes(term)) ||
      (item.description && item.description.toLowerCase().includes(term)) ||
      (item.brn && item.brn.toLowerCase().includes(term))
    );
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-gbsa-primary)]">검색 기록</h1>
          <p className="text-gray-500 mt-2">최근 단일 조회 및 엑셀 대량 조회를 수행했던 내역을 확인합니다.</p>
        </div>
        <button className="text-sm font-semibold text-[var(--color-gbsa-primary)] hover:underline">
          모두 보기
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center">
        <div className="relative flex-1 w-full">
          <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder="요청기관, 문서번호 또는 요청내용 등 검색..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm"
          />
        </div>
      </div>

      {/* History Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {filteredHistory.length > 0 ? filteredHistory.map((item) => (
          item.type === "BATCH" ? (
            <div key={item.id} className="bg-white/90 backdrop-blur-sm border border-gray-100 rounded-2xl p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <div className="p-2.5 bg-blue-50 rounded-xl text-[var(--color-gbsa-primary)] group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className={`font-semibold text-xs px-3 py-1.5 rounded-full ${item.riskLevel === "High Risk" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                  {item.riskLevel}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 truncate">{item.title}</h3>
                <p className="text-sm text-gray-500 mt-1">조회 일시: {formatTime(item.createdAt)}</p>
                <div className="mt-4 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    <span className="truncate">요청기관: {item.orgName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                    <span>문서번호: {item.docNum}</span>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-1 italic mt-1 bg-gray-50 p-2 rounded-lg">&ldquo;{item.description}&rdquo;</p>
                </div>
              </div>
              <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center text-sm font-medium">
                <span className="text-gray-500">{item.totalCount} 건</span>
                <span className={`${item.duplicateCount ? 'text-red-600 bg-red-50' : 'text-blue-600 bg-blue-50'} flex items-center gap-1.5 px-2 py-1 rounded-md`}>
                  {item.duplicateCount ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  )}
                  {item.duplicateCount} 중복 의심
                </span>
              </div>
            </div>
          ) : (
            <div key={item.id} className="bg-white/90 backdrop-blur-sm border border-gray-100 rounded-2xl p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <div className="p-2.5 bg-blue-50 rounded-xl text-[var(--color-gbsa-primary)] group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <span className="font-semibold text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full">{item.riskLevel}</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 truncate">
                  {/^[0-9-\s]+$/.test(item.title) ? formatBusinessNumber(item.title) : item.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">조회 일시: {formatTime(item.createdAt)}</p>
              </div>
              <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center text-sm font-medium">
                <span className="text-gray-500">사업자등록번호: <span className="font-mono">{formatBusinessNumber(item.brn || "")}</span></span>
                <button className="text-[var(--color-gbsa-primary)] hover:underline flex items-center gap-1">
                  상세 보기 
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
              </div>
            </div>
          )
        )) : (
          <div className="col-span-1 md:col-span-2 lg:col-span-3 py-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">
            검색 결과가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
