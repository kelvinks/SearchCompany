"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Company, SupportHistory } from "@/data/mockData";
import { excelService } from "@/services/excelService";
import { normalizeBusinessNumber, formatBusinessNumber } from "@/utils/format";
import LoadingOverlay from "@/components/LoadingOverlay";

interface HistoryEntry {
  companyId: string;
  companyName: string;
  history: Omit<SupportHistory, "id">;
}

interface NewHistoryModalProps {
  onClose: () => void;
  onAddHistory: (entries: HistoryEntry[]) => Promise<void>;
  companies: Company[];
}

const YEARS = Array.from({ length: 11 }, (_, i) => String(2020 + i));

export default function NewHistoryModal({ onClose, onAddHistory, companies }: NewHistoryModalProps) {
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const mainEl = document.querySelector("main");
    const originalMainOverflow = mainEl ? (mainEl as HTMLElement).style.overflow : "";

    document.body.style.overflow = "hidden";
    if (mainEl) {
      (mainEl as HTMLElement).style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      if (mainEl) {
        (mainEl as HTMLElement).style.overflow = originalMainOverflow;
      }
    };
  }, []);

  const [activeTab, setActiveTab] = useState<"SINGLE" | "BULK">("SINGLE");

  // Single registration state
  const [companySearch, setCompanySearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [year, setYear] = useState(YEARS[YEARS.length - 1]);
  const [programName, setProgramName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [historyStatus, setHistoryStatus] = useState<SupportHistory["status"]>("선정");
  const [selectedAmount, setSelectedAmount] = useState("");
  const [supportAmount, setSupportAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Bulk registration state
  const [isUploading, setIsUploading] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<(HistoryEntry & { companyName: string })[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredCompanies = useMemo(() => {
    if (!companySearch.trim()) return companies;
    const q = companySearch.trim().toLowerCase();
    return companies.filter(
      (c) =>
        c.companyName.toLowerCase().includes(q) ||
        c.businessNumber.replace(/-/g, "").includes(q.replace(/-/g, ""))
    );
  }, [companies, companySearch]);

  const handleCompanySelect = (company: Company) => {
    setSelectedCompany(company);
    setCompanySearch(`${company.companyName} (${formatBusinessNumber(company.businessNumber)})`);
    setShowDropdown(false);
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany || !programName) return;
    setSaving(true);
    try {
      const history: Omit<SupportHistory, "id"> = {
        year,
        programName,
        projectName: projectName || undefined,
        status: historyStatus,
        selectedAmount: Number(selectedAmount) || 0,
        supportAmount: Number(supportAmount) || 0,
        notes: notes || undefined,
      };
      await onAddHistory([{ companyId: selectedCompany.id, companyName: selectedCompany.companyName, history }]);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleBulkUpload = async (file: File) => {
    setIsUploading(true);
    setBulkPreview(null);
    try {
      const data = await excelService.parseUploadFile(file);
      const previewEntries: (HistoryEntry & { companyName: string })[] = [];

      for (const row of data) {
        const raw = row.rawData || {};
        const brnRaw = row.businessNumber || raw["사업자등록번호"] || "";
        const bNum = normalizeBusinessNumber(brnRaw);
        const pName = row.appliedProgramName || raw["지원사업명"] || "";
        const pjName = row.appliedProjectName || raw["지원과제명"] || "";
        const stRaw = raw["상태"] || "선정";
        const validStatus: SupportHistory["status"] = ["선정", "완료", "포기", "제외"].includes(stRaw) ? (stRaw as SupportHistory["status"]) : "선정";
        const yr = raw["년도"] || raw["연도"] || "";
        const selAmt = Number(raw["선정금액"] || 0);
        const supAmt = Number(raw["지원금액"] || 0);
        const nts = raw["비고"] || "";

        const matchedCompany = companies.find(
          (c) => normalizeBusinessNumber(c.businessNumber) === bNum
        );

        previewEntries.push({
          companyId: matchedCompany?.id || "UNKNOWN",
          companyName: matchedCompany?.companyName || `(매칭기업없음: ${brnRaw})`,
          history: {
            year: yr || String(new Date().getFullYear()),
            programName: pName,
            projectName: pjName || undefined,
            status: validStatus,
            selectedAmount: selAmt,
            supportAmount: supAmt,
            notes: nts || undefined,
          },
        });
      }

      setBulkPreview(previewEntries);
    } catch (error: any) {
      console.error("Bulk history upload parse error:", error);
      alert(`엑셀 파일 파싱 중 오류가 발생했습니다:\n${error.message || String(error)}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleBulkSubmit = async () => {
    if (!bulkPreview) return;
    
    // 유효성 체크: 매칭기업 없는 항목 제외
    const validEntries = bulkPreview.filter(e => e.companyId !== "UNKNOWN");
    if (validEntries.length === 0) {
        alert("등록 가능한 유효한 데이터가 없습니다.");
        return;
    }

    setSubmitting(true);
    try {
      await onAddHistory(validEntries);
      setBulkPreview(null);
      onClose();
    } catch (error) {
      console.error("Bulk submit error:", error);
      alert("일괄 등록 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity p-4 pt-20">
      <div className="bg-white w-full max-w-lg shadow-2xl flex flex-col rounded-2xl overflow-hidden animate-fade-in relative">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-50 rounded-xl text-green-700 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--color-gbsa-primary)] leading-tight">신규 지원이력 등록</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        {!bulkPreview && (
            <div className="flex border-b border-gray-200">
            <button
                className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === "SINGLE" ? "border-[var(--color-gbsa-primary)] text-[var(--color-gbsa-primary)] bg-blue-50/30" : "border-transparent text-gray-500 hover:bg-gray-50"}`}
                onClick={() => setActiveTab("SINGLE")}
            >
                단건 등록
            </button>
            <button
                className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === "BULK" ? "border-[var(--color-gbsa-primary)] text-[var(--color-gbsa-primary)] bg-blue-50/30" : "border-transparent text-gray-500 hover:bg-gray-50"}`}
                onClick={() => setActiveTab("BULK")}
            >
                엑셀 대량 업로드
            </button>
            </div>
        )}

        {/* Form Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === "SINGLE" && !bulkPreview ? (
            <form id="newHistoryForm" onSubmit={handleSingleSubmit} className="space-y-5">
              {/* Year + Company Search */}
              <div className="flex gap-3">
                <div className="w-[78px] flex-shrink-0">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                    <svg className="w-4 h-4 inline mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    년도 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-2 h-10 text-sm rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                    <svg className="w-4 h-4 inline mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    기업 검색 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={companySearch}
                    onChange={(e) => {
                      setCompanySearch(e.target.value);
                      setSelectedCompany(null);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    required
                    placeholder="기업명 또는 사업자등록번호 입력"
                    className="w-full px-4 h-10 text-sm rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  />
                  {showDropdown && filteredCompanies.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {filteredCompanies.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={() => handleCompanySelect(c)}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 border-b border-gray-50 last:border-b-0 transition-colors"
                        >
                          <span className="font-medium">{c.companyName}</span>
                          <span className="text-gray-400 ml-2 text-xs">{formatBusinessNumber(c.businessNumber)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {showDropdown && companySearch.trim() && filteredCompanies.length === 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg p-4 text-sm text-gray-400 text-center">
                      일치하는 기업이 없습니다
                    </div>
                  )}
                </div>
              </div>

              {/* Status + Program Name */}
              <div className="flex gap-3">
                <div className="w-[78px] flex-shrink-0">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">상태 <span className="text-red-500">*</span></label>
                  <select
                    value={historyStatus}
                    onChange={(e) => setHistoryStatus(e.target.value as SupportHistory["status"])}
                    className="w-full px-2 h-10 text-sm rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  >
                    <option value="선정">선정</option>
                    <option value="완료">완료</option>
                    <option value="포기">포기</option>
                    <option value="제외">제외</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">지원 사업명 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    required
                    placeholder="예: 2025년 중소기업 기술개발 지원사업"
                    className="w-full px-4 h-10 text-sm rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Project Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">지원 과제명</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="예: AI 기반 검색 시스템 개발"
                  className="w-full px-4 h-10 text-sm rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                />
              </div>

              {/* Amounts */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">선정 금액</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={selectedAmount ? Number(selectedAmount).toLocaleString() : ""}
                    onChange={(e) => setSelectedAmount(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="0"
                    className="w-full px-4 h-10 text-sm font-mono rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">지원 금액</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={supportAmount ? Number(supportAmount).toLocaleString() : ""}
                    onChange={(e) => setSupportAmount(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="0"
                    className="w-full px-4 h-10 text-sm font-mono rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">비고</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="추가 정보가 있으면 입력해 주세요"
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none"
                />
              </div>
            </form>
          ) : bulkPreview ? (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-gray-700">총 {bulkPreview.length}건의 이력이 파싱되었습니다.</p>
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-xl">
                  {bulkPreview.map((e, i) => (
                      <div key={i} className="px-4 py-2.5 text-sm border-b border-gray-100 last:border-b-0">
                          <p className="font-semibold text-gray-800">{e.companyName}</p>
                          <p className="text-xs text-gray-500">{e.history.programName} ({e.history.status})</p>
                      </div>
                  ))}
              </div>
              <button 
                  onClick={handleBulkSubmit}
                  disabled={submitting}
                  className="w-full py-2.5 text-sm bg-[var(--color-gbsa-primary)] text-white font-medium rounded-xl hover:bg-[var(--color-gbsa-secondary)] transition-colors"
              >
                  {submitting ? "등록 중..." : "등록 완료"}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
                  <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5 text-sm text-gray-700">
                    <p className="font-semibold text-[var(--color-gbsa-primary)] mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      엑셀 일괄 등록 안내
                    </p>
                    <p>사업자등록번호로 기존 등록된 기업을 찾아 지원이력을 일괄 추가합니다.</p>
                    <a
                      href="/templates/history_registration_template.xlsx"
                      download="지원이력일괄등록양식.xlsx"
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-bold bg-white border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      엑셀(XLSX) 양식 다운로드
                    </a>
                  </div>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-2xl p-10 flex flex-col items-center justify-center hover:border-[var(--color-gbsa-primary)] hover:bg-blue-50/30 transition-colors cursor-pointer group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-100 group-hover:text-[var(--color-gbsa-primary)] transition-colors">
                      <svg className="w-8 h-8 text-gray-400 group-hover:text-[var(--color-gbsa-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-gray-700 font-semibold text-center">여기를 클릭하여 엑셀 파일을 업로드하세요.</p>
                    <input
                      type="file"
                      className="hidden"
                      accept=".xlsx, .xls, .csv"
                      ref={fileInputRef}
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleBulkUpload(e.target.files[0]);
                        }
                      }}
                    />
                  </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab === "SINGLE" && !bulkPreview && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              form="newHistoryForm"
              className="px-5 py-2.5 text-sm bg-[var(--color-gbsa-primary)] text-white font-medium rounded-lg hover:bg-[var(--color-gbsa-secondary)] transition-colors shadow-sm"
            >
              등록 완료
            </button>
          </div>
        )}

        <LoadingOverlay show={isUploading || submitting} message={isUploading ? "파일 읽는 중..." : "등록 중..."} />
      </div>
    </div>
  );
}
