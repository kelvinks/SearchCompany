"use client";

import { Company, SupportHistory } from "@/data/mockData";
import { formatBusinessNumber } from "@/utils/format";

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
  if (!company) return null;

  const validTotalAmount = company.histories
    .filter((h) => h.status !== "포기" && h.status !== "제외")
    .reduce((sum, h) => sum + h.supportAmount, 0);

  // Determine theme color and system note styling based on matchStatus
  let alertBgClass = "bg-green-50 border-green-500";
  let alertTextClass = "text-green-700";
  let alertIconColor = "text-green-500";
  let statusBadgeColor = "bg-[var(--color-status-green)] text-white";
  let statusLabel = "신규 기업";

  if (company.matchStatus === "EXACT") {
    alertBgClass = "bg-red-50 border-red-500";
    alertTextClass = "text-red-700";
    alertIconColor = "text-red-500";
    statusBadgeColor = "bg-[var(--color-status-red)] text-white";
    statusLabel = "정확도 100% (사업자번호 일치)";
  } else if (company.matchStatus === "FUZZY") {
    alertBgClass = "bg-orange-50 border-orange-500";
    alertTextClass = "text-orange-700";
    alertIconColor = "text-orange-500";
    statusBadgeColor = "bg-[var(--color-status-orange)] text-white";
    statusLabel = `유사 매칭 ${company.matchScore}% (기업명 유사)`;
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end transition-opacity">
      {/* Modal Container */}
      <div className="bg-white w-full max-w-5xl h-full shadow-2xl flex flex-col animate-slide-in-right">
        
        {/* Header */}
        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg text-[var(--color-gbsa-primary)] flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--color-gbsa-primary)] leading-tight">중복 지원 상세 비교</h2>
              <p className="text-xs text-gray-500 mt-0.5">신규 지원 신청 건과 내부 DB 데이터를 교차 대조하여 검토합니다.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          
          {/* Status Label Banner */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-500">매칭 분석 상태:</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusBadgeColor}`}>
              {statusLabel}
            </span>
          </div>

          {/* 2-Column Comparison Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
            {/* Middle Divider Line & Anchor */}
            <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-gray-100 -translate-x-1/2"></div>
            
            {/* Left Column: New Application Data */}
            <div className="space-y-4 p-5 rounded-xl border border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                <svg className="w-5 h-5 text-[var(--color-gbsa-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="font-bold text-gray-800">신규 신청 데이터</h3>
                <span className="ml-auto text-xs bg-gray-200/70 px-2 py-0.5 rounded text-gray-600 font-mono">REQ-{company.id}</span>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">기업명</label>
                  <div className="text-sm font-medium text-gray-900 p-2.5 bg-white rounded-lg border border-gray-200">
                    {company.companyName}
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">사업자등록번호</label>
                  {company.matchStatus !== "NEW" ? (
                    <div className="text-sm font-mono font-bold p-2.5 rounded-lg border flex justify-between items-center bg-[var(--color-gbsa-primary)] text-white border-[var(--color-gbsa-primary)] shadow-sm">
                      <span>{formatBusinessNumber(company.businessNumber)}</span>
                      <svg className="w-4 h-4 text-orange-300" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ) : (
                    <div className="text-sm font-mono text-gray-800 p-2.5 bg-white rounded-lg border border-gray-200">
                      {formatBusinessNumber(company.businessNumber)}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">대표자</label>
                    <div className="text-sm text-gray-800 p-2.5 bg-white rounded-lg border border-gray-200">
                      {company.representative}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">신청 지원금</label>
                    <div className="text-sm font-mono text-gray-800 p-2.5 bg-white rounded-lg border border-gray-200">
                      {company.requestedAmount ? `₩ ${company.requestedAmount.toLocaleString()}` : "-"}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">소재지</label>
                  <div className="text-sm text-gray-800 p-2.5 bg-white rounded-lg border border-gray-200">
                    {company.location}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">주요 제품 / 사업</label>
                  <div className="text-sm text-gray-800 p-2.5 bg-white rounded-lg border border-gray-200">
                    {company.mainProducts} ({company.supportField})
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
              
              <div className="flex items-center gap-2 pb-2 border-b border-blue-200">
                <svg className="w-5 h-5 text-[var(--color-gbsa-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
                <h3 className="font-bold text-gray-800">기존 내부 DB 데이터</h3>
                <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono">DB-ORG-{company.id}</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">기업명</label>
                  <div className="text-sm font-medium text-gray-900 p-2.5 bg-white rounded-lg border border-transparent">
                    {company.dbCompanyName || company.companyName}
                    {company.matchStatus === "FUZZY" && (
                      <span className="ml-2 text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 font-semibold">
                        유사도 {company.matchScore}%
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">사업자등록번호</label>
                  {company.matchStatus !== "NEW" ? (
                    <div className="text-sm font-mono font-bold p-2.5 rounded-lg border flex justify-between items-center bg-[var(--color-gbsa-primary)] text-white border-[var(--color-gbsa-primary)] shadow-sm">
                      <span>{formatBusinessNumber(company.businessNumber)}</span>
                      <svg className="w-4 h-4 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ) : (
                    <div className="text-sm font-mono text-gray-800 p-2.5 bg-white rounded-lg border border-transparent">
                      -
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">대표자</label>
                    <div className={`text-sm p-2.5 bg-white rounded-lg border border-transparent ${company.dbRepresentative && company.dbRepresentative !== company.representative ? "bg-yellow-50 font-semibold" : ""}`}>
                      {company.dbRepresentative || company.representative}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">최근 지원 이력</label>
                    <div className="text-sm p-2.5 bg-white rounded-lg border border-transparent text-gray-800">
                      {company.histories.length > 0 ? (
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="w-2 h-2 rounded-full bg-green-500 inline-block shrink-0"></span>
                          <span>{company.histories[0].year}년 {company.histories[0].programName}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 font-normal">이력 없음</span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">소재지</label>
                  <div className={`text-sm p-2.5 bg-white rounded-lg border border-transparent ${company.dbLocation && company.dbLocation !== company.location ? "bg-yellow-50 font-semibold" : ""}`}>
                    {company.dbLocation || company.location}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">주요 제품 / 사업</label>
                  <div className="text-sm p-2.5 bg-white rounded-lg border border-transparent text-gray-800">
                    {company.dbMainProducts || company.mainProducts} ({company.dbSupportField || company.supportField})
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* System Analysis Note Banner */}
          {company.systemNote && (
            <div className={`p-4 rounded-xl border-l-4 ${alertBgClass} ${alertTextClass} flex gap-3 text-sm shrink-0 shadow-sm`}>
              <svg className={`w-5 h-5 shrink-0 ${alertIconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-bold text-gray-900 m-0">시스템 분석 결과 (System Analysis)</p>
                <p className="mt-1 m-0 text-gray-600 leading-relaxed">{company.systemNote}</p>
              </div>
            </div>
          )}

          {/* History Management Area */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-lg font-bold text-gray-800">과거 지원 이력 관리</h3>
              <div className="text-sm font-medium text-gray-700 bg-gray-50 px-3 py-1 rounded-lg border">
                총 유효 누적 지원 금액: <span className="text-lg font-bold text-[var(--color-gbsa-primary)] ml-1">{validTotalAmount.toLocaleString()}원</span>
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
                      <th className="py-3 px-4 font-semibold">년도</th>
                      <th className="py-3 px-4 font-semibold">지원 사업명</th>
                      <th className="py-3 px-4 font-semibold text-center w-24">상태</th>
                      <th className="py-3 px-4 font-semibold text-right">선정 금액</th>
                      <th className="py-3 px-4 font-semibold text-right">지원 금액</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {company.histories.map((history) => {
                      const isDisabled = history.status === "포기" || history.status === "제외";
                      return (
                        <tr key={history.id} className={`transition-colors ${isDisabled ? "bg-gray-50 text-gray-400" : "hover:bg-blue-50/20"}`}>
                          <td className="py-3.5 px-4 font-mono">{history.year}</td>
                          <td className="py-3.5 px-4 font-medium">
                            <span className={isDisabled ? "text-gray-400" : "text-gray-800"}>{history.programName}</span>
                            {history.notes && (
                              <div className="text-xs text-orange-500 mt-0.5 font-normal">
                                비고: {history.notes}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <select 
                              className={`text-xs font-semibold px-2 py-1 rounded-md border ${isDisabled ? "bg-gray-100 text-gray-500 border-gray-200" : "bg-white text-[var(--color-gbsa-primary)] border-blue-200"} outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer`}
                              value={history.status}
                              onChange={(e) => onUpdateHistory(company.id, history.id, { status: e.target.value as "완료" | "포기" | "제외" | "진행중" })}
                            >
                              <option value="완료">완료</option>
                              <option value="진행중">진행중</option>
                              <option value="포기">포기</option>
                              <option value="제외">제외</option>
                            </select>
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

        {/* Modal Footer / Actions */}
        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/80 rounded-b-xl flex justify-between items-center shrink-0">
          <button 
            onClick={onClose} 
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200/80 border border-gray-300 bg-white transition-colors"
          >
            닫기 (Close)
          </button>
          
          {company.matchStatus !== "NEW" && (
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  if (onFalseAlarm) onFalseAlarm(company.id);
                  onClose();
                }}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-200/50 border border-gray-300 bg-white transition-colors"
              >
                오탐 처리 (False Alarm)
              </button>
              <button 
                onClick={() => {
                  if (onConfirmDuplicate) onConfirmDuplicate(company.id);
                  onClose();
                }}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--color-gbsa-primary)] hover:bg-[var(--color-gbsa-secondary)] transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                중복 확정 (Confirm)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
