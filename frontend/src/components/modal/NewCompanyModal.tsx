"use client";

import { useState, useRef, useEffect } from "react";
import { Company } from "@/data/mockData";
import { excelService } from "@/services/excelService";

interface NewCompanyModalProps {
  onClose: () => void;
  onAdd: (company: Company | Company[]) => void;
}

export default function NewCompanyModal({ onClose, onAdd }: NewCompanyModalProps) {
  const [activeTab, setActiveTab] = useState<"SINGLE" | "BULK">("SINGLE");

  // Single Registration State
  const [companyName, setCompanyName] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState("");
  const [supportField, setSupportField] = useState("");
  const [mainProducts, setMainProducts] = useState("");
  // location will be derived from address (city or county)
  const extractLocation = (addr: string) => {
    const parts = addr.trim().split(/\s+/);
    // Find the first part ending with 시 or 군
    const match = parts.find(p => /시$/.test(p) || /군$/.test(p));
    return match || "";
  };
  useEffect(() => {
    const loc = extractLocation(address);
    Promise.resolve().then(() => {
      setLocation(loc);
    });
  }, [address]);

  // Bulk Registration State
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !businessNumber) return;

    const newCompany: Company = {
      id: `c-${Date.now()}`,
      companyName,
      businessNumber,
      location,
      supportField,
      mainProducts,
      matchStatus: "NEW",
      matchScore: 0,
      histories: [],
    };

    onAdd(newCompany);
  };

  const handleBulkUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const parsedCandidates = await excelService.parseUploadFile(file);
      // Map to full Company array (fill histories as empty initially)
      const companiesToAdd = parsedCandidates.map((c) => ({
        ...c,
        matchStatus: "NEW" as const,
        matchScore: 0,
        histories: [],
      })) as Company[];
      
      onAdd(companiesToAdd);
    } catch (error) {
      console.error("Bulk upload parse error:", error);
      alert("엑셀 파일 파싱 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity p-4">
      <div className="bg-white w-full max-w-lg shadow-2xl flex flex-col rounded-2xl overflow-hidden animate-fade-in relative">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
          <h2 className="text-xl font-bold text-[var(--color-gbsa-primary)]">신규 기업 등록</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
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

        {/* Form Body */}
        <div className="p-6">
          {activeTab === "SINGLE" ? (
            <form id="newCompanyForm" onSubmit={handleSingleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">기업명 <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={companyName} 
                  onChange={(e) => setCompanyName(e.target.value)} 
                  required 
                  placeholder="예: (주)테스트기업" 
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:ring-2 focus:ring-blue-100 outline-none transition-all" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">사업자등록번호 <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={businessNumber} 
                  onChange={(e) => setBusinessNumber(e.target.value)} 
                  required 
                  placeholder="예: 123-45-67890" 
                  className={`w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:ring-2 focus:ring-blue-100 outline-none transition-all ${
                    businessNumber && businessNumber.replace(/\D/g, '').length !== 10 ? 'text-red-500 font-semibold border-red-300 focus:border-red-500 focus:ring-red-100' : ''
                  }`}
                />
                {businessNumber && businessNumber.replace(/\D/g, '').length !== 10 && (
                  <p className="text-xs text-red-500 mt-1 ml-1">사업자등록번호는 10자리 숫자여야 합니다.</p>
                )}
              </div>
              

              
              {/* Address input (full address) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">주소</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="예: 경기도 수원시 영통구 세무서로 123"
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
              {/* Hidden location derived from address */}
              <input type="hidden" value={location} />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">주요 사업(지원분야)</label>
                  <input 
                    type="text" 
                    value={supportField} 
                    onChange={(e) => setSupportField(e.target.value)} 
                    placeholder="예: SW 개발" 
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:ring-2 focus:ring-blue-100 outline-none transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">주요 제품</label>
                  <input 
                    type="text" 
                    value={mainProducts} 
                    onChange={(e) => setMainProducts(e.target.value)} 
                    placeholder="예: AI 솔루션" 
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:ring-2 focus:ring-blue-100 outline-none transition-all" 
                  />
                </div>
              </div>
            </form>
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
        {activeTab === "SINGLE" && (
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

        {/* Uploading Overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
            <div className="w-64">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[var(--color-gbsa-primary)] animate-progress-bar w-full origin-left"></div>
              </div>
              <p className="text-sm text-center mt-3 font-bold text-[var(--color-gbsa-primary)]">기업 데이터 일괄 등록 중...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
