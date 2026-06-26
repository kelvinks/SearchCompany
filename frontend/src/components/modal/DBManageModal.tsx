"use client";

import { Company, SupportHistory } from "@/data/mockData";
import { useState, useEffect } from "react";
import { companyService } from "@/services/companyService";
import { formatBusinessNumber } from "@/utils/format";
import BusinessNumber from "@/components/BusinessNumber";



  // State to control visibility of the add new entry form


interface DBManageModalProps {
  company: Company | null;
  onClose: () => void;
}

export default function DBManageModal({ company, onClose }: DBManageModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editYear, setEditYear] = useState('');
  const [editProgramName, setEditProgramName] = useState('');
  const [editStatus, setEditStatus] = useState<"완료" | "포기" | "제외" | "진행중">('완료');
  const [editSelectedAmount, setEditSelectedAmount] = useState('');
  const [editSupportAmount, setEditSupportAmount] = useState('');
  const [editNotes, setEditNotes] = useState('');
  
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editBusinessNumber, setEditBusinessNumber] = useState('');
  const [editRepresentative, setEditRepresentative] = useState('');
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

  // Initialize edit fields when company changes
  useEffect(() => {
    if (company) {
      Promise.resolve().then(() => {
        setEditCompanyName(company.companyName);
        setEditBusinessNumber(company.businessNumber);
        setEditRepresentative(company.representative || '');
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
    if (!editingId || !company) return;
    const updated = await companyService.updateSupportHistory(company.id, editingId, {
      year: editYear,
      programName: editProgramName,
      status: editStatus,
      selectedAmount: Number(editSelectedAmount) || 0,
      supportAmount: Number(editSupportAmount) || 0,
      notes: editNotes || undefined,
    });
    if (updated) {
      setHistories(updated.histories);
      setEditingId(null);
    }
  };

  const startEdit = (h: SupportHistory) => {
    setEditingId(h.id);
    setEditYear(h.year);
    setEditProgramName(h.programName);
    setEditStatus(h.status as "완료" | "포기" | "제외" | "진행중");
    setEditSelectedAmount(h.selectedAmount.toString());
    setEditSupportAmount(h.supportAmount.toString());
    setEditNotes(h.notes || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleDelete = async () => {
    if (company && confirm('정말 기업 정보를 삭제하시겠습니까?')) {
      await companyService.deleteCompany(company.id);
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
  const [status, setStatus] = useState<"완료" | "포기" | "제외" | "진행중">("완료");
  const [selectedAmount, setSelectedAmount] = useState("");
  const [supportAmount, setSupportAmount] = useState("");
  const [notes, setNotes] = useState("");

  if (!company) return null;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programName) return;

    const updatedCo = await companyService.addSupportHistory(company.id, {
      year,
      programName,
      status,
      selectedAmount: Number(selectedAmount) || 0,
      supportAmount: Number(supportAmount) || 0,
      notes: notes || undefined,
    });

    if (updatedCo) {
      setHistories(updatedCo.histories);
    }
    
    // Reset form
    setProgramName("");
    setSelectedAmount("");
    setSupportAmount("");
    setNotes("");
    setIsAdding(false);
  };

  const handleRemove = async (id: string) => {
    const updatedCo = await companyService.removeSupportHistory(company.id, id);
    if (updatedCo) {
      setHistories(updatedCo.histories);
    }
  };

  const validTotalAmount = histories
    .filter((h) => h.status !== "포기" && h.status !== "제외")
    .reduce((sum, h) => sum + h.supportAmount, 0);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity p-4">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] shadow-2xl flex flex-col rounded-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-gbsa-primary)]">기업 지원 이력 관리</h2>
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
              <h4 className="font-bold text-gray-800 text-lg">
                {company?.companyName} (<BusinessNumber value={company?.businessNumber || ''} />, {extractSiGun(company?.location || '')})
              </h4>
              <div className="flex gap-2">
                {!isEditingCompany && (
                  <button
                    onClick={() => setIsEditingCompany(true)}
                    className="text-sm bg-white border border-gray-200 px-3 py-1.5 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                  >
                    + 수정창 열기
                  </button>
                )}
                {isEditingCompany && (
                  <button
                    onClick={handleDelete}
                    className="text-sm bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg font-medium hover:bg-red-100 transition-colors"
                  >
                    기업 삭제
                  </button>
                )}
              </div>
            </div>

            {isEditingCompany && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const updated = await companyService.updateCompany(company.id, {
                    companyName: editCompanyName,
                    businessNumber: editBusinessNumber,
                    representative: editRepresentative,
                    location: editLocation,
                    supportField: editSupportField,
                    mainProducts: editMainProducts,
                  });
                  if (updated) {
                    setIsEditingCompany(false);
                    onClose();
                  }
                }}
                className="mt-4 grid grid-cols-4 gap-4"
              >
                {/* ── 1행: 기업명 | 사업자등록번호 | 대표자 | 소재지 ── */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1">기업명</label>
                  <input type="text" value={editCompanyName} onChange={(e) => setEditCompanyName(e.target.value)} required className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1">사업자등록번호</label>
                  <input
                    type="text"
                    value={formatBusinessNumber(editBusinessNumber)}
                    readOnly
                    className={`w-full px-3 py-2 text-sm font-mono rounded-lg border border-gray-300 outline-none bg-gray-100 cursor-not-allowed ${
                      editBusinessNumber.replace(/\D/g, '').length !== 11 ? 'text-red-500 font-semibold' : 'text-gray-700'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1">대표자</label>
                  <input type="text" value={editRepresentative} onChange={(e) => setEditRepresentative(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1">
                    소재지
                    <span className="ml-1 text-[10px] font-normal text-blue-400">(자동 추출)</span>
                  </label>
                  <input type="text" value={editLocation} readOnly className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 outline-none bg-gray-100 cursor-not-allowed text-gray-500" />
                </div>

                {/* ── 2행: 주소 (전체 한 줄) ── */}
                <div className="col-span-4">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1">주소</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => handleAddressChange(e.target.value)}
                    placeholder="예: 경기도 성남시 분당구 판교로 1"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none"
                  />
                </div>

                {/* ── 3행: 주요제품 | 주요사업 (전체 한 줄) ── */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1">주요 제품</label>
                  <input type="text" value={editMainProducts} onChange={(e) => setEditMainProducts(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1">주요 사업(지원분야)</label>
                  <input type="text" value={editSupportField} onChange={(e) => setEditSupportField(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none" />
                </div>

                {/* ── 4행: 버튼 (전체 한 줄) ── */}
                <div className="col-span-4 flex justify-end gap-3 pt-1">
                  <button type="button" onClick={() => setIsEditingCompany(false)} className="px-6 py-2 text-sm bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors">취소</button>
                  <button type="submit" className="px-6 py-2 text-sm bg-[var(--color-gbsa-primary)] text-white font-medium rounded-lg hover:bg-[var(--color-gbsa-secondary)] transition-colors">저장</button>
                </div>
              </form>
            )}
          </div>


          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">등록된 지원 이력</h3>
            <div className="text-sm bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
              유효 총 지원금액: <span className="text-lg font-bold text-[var(--color-gbsa-primary)] ml-1">{validTotalAmount.toLocaleString()}원</span>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-6 flex-1 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F1F5F9] text-gray-600 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4 font-medium">년도</th>
                  <th className="py-3 px-4 font-medium">지원사업명</th>
                  <th className="py-3 px-4 font-medium text-center">상태</th>
                  <th className="py-3 px-4 font-medium text-right">선정금액</th>
                  <th className="py-3 px-4 font-medium text-right">지원금액</th>
                  <th className="py-3 px-4 font-medium">비고</th>
                  <th className="py-3 px-4 font-medium text-center">수정</th>
                  <th className="py-3 px-4 font-medium text-center">삭제</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {histories.length > 0 ? histories.map((history) => {
                  const isDisabled = history.status === "포기" || history.status === "제외";
                  return (
                    <tr key={history.id} className={`transition-colors ${isDisabled ? "bg-gray-50" : "hover:bg-blue-50/30"}`}>
                      <td className={`py-4 px-4 ${isDisabled ? "text-gray-400" : "text-gray-700"}`}>{history.year}</td>
                      <td className={`py-4 px-4 font-medium ${isDisabled ? "text-gray-400" : "text-gray-900"}`}>{history.programName}</td>
                      <td className="py-4 px-4 text-center">
                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                          history.status === "완료" ? "bg-green-100 text-green-700" :
                          history.status === "진행중" ? "bg-blue-100 text-blue-700" :
                          history.status === "포기" ? "bg-orange-100 text-orange-700" :
                          "bg-gray-200 text-gray-600"
                        }`}>
                          {history.status}
                        </span>
                      </td>
                      <td className={`py-4 px-4 text-right ${isDisabled ? "text-gray-400" : "text-gray-700"}`}>{history.selectedAmount.toLocaleString()}원</td>
                      <td className={`py-4 px-4 text-right font-bold ${isDisabled ? "text-gray-400 line-through" : "text-[var(--color-gbsa-primary)]"}`}>{history.supportAmount.toLocaleString()}원</td>
                      <td className={`py-4 px-4 ${isDisabled ? "text-gray-400" : "text-gray-600"}`}>{history.notes || "-"}</td>
                      <td className="py-4 px-4 text-center">
                        <button onClick={() => startEdit(history)} className="text-gray-400 hover:text-[var(--color-gbsa-primary)] transition-colors">
                          <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button onClick={() => handleRemove(history.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-500">등록된 이력이 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Edit Existing Entry Form */}
          {editingId && (
            <form onSubmit={handleEditSubmit} className="grid grid-cols-6 gap-4 items-end mt-4">
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1">년도</label>
                <input type="text" value={editYear} onChange={(e) => setEditYear(e.target.value)} required className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1">지원사업명</label>
                <input type="text" value={editProgramName} onChange={(e) => setEditProgramName(e.target.value)} required placeholder="예: 2024 창업도약패키지" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1">상태</label>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as "완료" | "포기" | "제외" | "진행중")} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none bg-white">
                  <option value="완료">완료</option>
                  <option value="진행중">진행중</option>
                  <option value="포기">포기</option>
                  <option value="제외">제외</option>
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1">선정금액(원)</label>
                <input type="number" value={editSelectedAmount} onChange={(e) => setEditSelectedAmount(e.target.value)} required placeholder="0" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none text-right" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1">지원금액(원)</label>
                <input type="number" value={editSupportAmount} onChange={(e) => setEditSupportAmount(e.target.value)} required placeholder="0" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none text-right" />
              </div>
              <div className="col-span-5">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1">비고</label>
                <input type="text" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="추가 메모 입력" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none" />
              </div>
              <div className="col-span-1 flex gap-2">
                <button type="button" onClick={cancelEdit} className="w-full py-2 text-sm bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors">취소</button>
                <button type="submit" className="w-full py-2 text-sm bg-[var(--color-gbsa-primary)] text-white font-medium rounded-lg hover:bg-[var(--color-gbsa-secondary)] transition-colors">저장</button>
              </div>
            </form>
          )}


          {/* Add New Entry Form */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mt-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-gray-800">신규 이력 추가</h4>
              {!isAdding && (
                <button onClick={() => setIsAdding(true)} className="text-sm bg-white border border-gray-200 px-3 py-1.5 rounded-lg font-medium hover:bg-gray-100 transition-colors">
                  + 입력창 열기
                </button>
              )}
            </div>

            {isAdding && (
              <form onSubmit={handleAddSubmit} className="grid grid-cols-6 gap-4 items-end">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1">년도</label>
                  <input type="text" value={year} onChange={(e) => setYear(e.target.value)} required className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1">지원사업명</label>
                  <input type="text" value={programName} onChange={(e) => setProgramName(e.target.value)} required placeholder="예: 2024 창업도약패키지" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none" />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1">상태</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as "완료" | "포기" | "제외" | "진행중")} className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none bg-white">
                    <option value="완료">완료</option>
                    <option value="진행중">진행중</option>
                    <option value="포기">포기</option>
                    <option value="제외">제외</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1">선정금액(원)</label>
                  <input type="number" value={selectedAmount} onChange={(e) => setSelectedAmount(e.target.value)} required placeholder="0" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none text-right" />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1">지원금액(원)</label>
                  <input type="number" value={supportAmount} onChange={(e) => setSupportAmount(e.target.value)} required placeholder="0" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none text-right" />
                </div>
                <div className="col-span-5">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1">비고</label>
                  <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="추가 메모 입력" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-1 focus:ring-[var(--color-gbsa-primary)] outline-none" />
                </div>
                <div className="col-span-1 flex gap-2">
                  <button type="button" onClick={() => setIsAdding(false)} className="w-full py-2 text-sm bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors">
                    취소
                  </button>
                  <button type="submit" className="w-full py-2 text-sm bg-[var(--color-gbsa-primary)] text-white font-medium rounded-lg hover:bg-[var(--color-gbsa-secondary)] transition-colors">
                    저장
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
