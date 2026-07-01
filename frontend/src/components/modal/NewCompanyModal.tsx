"use client";

import { useState, useRef, useEffect } from "react";
import { Company } from "@/data/mockData";
import { excelService } from "@/services/excelService";
import { companyService } from "@/services/companyService";
import LoadingOverlay from "@/components/LoadingOverlay";
import { normalizeBusinessNumber, formatBusinessNumber } from "@/utils/format";

interface ParsedCandidate {
  companyName: string;
  businessNumber: string;
  location: string;
  supportField: string;
  mainProducts: string;
  status: "normal" | "duplicate" | "error";
  existingCompanyId?: string;
}

interface NewCompanyModalProps {
  onClose: () => void;
  onAdd: (company: Company | Company[]) => Promise<void> | void;
}

export default function NewCompanyModal({ onClose, onAdd }: NewCompanyModalProps) {
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

  const [activeTab, setActiveTab] = useState<"SINGLE" | "BULK">("SINGLE");

  // Single Registration State
  const [companyName, setCompanyName] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState("");
  const [supportField, setSupportField] = useState("");
  const [mainProducts, setMainProducts] = useState("");
  const extractLocation = (addr: string) => {
    const parts = addr.trim().split(/\s+/);
    const match = parts.find(p => /시$/.test(p) || /군$/.test(p));
    return match || "";
  };
  useEffect(() => {
    const loc = extractLocation(address);
    Promise.resolve().then(() => {
      setLocation(loc);
    });
  }, [address]);

  // Single Registration Saving State
  const [saving, setSaving] = useState(false);

  // Bulk Registration State
  const [isUploading, setIsUploading] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<ParsedCandidate[] | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !businessNumber) return;
    setSaving(true);
    try {
      const newCompany: Company = {
        id: `c-${Date.now()}`,
        companyName,
        businessNumber: normalizeBusinessNumber(businessNumber),
        location,
        supportField,
        mainProducts,
        matchStatus: "NEW",
        matchScore: 0,
        histories: [],
      };
      await onAdd(newCompany);
    } catch (err) {
      console.error("Single registration error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleBulkUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const parsedCandidates = await excelService.parseUploadFile(file);

      if (parsedCandidates.length === 0) {
        alert("파일에서 인식된 기업 데이터가 없습니다.\n컬럼명이 '기업명', '사업자등록번호', '소재지' 등으로 되어있는지 확인 후 다시 업로드해주세요.");
        return;
      }

      const previewList: ParsedCandidate[] = [];
      const selectedSet = new Set<number>();

      for (const c of parsedCandidates) {
        const companyName = c.companyName || "";
        const businessNumber = c.businessNumber || "";
        const location = c.location || "";
        const supportField = c.supportField || "";
        const mainProducts = c.mainProducts || "";

        // 필수값 누락 체크
        if (!companyName.trim() || !businessNumber.trim()) {
          previewList.push({ companyName, businessNumber, location, supportField, mainProducts, status: "error" });
          continue;
        }

        // DB 중복 검사
        const normalizedBrn = normalizeBusinessNumber(businessNumber);
        const existingId = await companyService.getCompanyIdByBusinessNumber(normalizedBrn);

        if (existingId) {
          previewList.push({ companyName, businessNumber, location, supportField, mainProducts, status: "duplicate", existingCompanyId: existingId });
        } else {
          const idx = previewList.length;
          previewList.push({ companyName, businessNumber, location, supportField, mainProducts, status: "normal" });
          selectedSet.add(idx);
        }
      }

      setBulkPreview(previewList);
      setSelectedIndices(selectedSet);
    } catch (error) {
      console.error("Bulk upload parse error:", error);
      alert("엑셀 파일 파싱 중 오류가 발생했습니다.\n파일이 손상되었거나 암호가 걸려있는지 확인해주세요.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleBulkSubmit = async () => {
    if (!bulkPreview || bulkPreview.length === 0 || selectedIndices.size === 0) return;
    setSubmitting(true);
    try {
      const selectedItems = bulkPreview.filter((_, i) => selectedIndices.has(i));

      const newCompanies: Company[] = [];
      const duplicateUpdates: { id: string; data: Partial<Company> }[] = [];

      for (const c of selectedItems) {
        if (c.status === "duplicate" && c.existingCompanyId) {
          duplicateUpdates.push({
            id: c.existingCompanyId,
            data: {
              companyName: c.companyName,
              businessNumber: normalizeBusinessNumber(c.businessNumber),
              location: c.location,
              supportField: c.supportField,
              mainProducts: c.mainProducts,
            },
          });
        } else if (c.status === "normal") {
          newCompanies.push({
            id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            companyName: c.companyName,
            businessNumber: normalizeBusinessNumber(c.businessNumber),
            location: c.location,
            supportField: c.supportField,
            mainProducts: c.mainProducts,
            matchStatus: "NEW",
            matchScore: 0,
            histories: [],
          });
        }
      }

      if (newCompanies.length > 0) {
        await onAdd(newCompanies);
      }
      for (const dup of duplicateUpdates) {
        await companyService.updateCompany(dup.id, dup.data);
      }
      setBulkPreview(null);
      setSelectedIndices(new Set());
    } catch (error) {
      console.error("Bulk submit error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const isMissingRequired = (c: ParsedCandidate) => !c.companyName.trim() || !c.businessNumber.trim();

  const toggleIndex = (idx: number) => {
    if (!bulkPreview || bulkPreview[idx].status === "error") return;
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (!bulkPreview) return;
    const selectableIndices = bulkPreview
      .map((c, i) => (c.status !== "error" ? i : -1))
      .filter((i) => i !== -1);
    const allSelected = selectableIndices.every((i) => selectedIndices.has(i));
    if (allSelected) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(selectableIndices));
    }
  };

  return (
    <div className="fixed inset-0 z-50 transition-opacity" style={{ left: '256px', top: '64px' }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className={`absolute inset-0 flex items-center justify-center ${bulkPreview ? 'p-[10vh_10vw]' : 'p-8'}`}>
      <div className={`bg-white w-full shadow-2xl flex flex-col rounded-2xl overflow-hidden animate-fade-in relative ${bulkPreview ? 'max-h-full h-auto' : 'max-w-2xl'}`}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl text-[var(--color-gbsa-primary)] flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--color-gbsa-primary)] leading-tight">신규 기업 등록</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs (hide when preview is shown) */}
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
        <div className="flex-1 min-h-0 p-6 overflow-y-auto">
          {activeTab === "SINGLE" && !bulkPreview ? (
            <form id="newCompanyForm" onSubmit={handleSingleSubmit} className="space-y-5">
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">기업명 <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </span>
                  <input 
                    type="text" 
                    value={companyName} 
                    onChange={(e) => setCompanyName(e.target.value)} 
                    required 
                    placeholder="예: (주)테스트기업" 
                    className="w-full pl-10 pr-4 h-10 text-sm rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:ring-2 focus:ring-blue-100 outline-none transition-all" 
                  />
                </div>
              </div>
              
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">사업자등록번호 <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </span>
                  <input 
                    type="text" 
                    value={formatBusinessNumber(businessNumber)} 
                    onChange={(e) => setBusinessNumber(e.target.value.replace(/\D/g, ''))} 
                    required 
                    placeholder="예: 123-45-67890" 
                    className={`w-full pl-10 pr-4 h-10 text-sm font-mono rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:ring-2 focus:ring-blue-100 outline-none transition-all ${
                      businessNumber && businessNumber.replace(/\D/g, '').length !== 10 ? 'text-red-500 font-semibold border-red-300 focus:border-red-500 focus:ring-red-100' : ''
                    }`}
                  />
                </div>
                {businessNumber && businessNumber.replace(/\D/g, '').length !== 10 && (
                  <p className="text-xs text-red-500 mt-1 ml-1">사업자등록번호는 10자리 숫자여야 합니다.</p>
                )}
              </div>
              
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">주소</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                  </span>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="예: 경기도 수원시 영통구 세무서로 123"
                    className="w-full pl-10 pr-4 h-10 text-sm rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  />
                </div>
              </div>
              <input type="hidden" value={location} />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">주요 사업(지원분야)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </span>
                    <input 
                      type="text" 
                      value={supportField} 
                      onChange={(e) => setSupportField(e.target.value)} 
                      placeholder="예: SW 개발" 
                      className="w-full pl-10 pr-4 h-10 text-sm rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:ring-2 focus:ring-blue-100 outline-none transition-all" 
                    />
                  </div>
                </div>
                <div className="relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">주요 제품</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    </span>
                    <input 
                      type="text" 
                      value={mainProducts} 
                      onChange={(e) => setMainProducts(e.target.value)} 
                      placeholder="예: AI 솔루션" 
                      className="w-full pl-10 pr-4 h-10 text-sm rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:ring-2 focus:ring-blue-100 outline-none transition-all" 
                    />
                  </div>
                </div>
              </div>
            </form>
          ) : bulkPreview ? (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-gray-50/50 shrink-0">
                <p className="text-sm font-semibold text-gray-700">
                  총 <span className="text-[var(--color-gbsa-primary)]">{bulkPreview.length}</span>건의 기업이 파싱되었습니다. 확인 후 등록해주세요.
                </p>
                <button
                  onClick={() => { setBulkPreview(null); setSelectedIndices(new Set()); }}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  다시 업로드
                </button>
              </div>

              {/* Preview Table */}
              <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="py-2.5 px-3 text-center font-semibold text-gray-600 w-10">
                        <input
                          type="checkbox"
                          checked={bulkPreview.length > 0 && bulkPreview.filter(c => c.status !== "error").length > 0 && bulkPreview.filter(c => c.status !== "error").every((c) => selectedIndices.has(bulkPreview.indexOf(c)))}
                          onChange={toggleAll}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="py-2.5 px-3 text-left font-semibold text-gray-600 w-10">#</th>
                      <th className="py-2.5 px-3 text-left font-semibold text-gray-600">기업명</th>
                      <th className="py-2.5 px-3 text-left font-semibold text-gray-600">사업자등록번호</th>
                      <th className="py-2.5 px-3 text-left font-semibold text-gray-600">소재지</th>
                      <th className="py-2.5 px-3 text-left font-semibold text-gray-600">지원분야</th>
                      <th className="py-2.5 px-3 text-left font-semibold text-gray-600">주요제품</th>
                      <th className="py-2.5 px-3 text-center font-semibold text-gray-600 w-20">상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bulkPreview.map((c, i) => {
                      const isSelected = selectedIndices.has(i);
                      const rowBg = c.status === "duplicate" ? 'bg-orange-50/60' : c.status === "error" ? 'bg-red-50/40' : isSelected ? 'bg-blue-50/40' : '';
                      return (
                        <tr key={i} className={`${rowBg} hover:bg-gray-50/60 transition-colors`}>
                            <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={c.status === "error"}
                              onChange={() => toggleIndex(i)}
                              className="rounded border-gray-300 disabled:opacity-30"
                            />
                          </td>
                          <td className="py-2 px-3 text-gray-400 text-xs">{i + 1}</td>
                          <td className={`py-2 px-3 font-medium ${c.status === "error" ? 'text-red-500' : c.status === "duplicate" ? 'text-orange-600' : 'text-gray-900'}`}>
                            {c.companyName || '(빈 값)'}
                          </td>
                          <td className={`py-2 px-3 font-mono text-xs ${c.status === "error" ? 'text-red-500' : c.status === "duplicate" ? 'text-orange-600' : 'text-gray-600'}`}>
                            {c.businessNumber ? formatBusinessNumber(c.businessNumber) : '(빈 값)'}
                          </td>
                          <td className="py-2 px-3 text-gray-500 max-w-[120px] truncate">{c.location || '-'}</td>
                          <td className="py-2 px-3 text-gray-500 max-w-[100px] truncate">{c.supportField || '-'}</td>
                          <td className="py-2 px-3 text-gray-500 max-w-[100px] truncate">{c.mainProducts || '-'}</td>
                          <td className="py-2 px-3 text-center">
                            {c.status === "error" ? (
                              <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-600 font-semibold">오류</span>
                            ) : c.status === "duplicate" ? (
                              <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-600 font-semibold">중복</span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-600 font-semibold">정상</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
                </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5 text-sm text-gray-700">
                <p className="font-semibold text-[var(--color-gbsa-primary)] mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  엑셀 일괄 등록 안내
                </p>
                <p>정해진 엑셀 양식에 맞춰 데이터를 입력한 후 업로드해 주세요.</p>
                <p className="mt-1">한 번에 최대 1,000건의 기업을 등록할 수 있습니다.</p>
                
                <a 
                  href="/templates/company_registration_template.xlsx" 
                  download="기업일괄등록양식.xlsx"
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
                <p className="text-sm text-gray-400 mt-1">.xlsx, .xls, .csv 지원</p>
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
              form="newCompanyForm"
              className="px-5 py-2.5 text-sm bg-[var(--color-gbsa-primary)] text-white font-medium rounded-lg hover:bg-[var(--color-gbsa-secondary)] transition-colors shadow-sm"
            >
              등록 완료
            </button>
          </div>
        )}

        {/* Bulk Preview Footer */}
        {bulkPreview && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3 shrink-0">
            <div className="flex gap-2">
              {bulkPreview.filter(c => c.status === "normal").length > 0 && (
                <span className="px-3 py-1.5 bg-green-50 text-green-700 rounded-full font-semibold text-sm">
                  정상 {bulkPreview.filter(c => c.status === "normal").length}건
                </span>
              )}
              {bulkPreview.filter(c => c.status === "duplicate").length > 0 && (
                <span className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full font-semibold text-sm">
                  중복 {bulkPreview.filter(c => c.status === "duplicate").length}건
                </span>
              )}
              {bulkPreview.filter(c => c.status === "error").length > 0 && (
                <span className="px-3 py-1.5 bg-red-50 text-red-700 rounded-full font-semibold text-sm">
                  오류 {bulkPreview.filter(c => c.status === "error").length}건
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => { setBulkPreview(null); setSelectedIndices(new Set()); }} 
                className="px-5 py-2.5 text-sm bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                다시 선택
              </button>
              <button 
                type="button" 
                onClick={handleBulkSubmit}
                disabled={submitting || selectedIndices.size === 0}
                className="px-5 py-2.5 text-sm bg-[var(--color-gbsa-primary)] text-white font-medium rounded-lg hover:bg-[var(--color-gbsa-secondary)] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "등록 중..." : `${selectedIndices.size}건 등록`}
              </button>
            </div>
          </div>
        )}

        {/* Saving Overlay */}
        <LoadingOverlay show={saving} message="등록 중..." />

        {/* Uploading Overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
            <div className="w-64">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[var(--color-gbsa-primary)] animate-progress-bar w-full origin-left"></div>
              </div>
              <p className="text-sm text-center mt-3 font-bold text-[var(--color-gbsa-primary)]">엑셀 파일 읽는 중...</p>
            </div>
          </div>
        )}

        {saving && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center rounded-2xl">
            <div className="w-64">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[var(--color-gbsa-primary)] animate-progress-bar w-full origin-left"></div>
              </div>
              <p className="text-sm text-center mt-3 font-bold text-[var(--color-gbsa-primary)]">기업 데이터 등록 중...</p>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
