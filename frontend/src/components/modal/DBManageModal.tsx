"use client";

import { Company, SupportHistory } from "@/data/mockData";
import { useState, useEffect, useRef, Fragment } from "react";
import { companyService } from "@/services/companyService";
import { formatBusinessNumber } from "@/utils/format";
import BusinessNumber from "@/components/BusinessNumber";
import LoadingOverlay from "@/components/LoadingOverlay";



  // State to control visibility of the add new entry form


interface DBManageModalProps {
  company: Company | null;
  onClose: () => void;
}

const formatNumberWithCommas = (value: string | number): string => {
  if (value === undefined || value === null) return "";
  const cleanValue = value.toString().replace(/[^0-9]/g, "");
  if (!cleanValue) return "";
  return Number(cleanValue).toLocaleString();
};

const handleAmountChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
  const rawValue = e.target.value;
  const cleanValue = rawValue.replace(/[^0-9]/g, "");
  setter(cleanValue);
};

export default function DBManageModal({ company, onClose }: DBManageModalProps) {
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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editYear, setEditYear] = useState('');
  const [editProgramName, setEditProgramName] = useState('');
  const [editProjectName, setEditProjectName] = useState('');
  const [editStatus, setEditStatus] = useState<"선정" | "완료" | "포기" | "제외">('선정');
  const [editSelectedAmount, setEditSelectedAmount] = useState('');
  const [editSupportAmount, setEditSupportAmount] = useState('');
  const [editNotes, setEditNotes] = useState('');
  
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editBusinessNumber, setEditBusinessNumber] = useState('');
  const [editAddress, setEditAddress] = useState('');     // 전체 주소 (입력용)
  const [editLocation, setEditLocation] = useState('');   // 시/군 (자동 추출, readonly)
  const [editSupportField, setEditSupportField] = useState('');
  const [editMainProducts, setEditMainProducts] = useState('');

  /** 주소 문자열에서 시/군 토큰을 추출합니다.
   *  예) "경기도 성남시 분당구 판교로 1" → "성남시"
   *      "경기도 양평군 양평읍" → "양평군"
   *      "서울특별시 강남구 ..." → "서울특별시" (시/군 없을 때 첫 번째 시 fallback)
   */
  const extractSiGun = (address: string): string => {
    if (!address.trim()) return '';
    const tokens = address.trim().split(/\s+/);
    // 광역·특별시 등 시도 단위는 건너뜁니다
    const sidoSuffixes = ['특별시', '광역시', '특별자치시', '특별자치도'];
    for (const token of tokens) {
      const isSido = sidoSuffixes.some((s) => token.endsWith(s));
      if (!isSido && (token.endsWith('시') || token.endsWith('군'))) {
        return token;
      }
    }
    // fallback: 특별시/광역시 자체를 반환
    for (const token of tokens) {
      if (token.endsWith('시') || token.endsWith('군')) return token;
    }
    return tokens[0] || '';
  };

  /** 주소 입력이 바뀔 때마다 소재지를 자동 계산합니다. */
  const handleAddressChange = (address: string) => {
    setEditAddress(address);
    setEditLocation(extractSiGun(address));
  };

    // State for support histories of the selected company
    const [histories, setHistories] = useState<SupportHistory[]>(company?.histories ?? []);
    // State to control visibility of the add new entry form
    const [isAdding, setIsAdding] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteConfirmDouble, setShowDeleteConfirmDouble] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize edit fields when company changes
  useEffect(() => {
    if (company) {
      Promise.resolve().then(() => {
        setEditCompanyName(company.companyName);
        setEditBusinessNumber(company.businessNumber);
        setEditAddress(company.location);                     // 기존 주소를 그대로 주소 입력칸에
        setEditLocation(extractSiGun(company.location));      // 시/군만 추출하여 소재지(readonly)에 설정
        setEditSupportField(company.supportField);
        setEditMainProducts(company.mainProducts);
      });
    }
  }, [company]);
    // Sync histories when company prop changes
    useEffect(() => {
      if (company) {
        Promise.resolve().then(() => {
          setHistories(company.histories);
        });
      }
    }, [company]);
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !company || saving) return;
    setSaving(true);
    const updated = await companyService.updateSupportHistory(company.id, editingId, {
      year: editYear,
      programName: editProgramName,
      projectName: editProjectName,
      status: editStatus,
      selectedAmount: Number(editSelectedAmount) || 0,
      supportAmount: Number(editSupportAmount) || 0,
      notes: editNotes || undefined,
    });
    setSaving(false);
    if (updated) {
      setHistories(updated.histories);
      setEditingId(null);
    }
  };

  const startEdit = (h: SupportHistory) => {
    setEditingId(h.id);
    setEditYear(h.year);
    setEditProgramName(h.programName);
    setEditProjectName(h.projectName || '');
    setEditStatus(h.status as "선정" | "완료" | "포기" | "제외");
    setEditSelectedAmount(h.selectedAmount.toString());
    setEditSupportAmount(h.supportAmount.toString());
    setEditNotes(h.notes || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteFirst = () => {
    setShowDeleteConfirm(false);
    setShowDeleteConfirmDouble(true);
  };

  const confirmDeleteFinal = async () => {
    if (company) {
      await companyService.deleteCompany(company.id);
      setShowDeleteConfirmDouble(false);
      onClose();
    }
  };

  const [year, setYear] = useState('');
  // Set default year client‑side to avoid SSR mismatch
  useEffect(() => {
    Promise.resolve().then(() => {
      setYear(new Date().getFullYear().toString());
    });
  }, []);
  const [programName, setProgramName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [status, setStatus] = useState<"선정" | "완료" | "포기" | "제외">("선정");
  const [selectedAmount, setSelectedAmount] = useState("");
  const [supportAmount, setSupportAmount] = useState("");
  const [notes, setNotes] = useState("");

  if (!company) return null;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programName || saving) return;
    setSaving(true);

    const updatedCo = await companyService.addSupportHistory(company.id, {
      year,
      programName,
      projectName,
      status,
      selectedAmount: Number(selectedAmount) || 0,
      supportAmount: Number(supportAmount) || 0,
      notes: notes || undefined,
    });

    setSaving(false);

    if (updatedCo) {
      setHistories(updatedCo.histories);
    }
    
    // Reset form
    setYear(new Date().getFullYear().toString());
    setProgramName("");
    setProjectName("");
    setSelectedAmount("");
    setSupportAmount("");
    setNotes("");
    setIsAdding(false);
  };

  const handleRemove = async (id: string) => {
    if (!company || saving) return;
    setSaving(true);
    const updatedCo = await companyService.removeSupportHistory(company.id, id);
    setSaving(false);
    if (updatedCo) {
      setHistories(updatedCo.histories);
      setEditingId(null);
    }
  };

  const validTotalAmount = histories
    .filter((h) => h.status !== "포기" && h.status !== "제외")
    .reduce((sum, h) => sum + h.supportAmount, 0);

  return (
    <div className="fixed top-16 bottom-0 right-0 left-64 bg-black/40 backdrop-blur-sm z-50 flex justify-end transition-opacity">
      <div className="bg-white w-[80%] h-full shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl text-[var(--color-gbsa-primary)] flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--color-gbsa-primary)] leading-tight">기업 지원 이력 관리</h2>
              <p className="text-xs text-gray-400 mt-0.5 font-medium">선택된 기업의 정보 수정 및 지원 수혜 이력을 통합 관리합니다.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-auto p-8 flex flex-col">

          {/* Company Edit Section — same pattern as 신규 이력 추가 */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 flex-wrap">
                {(() => {
                  const hasRecentDrop = company?.histories?.some(
                    h => Number(h.year) >= new Date().getFullYear() - 1 && (h.status === "포기" || h.status === "제외")
                  );
                  return (
                    <h4 className={`font-bold text-lg ${hasRecentDrop ? "text-red-600" : "text-gray-800"}`}>
                      {company?.companyName}
                    </h4>
                  );
                })()}
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded-full border border-blue-100/80 font-mono flex items-center gap-1">
                    <svg className="w-3 h-3 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <BusinessNumber value={company?.businessNumber || ''} />
                  </span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded-full border border-slate-200 flex items-center gap-1">
                    <svg className="w-3 h-3 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {extractSiGun(company?.location || '')}
                  </span>
                  {company?.mainProducts && (
                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-semibold rounded-full border border-purple-100 flex items-center gap-1">
                      <svg className="w-3 h-3 text-purple-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                      {company.mainProducts}
                    </span>
                  )}
                  {company?.supportField && (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-semibold rounded-full border border-emerald-100 flex items-center gap-1">
                      <svg className="w-3 h-3 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      {company.supportField}
                    </span>
                  )}
                  {company?.histories && company.histories.length > 0 && (() => {
                    const h = company.histories[company.histories.length - 1];
                    return (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-semibold rounded-full border border-amber-100 flex items-center gap-1 whitespace-nowrap">
                        <svg className="w-3 h-3 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                        {h.year} {h.programName}{h.projectName ? ` (${h.projectName})` : ""}
                      </span>
                    );
                  })()}
                  {company?.histories?.filter(
                    h => Number(h.year) >= new Date().getFullYear() - 1 && (h.status === "포기" || h.status === "제외")
                  ).slice(0, 1).map((h) => (
                    <span key={h.id} className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-semibold rounded-full border border-red-200 flex items-center gap-1 whitespace-nowrap">
                      <svg className="w-3 h-3 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      {h.year} {h.programName}{h.projectName ? ` (${h.projectName})` : ""} {h.status}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                {!isEditingCompany && (
                  <button
                    onClick={() => setIsEditingCompany(true)}
                    className="text-sm bg-white border border-gray-200 px-3 py-1.5 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                  >
                    + 기업정보 수정
                  </button>
                )}
              </div>
            </div>

            {isEditingCompany && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (saving) return;
                  setSaving(true);
                  const updated = await companyService.updateCompany(company.id, {
                    companyName: editCompanyName,
                    businessNumber: editBusinessNumber,
                    location: editAddress,
                    supportField: editSupportField,
                    mainProducts: editMainProducts,
                  });
                  setSaving(false);
                  if (updated) {
                    setIsEditingCompany(false);
                    onClose();
                  }
                }}
                className="mt-4 grid grid-cols-3 gap-4"
              >
                {/* ── 1행: 기업명 | 사업자등록번호 | 대표자 | 소재지 ── */}
                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1">기업명</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    </span>
                    <input type="text" value={editCompanyName} onChange={(e) => setEditCompanyName(e.target.value)} required className="w-full pl-10 pr-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none" />
                  </div>
                </div>
                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1">사업자등록번호</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </span>
                    <input
                      type="text"
                      value={formatBusinessNumber(editBusinessNumber)}
                      readOnly
                      className={`w-full pl-10 pr-3 py-2 text-sm font-mono rounded-lg border border-gray-300 outline-none bg-gray-100 cursor-not-allowed ${
                        editBusinessNumber.replace(/\D/g, '').length !== 10 ? 'text-red-500 font-semibold' : 'text-gray-700'
                      }`}
                    />
                  </div>
                </div>
                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1">
                    소재지
                    <span className="ml-1 text-[10px] font-normal text-blue-400">(자동 추출)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </span>
                    <input type="text" value={editLocation} readOnly className="w-full pl-10 pr-3 py-2 text-sm rounded-lg border border-gray-300 outline-none bg-gray-100 cursor-not-allowed text-gray-500" />
                  </div>
                </div>

                {/* ── 2행: 주소 (전체 한 줄) ── */}
                <div className="col-span-4 relative">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1">주소</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                    </span>
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => handleAddressChange(e.target.value)}
                      placeholder="예: 경기도 성남시 분당구 판교로 1"
                      className="w-full pl-10 pr-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none"
                    />
                  </div>
                </div>

                {/* ── 3행: 주요제품 | 주요사업 (전체 한 줄) ── */}
                <div className="col-span-2 relative">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1">주요 제품</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    </span>
                    <input type="text" value={editMainProducts} onChange={(e) => setEditMainProducts(e.target.value)} className="w-full pl-10 pr-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none" />
                  </div>
                </div>
                <div className="col-span-2 relative">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1">주요 사업(지원분야)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </span>
                    <input type="text" value={editSupportField} onChange={(e) => setEditSupportField(e.target.value)} className="w-full pl-10 pr-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none" />
                  </div>
                </div>

                {/* ── 4행: 버튼 (전체 한 줄) ── */}
                <div className="col-span-4 flex justify-between items-center pt-1">
                  <div>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="px-4 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-semibold rounded-lg transition-colors"
                    >
                      기업 삭제
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setIsEditingCompany(false)} className="px-6 py-2 text-sm bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors">취소</button>
                    <button type="submit" disabled={saving} className="px-6 py-2 text-sm bg-[var(--color-gbsa-primary)] text-white font-medium rounded-lg hover:bg-[var(--color-gbsa-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">저장</button>
                  </div>
                </div>
              </form>
            )}
          </div>


          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-gray-800">등록된 지원 이력</h3>
              {!isAdding && (
                <button onClick={() => setIsAdding(true)} className="text-xs bg-[var(--color-gbsa-primary)] text-white px-3 py-1.5 rounded-lg font-medium hover:bg-[var(--color-gbsa-secondary)] transition-colors flex items-center gap-1 shadow-sm">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  신규 이력
                </button>
              )}
            </div>
            <div className="text-sm text-gray-700">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--color-gbsa-primary)] text-white text-lg font-bold"><span className="text-xs font-normal mr-1.5 opacity-80">지원금총액</span><span className="font-mono">{validTotalAmount.toLocaleString()}</span><span className="font-sans ml-0.5">원</span></span>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-6 bg-white shrink-0">
            <table className="w-full table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[72px]" />
                <col />
                <col className="w-[88px]" />
                <col className="w-[120px]" />
                <col className="w-[120px]" />
                <col className="w-[88px]" />
              </colgroup>
              <thead className="bg-[#F1F5F9] text-gray-600 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4 font-semibold text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      년도
                    </div>
                  </th>
                  <th className="py-3 px-4 font-semibold text-left whitespace-nowrap">
                    <div className="flex items-center justify-start gap-1.5">
                      <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      지원사업명
                    </div>
                  </th>
                  <th className="py-3 px-4 font-semibold text-center w-24 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      상태
                    </div>
                  </th>
                  <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      선정금액
                    </div>
                  </th>
                  <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                      지원금액
                    </div>
                  </th>
                  <th className="py-3 px-4 font-semibold text-center w-24 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      수정
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {isAdding && (
                  <tr className="bg-green-50/20 border-y border-green-100">
                    <td></td>
                    <td colSpan={5} className="p-4 pl-0">
                      <form onSubmit={(e) => { e.preventDefault(); handleAddSubmit(e); }} className="space-y-4 w-full bg-white p-5 rounded-xl border border-green-200 shadow-sm animate-fade-in text-left">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                            <h5 className="text-xs font-bold text-gray-800">신규 이력 등록</h5>
                          </div>
                          <button type="button" onClick={() => { setIsAdding(false); setProgramName(""); setProjectName(""); setSelectedAmount(""); setSupportAmount(""); setNotes(""); }} className="text-xs text-gray-400 hover:text-gray-600">닫기 ✕</button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-24 gap-4">
                          <div className="col-span-1 md:col-span-2">
                            <label className="block text-[11px] font-semibold text-gray-500 mb-1 flex items-center gap-1">
                              <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              년도
                            </label>
                            <input type="text" value={year} onChange={(e) => setYear(e.target.value)} required className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none bg-white" />
                          </div>
                          <div className="col-span-1 md:col-span-7">
                            <label className="block text-[11px] font-semibold text-gray-500 mb-1 flex items-center gap-1">
                              <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                              지원사업명
                            </label>
                            <input type="text" value={programName} onChange={(e) => setProgramName(e.target.value)} required placeholder="예: 2024 창업도약패키지" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none bg-white" />
                          </div>
                          <div className="col-span-1 md:col-span-7">
                            <label className="block text-[11px] font-semibold text-gray-500 mb-1 flex items-center gap-1">
                              <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                              지원과제명
                            </label>
                            <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="미지정 시 비워둠" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none bg-white" />
                          </div>
                          <div className="col-span-1 md:col-span-2">
                            <label className="block text-[11px] font-semibold text-gray-500 mb-1 flex items-center gap-1">
                              <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              상태
                            </label>
                            <select value={status} onChange={(e) => setStatus(e.target.value as "선정" | "완료" | "포기" | "제외")} className="w-full h-[38px] px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none bg-white">
                              <option value="선정">선정</option>
                              <option value="완료">완료</option>
                              <option value="포기">포기</option>
                              <option value="제외">제외</option>
                            </select>
                          </div>
                          <div className="col-span-1 md:col-span-3">
                            <label className="block text-[11px] font-semibold text-gray-500 mb-1 flex items-center gap-1">
                              <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              선정금액(원)
                            </label>
                            <input type="text" value={formatNumberWithCommas(selectedAmount)} onChange={handleAmountChange(setSelectedAmount)} required placeholder="0" className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none text-right bg-white" />
                          </div>
                          <div className="col-span-1 md:col-span-3">
                            <label className="block text-[11px] font-semibold text-gray-500 mb-1 flex items-center gap-1">
                              <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              지원금액(원)
                            </label>
                            <input type="text" value={formatNumberWithCommas(supportAmount)} onChange={handleAmountChange(setSupportAmount)} required placeholder="0" className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none text-right bg-white" />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-24 gap-4 items-end">
                          <div className="col-span-1 md:col-span-18">
                            <label className="block text-[11px] font-semibold text-gray-500 mb-1 flex items-center gap-1">
                              <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              비고
                            </label>
                            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="추가 메모 입력" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none bg-white" />
                          </div>
                          <div className="col-span-1 md:col-span-6 flex gap-2">
                            <button type="button" onClick={() => { setIsAdding(false); setProgramName(""); setProjectName(""); setSelectedAmount(""); setSupportAmount(""); setNotes(""); }} className="w-full py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg border transition-colors">취소</button>
                            <button type="submit" disabled={saving} className="w-full py-2 text-sm bg-[var(--color-gbsa-primary)] hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-sm transition-colors">저장</button>
                          </div>
                        </div>
                      </form>
                    </td>
                  </tr>
                )}
                {histories.length > 0 ? histories.map((history) => {
                  const isForfeited = history.status === "포기";
                  const isExcluded = history.status === "제외";
                  const isEditing = editingId === history.id;
                  const rowStyle = isForfeited ? "bg-red-50/60 text-red-400" : isExcluded ? "bg-red-50/60 text-orange-400" : isEditing ? "bg-blue-50/40" : "hover:bg-blue-50/20";
                  const textStyle = isForfeited ? "text-red-400" : isExcluded ? "text-orange-400" : "text-gray-800 font-semibold";
                  
                  return (
                    <Fragment key={history.id}>
                      <tr className={`transition-colors ${rowStyle}`}>
                        <td className="py-3.5 px-4 font-mono">{history.year}</td>
                        <td className="py-3.5 px-4 font-medium">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={textStyle}>
                              {history.programName}
                              {history.projectName ? `(${history.projectName})` : ""}
                            </span>
                          </div>
                          {history.notes && (
                            <div className="text-xs text-orange-500 mt-0.5 font-normal">
                              비고: {history.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-md ${
                            history.status === "선정" ? "bg-blue-100 text-blue-700" :
                            history.status === "완료" ? "bg-green-100 text-green-700" :
                            history.status === "포기" ? "bg-red-100 text-red-700" :
                            "bg-orange-100 text-orange-700"
                          }`}>
                            {history.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono">
                          {history.selectedAmount.toLocaleString()}원
                        </td>
                        <td className={`py-3.5 px-4 text-right font-bold font-mono ${isForfeited || isExcluded ? "line-through text-gray-400" : "text-[var(--color-gbsa-primary)]"}`}>
                          {history.supportAmount.toLocaleString()}원
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button onClick={() => startEdit(history)} className={`transition-colors ${isEditing ? "text-[var(--color-gbsa-primary)]" : "text-gray-400 hover:text-[var(--color-gbsa-primary)]"}`}>
                            <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                        </td>
                      </tr>
                      {isEditing && (
                        <tr className="bg-blue-50/20 border-y border-blue-100">
                          <td></td>
                    <td colSpan={5} className="p-4 pl-0">
                      <form onSubmit={handleEditSubmit} className="space-y-4 w-full bg-white p-5 rounded-xl border border-blue-100 shadow-sm animate-fade-in text-left">
                              <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-gbsa-primary)] animate-pulse"></span>
                                  <h5 className="text-xs font-bold text-gray-800">이력 항목 편집</h5>
                                </div>
                                <button type="button" onClick={() => handleRemove(editingId!)} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1" title="삭제">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  삭제
                                </button>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-24 gap-4">
                                <div className="col-span-1 md:col-span-2">
                                  <label className="block text-[11px] font-semibold text-gray-500 mb-1 flex items-center gap-1">
                                    <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    년도
                                  </label>
                                  <input type="text" value={editYear} onChange={(e) => setEditYear(e.target.value)} required className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none bg-white" />
                                </div>
                                <div className="col-span-1 md:col-span-7">
                                  <label className="block text-[11px] font-semibold text-gray-500 mb-1 flex items-center gap-1">
                                    <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                    지원사업명
                                  </label>
                                  <input type="text" value={editProgramName} onChange={(e) => setEditProgramName(e.target.value)} required className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none bg-white" />
                                </div>
                                <div className="col-span-1 md:col-span-7">
                                  <label className="block text-[11px] font-semibold text-gray-500 mb-1 flex items-center gap-1">
                                    <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                    지원과제명
                                  </label>
                                  <input type="text" value={editProjectName} onChange={(e) => setEditProjectName(e.target.value)} placeholder="미지정 시 비워둠" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none bg-white" />
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                  <label className="block text-[11px] font-semibold text-gray-500 mb-1 flex items-center gap-1">
                                    <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    상태
                                  </label>
                                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as any)} className="w-full h-[38px] px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none bg-white">
                                    <option value="선정">선정</option>
                                    <option value="완료">완료</option>
                                    <option value="포기">포기</option>
                                    <option value="제외">제외</option>
                                  </select>
                                </div>
                                <div className="col-span-1 md:col-span-3">
                                  <label className="block text-[11px] font-semibold text-gray-500 mb-1 flex items-center gap-1">
                                    <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    선정금액(원)
                                  </label>
                                  <input type="text" value={formatNumberWithCommas(editSelectedAmount)} onChange={handleAmountChange(setEditSelectedAmount)} required className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none text-right bg-white" />
                                </div>
                                <div className="col-span-1 md:col-span-3">
                                  <label className="block text-[11px] font-semibold text-gray-500 mb-1 flex items-center gap-1">
                                    <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    지원금액(원)
                                  </label>
                                  <input type="text" value={formatNumberWithCommas(editSupportAmount)} onChange={handleAmountChange(setEditSupportAmount)} required className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none text-right bg-white" />
                                </div>
                              </div>
                              
                              <div className="flex items-end gap-3">
                                <div className="flex-1 min-w-0">
                                  <label className="block text-[11px] font-semibold text-gray-500 mb-1 flex items-center gap-1">
                                    <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    비고
                                  </label>
                                  <input type="text" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="추가 메모 입력" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none bg-white" />
                                </div>
                                <div className="flex gap-2">
                                  <button type="button" onClick={cancelEdit} className="px-2 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg border transition-colors flex items-center justify-center gap-1 w-[62px]">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    취소
                                  </button>
                                  <button type="submit" disabled={saving} className="px-2 py-2 text-sm bg-[var(--color-gbsa-primary)] hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1 w-[62px]">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    저장
                                  </button>
                                </div>
                              </div>
                            </form>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                }) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">등록된 이력이 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Custom Delete Warning Confirmation Modal Popup */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 pt-20 animate-fade-in">
          <div className="bg-white rounded-2xl border-2 border-red-500 max-w-md w-full p-6 shadow-2xl space-y-5 text-left transform scale-100 transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <svg className="w-6 h-6 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-red-600">위험: 기업 데이터 영구 삭제</h3>
                <p className="text-sm text-gray-500 font-semibold">사용자의 강력한 주의가 필요한 작업입니다.</p>
              </div>
            </div>

            <div className="bg-red-50/50 rounded-xl p-4 border border-red-100 space-y-2.5">
              <p className="text-xs text-red-700 font-semibold leading-relaxed">
                해당 기업을 삭제하시면 다음의 연관된 데이터베이스 항목들이 <strong className="underline">즉각 영구 삭제</strong>되며, 어떠한 경우에도 복구할 수 없습니다:
              </p>
              <ul className="text-xs text-gray-600 space-y-1.5 list-disc pl-4 font-medium">
                <li>
                  기업 마스터 프로필 정보 (<span className="font-semibold text-gray-800">{company.companyName}</span>)
                </li>
                <li>
                  등록된 과거 수혜/지원 이력 데이터 (<strong className="text-red-600 font-mono">{histories.length}건</strong>)
                </li>
                <li>
                  해당 기업과 연관된 모든 중복 수혜 분석 및 검증 이력
                </li>
              </ul>
            </div>

            <p className="text-xs text-gray-400 text-center font-medium">
              정말로 이 기업 정보와 모든 과거 이력을 데이터베이스에서 삭제하시겠습니까?
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="w-1/2 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg border transition-colors text-sm text-center"
              >
                취소 (보존)
              </button>
              <button
                type="button"
                onClick={confirmDeleteFirst}
                className="w-1/2 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all text-sm text-center"
              >
                확인 (영구 삭제)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2nd Double Confirmation Warning Modal Popup */}
      {showDeleteConfirmDouble && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4 pt-20 animate-fade-in">
          <div className="bg-white rounded-2xl border-4 border-red-600 max-w-sm w-full p-6 shadow-2xl space-y-6 text-center transform scale-100 transition-all duration-300">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 mx-auto animate-pulse">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-red-700">🚨 최종 경고: 복구 불가 안내</h3>
              <p className="text-xs font-semibold text-gray-500">이 작업은 실행한 이후 절대로 취소할 수 없습니다.</p>
            </div>

            <div className="text-xs text-red-600 font-semibold bg-red-50 p-3 rounded-lg border border-red-100 leading-relaxed text-left">
              해당 기업의 사업자번호 정보 및 모든 누적 지원 이력이 시스템에서 영구적으로 흔적 없이 즉시 제거됩니다. 정말로 최종 삭제를 실행하시겠습니까?
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmDouble(false)}
                className="w-1/2 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg border transition-colors text-sm text-center"
              >
                돌아가기 (보존)
              </button>
              <button
                type="button"
                onClick={confirmDeleteFinal}
                className="w-1/2 py-2.5 bg-red-700 hover:bg-red-800 text-white font-extrabold rounded-lg shadow-md hover:shadow-lg transition-all text-sm text-center animate-pulse"
              >
                최종 영구 삭제 실행
              </button>
            </div>
          </div>
        </div>
      )}

      <LoadingOverlay show={saving} />
    </div>
  );
}
