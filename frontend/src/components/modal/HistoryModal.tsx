"use client";

import { useEffect } from "react";
import { Company, SupportHistory } from "@/data/mockData";
import BusinessNumber from "@/components/BusinessNumber";
import { checkProgramOverlap } from "@/services/matchingService";

interface HistoryModalProps {
  company: Company | null;
  onClose: () => void;
  onUpdateHistory: (companyId: string, historyId: string, updates: Partial<SupportHistory>) => void;
  onConfirmDuplicate?: (companyId: string) => void;
  onFalseAlarm?: (companyId: string) => void;
}

export default function HistoryModal({ 
  company, 
  onClose, 
  onUpdateHistory,
  onConfirmDuplicate,
  onFalseAlarm
}: HistoryModalProps) {
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const mainEl = document.querySelector("main");
    const originalMainOverflow = mainEl ? mainEl.style.overflow : "";

    document.body.style.overflow = "hidden";
    if (mainEl) {
      mainEl.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      if (mainEl) {
        mainEl.style.overflow = originalMainOverflow;
      }
    };
  }, []);

  if (!company) return null;

  const validTotalAmount = company.histories
    .filter((h) => h.status !== "포기" && h.status !== "제외")
    .reduce((sum, h) => sum + h.supportAmount, 0);

  // Determine theme color and system note styling based on matchStatus & duplicate suspicion
  let alertBgClass = "bg-green-50 border-green-500 border-l-4";
  let alertIconColor = "text-green-500";
  let statusBadgeColor = "bg-[var(--color-status-green)] text-white";
  let statusLabel = "신규 요청";

  if (company.matchStatus === "EXACT") {
    if (company.isDuplicateSuspect) {
      alertBgClass = "bg-red-50 border-red-500 border-l-8";
      alertIconColor = "text-red-600";
      statusBadgeColor = "bg-[var(--color-status-red)] text-white";
      statusLabel = "중복 수혜 의심 (사업자번호 일치)";
    } else {
      alertBgClass = "bg-blue-50 border-blue-500 border-l-4";
      alertIconColor = "text-blue-500";
      statusBadgeColor = "bg-blue-600 text-white";
      statusLabel = "조회 완료 (사업자번호 일치, 안전)";
    }
  } else if (company.matchStatus === "FUZZY") {
    if (company.isDuplicateSuspect) {
      alertBgClass = "bg-red-50 border-red-500 border-l-8";
      alertIconColor = "text-red-600";
      statusBadgeColor = "bg-[var(--color-status-red)] text-white";
      statusLabel = `중복 수혜 의심 (유사 매칭 ${company.matchScore}%)`;
    } else {
      alertBgClass = "bg-orange-50 border-orange-500 border-l-4";
      alertIconColor = "text-orange-500";
      statusBadgeColor = "bg-[var(--color-status-orange)] text-white";
      statusLabel = `확인 필요 (유사 매칭 ${company.matchScore}%)`;
    }
  }

  return (
    <div className="fixed top-16 bottom-0 right-0 left-64 bg-black/40 backdrop-blur-sm z-50 flex justify-end transition-opacity">
      {/* Modal Container */}
      <div className="bg-white w-[80%] h-full shadow-2xl flex flex-col animate-slide-in-right">
        
        {/* Header */}
        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-blue-50 rounded-xl text-[var(--color-gbsa-primary)] flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-[var(--color-gbsa-primary)] leading-tight">중복 지원 상세 비교</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusBadgeColor}`}>
                  {statusLabel}
                </span>
                {company.isDuplicateSuspect && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white animate-pulse">
                    ⚠️ 중복 수혜 의심
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5 font-medium">신규 지원 신청 건과 내부 DB 데이터를 교차 대조하여 검토합니다.</p>
            </div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 hover:bg-gray-200 rounded-full transition-colors shrink-0 ml-4">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">

          {/* 2-Column Comparison Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
            {/* Middle Divider Line & Anchor */}
            <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-gray-100 -translate-x-1/2"></div>
            
            {/* Left Column: New Application Data */}
            <div className="space-y-4 p-5 rounded-xl border border-gray-100 bg-gray-50/50">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[var(--color-gbsa-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="font-bold text-gray-800">조회 요청 데이터</h3>
                </div>
                <span className="inline-block text-[6pt] bg-gray-200/70 px-2 py-0.5 rounded text-gray-600 font-mono font-semibold leading-none">REQ-{company.id}</span>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    기업명
                  </label>
                  <div className="text-sm font-medium text-gray-900 p-2.5 bg-white rounded-lg border border-gray-200">
                    {company.companyName || "-"}
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    사업자등록번호
                  </label>
                  {company.matchStatus !== "NEW" ? (
                    <div className="text-sm font-mono font-bold p-2.5 rounded-lg border flex justify-between items-center bg-[var(--color-gbsa-primary)] text-white border-[var(--color-gbsa-primary)] shadow-sm">
                      <span>{(company.businessNumber || (company as any).brn) ? <BusinessNumber value={company.businessNumber || (company as any).brn} /> : "-"}</span>
                      <svg className="w-4 h-4 text-orange-300" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ) : (
                    <div className="text-sm font-mono text-gray-800 p-2.5 bg-white rounded-lg border border-gray-200">
                      {(company.businessNumber || (company as any).brn) ? <BusinessNumber value={company.businessNumber || (company as any).brn} /> : "-"}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    확인요청 지원사업명
                  </label>
                  <div className="text-sm text-gray-800 p-2.5 bg-white rounded-lg border border-gray-200">
                    {company.appliedProgramName || "-"}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                    확인요청 지원과제명
                  </label>
                  <div className="text-sm text-gray-800 p-2.5 bg-white rounded-lg border border-gray-200">
                    {company.appliedProjectName || "-"}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                    주소
                  </label>
                  <div className="text-sm text-gray-800 p-2.5 bg-white rounded-lg border border-gray-200">
                    {company.location || "-"}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Existing Database Data */}
            <div className="space-y-4 p-5 rounded-xl border border-blue-100 bg-blue-50/20 relative">
              {/* Comparative Anchor Badge */}
              <div className="absolute -left-[25px] top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center z-10 hidden lg:flex shadow-sm text-gray-400">
                🔗
              </div>
              
              <div className="flex items-center justify-between pb-2 border-b border-blue-200">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[var(--color-gbsa-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                  <h3 className="font-bold text-gray-800">기존 내부 DB 데이터</h3>
                </div>
                <span className="inline-block text-[6pt] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono font-semibold leading-none">DB-ORG-{company.id}</span>
              </div>

              {company.matchStatus === "NEW" ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-3">
                  <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-sm font-medium">일치하는 내부 기업이 없습니다</p>
                  <p className="text-xs">등록기업에 해당 기업을 먼저 등록해주세요</p>
                </div>
              ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    기업명
                  </label>
                  <div className="text-sm font-medium text-gray-900 p-2.5 bg-white rounded-lg border border-transparent">
                    {company.dbCompanyName || "-"}
                    {company.matchStatus === "FUZZY" && (
                      <span className="ml-2 text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 font-semibold font-mono">
                        유사도 {company.matchScore}%
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    사업자등록번호
                  </label>
                  <div className="text-sm font-mono text-gray-800 p-2.5 bg-white rounded-lg border border-gray-200 flex justify-between items-center">
                    <span>
                      {(() => {
                        const displayBrn = company.dbBusinessNumber;
                        const cleanedBrn = (displayBrn && displayBrn !== "undefined" && displayBrn !== "null") ? displayBrn : null;
                        return cleanedBrn ? <BusinessNumber value={cleanedBrn} /> : "-";
                      })()}
                    </span>
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    최근 지원사업명
                  </label>
                  <div className="text-sm p-2.5 bg-white rounded-lg border border-transparent text-gray-800">
                    {company.histories.length > 0 ? (
                      <><span className="font-mono">{company.histories[0].year}</span>년 {company.histories[0].programName}</>
                    ) : (
                      <span className="text-gray-400 font-normal">이력 없음</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                    최근 지원과제명
                  </label>
                  <div className="text-sm p-2.5 bg-white rounded-lg border border-transparent text-gray-800">
                    {company.histories.length > 0 ? (
                      company.histories[0].projectName || "-"
                    ) : (
                      "-"
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                    주소
                  </label>
                  <div className={`text-sm p-2.5 bg-white rounded-lg border border-transparent ${company.dbLocation && company.dbLocation !== company.location ? "bg-yellow-50 font-semibold" : ""}`}>
                    {company.dbLocation || "-"}
                  </div>
                </div>
              </div>
              )}
            </div>
          </div>



          {/* History Management Area */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-lg font-bold text-gray-800">과거 지원 이력</h3>
              <div className="text-sm font-medium text-gray-700">
                총 유효 누적 지원 금액: <span className="inline-flex items-center ml-2 px-3 py-1 rounded-full bg-[var(--color-gbsa-primary)] text-white text-lg font-bold"><span className="font-mono">{validTotalAmount.toLocaleString()}</span><span className="font-sans ml-0.5">원</span></span>
              </div>
            </div>

            {company.histories.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed">
                과거 지원 이력이 존재하지 않습니다.
              </div>
            ) : (
              <div className="overflow-hidden border border-gray-200 rounded-xl shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F1F5F9] text-gray-600 border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-4 font-semibold text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          년도
                        </div>
                      </th>
                      <th className="py-3 px-4 font-semibold text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          지원 사업명
                        </div>
                      </th>
                      <th className="py-3 px-4 font-semibold text-center w-24">
                        <div className="flex items-center justify-center gap-1.5">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          상태
                        </div>
                      </th>
                      <th className="py-3 px-4 font-semibold text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          선정 금액
                        </div>
                      </th>
                      <th className="py-3 px-4 font-semibold text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                          지원 금액
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {company.histories.map((history) => {
                      const isDisabled = history.status === "포기" || history.status === "제외";
                      const overlapResult = checkProgramOverlap(company.supportField || "", history);
                      const overlapKeywords = overlapResult.keywords;
                      const isOverlap = overlapKeywords.length > 0 && !isDisabled;
                      
                      return (
                        <tr key={history.id} className={`transition-colors ${isDisabled ? "bg-gray-50 text-gray-400" : isOverlap ? "bg-red-50/50 hover:bg-red-50" : "hover:bg-blue-50/20"}`}>
                          <td className="py-3.5 px-4 font-mono">{history.year}</td>
                          <td className="py-3.5 px-4 font-medium">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={isDisabled ? "text-gray-400" : "text-gray-800 font-semibold"}>
                                {history.programName}
                                {history.projectName ? `(${history.projectName})` : ""}
                              </span>
                              {isOverlap && (
                                <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded border border-red-200">
                                  중복 키워드 감지: {overlapKeywords.join(", ")}
                                </span>
                              )}
                            </div>
                            {history.notes && (
                              <div className="text-xs text-orange-500 mt-0.5 font-normal">
                                비고: {history.notes}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-md ${
                              history.status === "완료" ? "bg-green-100 text-green-700" :
                              history.status === "선정" ? "bg-blue-100 text-blue-700" :
                              history.status === "포기" ? "bg-gray-100 text-gray-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {history.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono">
                            {history.selectedAmount.toLocaleString()}원
                          </td>
                          <td className={`py-3.5 px-4 text-right font-bold font-mono ${isDisabled ? "line-through text-gray-400" : "text-[var(--color-gbsa-primary)]"}`}>
                            {history.supportAmount.toLocaleString()}원
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
