"use client";

import { useState, useEffect, useRef } from "react";
import { Company, SupportHistory } from "@/data/mockData";
import HistoryModal from "@/components/modal/HistoryModal";
import { companyService } from "@/services/companyService";
import { formatBusinessNumber } from "@/utils/format";
import { matchingService } from "@/services/matchingService";
import { excelService } from "@/services/excelService";


export default function DashboardPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Single Search State
  const [singleSearchQuery, setSingleSearchQuery] = useState("");
  
  // Upload metadata form state
  const [reqOrg, setReqOrg] = useState("");
  const [reqDoc, setReqDoc] = useState("");
  const [reqDesc, setReqDesc] = useState("");
  
  const [totalHistoriesCount, setTotalHistoriesCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateTotalHistoriesCount = async () => {
    const db = await companyService.getCompanies();
    const total = db.reduce((acc, c) => acc + c.histories.length, 0);
    setTotalHistoriesCount(total);
  };

  // Initialize and load companies on mount to avoid hydration mismatch
  useEffect(() => {
    const loadData = async () => {
      const loaded = await companyService.getCompanies();
      setCompanies(loaded);
      const total = loaded.reduce((acc, c) => acc + c.histories.length, 0);
      setTotalHistoriesCount(total);
    };
    loadData();
  }, []);

  // Excel Upload Handler
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    setIsUploading(true);
    try {
      // 1. Parse Excel data
      const parsedCandidates = await excelService.parseUploadFile(file);

      // 2. Fetch current DB
      const db = await companyService.getCompanies();

      // 3. Run Matching logic
      const matchedResults = matchingService.matchCompanies(parsedCandidates, db);

      // 4. Update state to show results in verification table
      setCompanies(matchedResults);

      // 5. Add search log
      const duplicates = matchedResults.filter(
        (c) => c.matchStatus === "EXACT" || c.matchStatus === "FUZZY"
      ).length;
      
      await companyService.addSearchLog({
        type: "BATCH",
        riskLevel: duplicates > 0 ? "High Risk" : "Safe",
        title: file.name,
        orgName: reqOrg || "외부요청",
        docNum: reqDoc || "미지정",
        description: reqDesc || `${parsedCandidates.length}개사 중복 검증 요청`,
        totalCount: parsedCandidates.length,
        duplicateCount: duplicates,
      });
      await updateTotalHistoriesCount();

    } catch (error) {
      console.error("Error parsing or matching file:", error);
      alert("엑셀 파일 처리 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Single Search Handler
  const handleSingleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!singleSearchQuery.trim()) return;

    const db = await companyService.getCompanies();
    const isBrn = /^[0-9-]*$/.test(singleSearchQuery.replace(/\s/g, ""));
    const candidate: Partial<Company> = isBrn
      ? { businessNumber: singleSearchQuery.trim() }
      : { companyName: singleSearchQuery.trim() };

    // Run matching on single candidate
    const matched = matchingService.matchCompany(candidate, db);
    
    // Add single search history log
    await companyService.addSearchLog({
      type: "MANUAL",
      riskLevel: "Manual Search",
      title: matched.companyName || singleSearchQuery.trim(),
      brn: matched.businessNumber || undefined,
    });

    // Open detail comparative modal
    setSelectedCompany(matched);
  };

  // History Update Handler
  const handleUpdateHistory = async (companyId: string, historyId: string, updates: Partial<SupportHistory>) => {
    const updatedCo = await companyService.updateSupportHistory(companyId, historyId, updates);
    
    // Sync UI state
    setCompanies((prev) => prev.map((c) => (c.id === companyId ? { ...c, ...updatedCo } : c)));
    if (selectedCompany && selectedCompany.id === companyId) {
      setSelectedCompany((prev) => (prev ? { ...prev, ...updatedCo } : null));
    }
    await updateTotalHistoriesCount();
  };

  // Confirm Duplicate Handler
  const handleConfirmDuplicate = async (companyId: string) => {
    const updatedCo = await companyService.updateCompany(companyId, { matchStatus: "EXACT", matchScore: 100 });
    
    setCompanies((prev) => prev.map((c) => (c.id === companyId ? { ...c, ...updatedCo } : c)));
    if (selectedCompany && selectedCompany.id === companyId) {
      setSelectedCompany((prev) => (prev ? { ...prev, ...updatedCo } : null));
    }
  };

  // False Alarm / Approve Handler
  const handleFalseAlarm = async (companyId: string) => {
    const updatedCo = await companyService.updateCompany(companyId, { matchStatus: "NEW", matchScore: 0 });
    
    setCompanies((prev) => prev.map((c) => (c.id === companyId ? { ...c, ...updatedCo } : c)));
    if (selectedCompany && selectedCompany.id === companyId) {
      setSelectedCompany((prev) => (prev ? { ...prev, ...updatedCo } : null));
    }
  };

  // Export validation report
  const handleExportReport = async () => {
    if (companies.length === 0) {
      alert("다운로드할 검증 결과 데이터가 없습니다.");
      return;
    }
    try {
      const blob = await excelService.exportReport(companies);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `중복검증결과_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export report error:", error);
      alert("엑셀 리포트 다운로드 중 오류가 발생했습니다.");
    }
  };

  // Dynamic counts for stats cards
  const duplicateCount = companies.filter(
    (c) => c.matchStatus === "EXACT" || c.matchStatus === "FUZZY"
  ).length;
  const newCount = companies.filter((c) => c.matchStatus === "NEW").length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header Area */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-gbsa-primary)]">기업 중복 수혜 검증</h1>
        <p className="text-gray-500 mt-2">업로드한 엑셀 데이터를 기반으로 내부 지원 이력을 확인하고 중복 수혜를 방지하세요.</p>
      </div>

      {/* Main Grid: Upload (Left) & Search + Stats (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Batch Upload Area */}
        <div className="lg:col-span-2 bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border-2 border-dashed border-blue-300 p-8 flex flex-col items-center justify-center transition-colors relative h-full">
          
          {/* Top Form Fields */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-left relative z-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700 ml-1">요청기관</label>
              <input 
                type="text" 
                value={reqOrg}
                onChange={(e) => setReqOrg(e.target.value)}
                placeholder="기관명을 입력하세요" 
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm bg-white" 
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700 ml-1">문서번호</label>
              <input 
                type="text" 
                value={reqDoc}
                onChange={(e) => setReqDoc(e.target.value)}
                placeholder="문서번호를 입력하세요" 
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm bg-white" 
              />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-sm font-semibold text-gray-700 ml-1">요청내용</label>
              <textarea 
                value={reqDesc}
                onChange={(e) => setReqDesc(e.target.value)}
                placeholder="요청 내용을 상세히 입력하세요" 
                rows={4} 
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm resize-none bg-white"
              ></textarea>
            </div>
          </div>

          {/* Upload Dropzone Area */}
          <div className="flex flex-col items-center justify-center group cursor-pointer w-full py-6 rounded-xl hover:bg-blue-50/50 transition-colors border border-transparent hover:border-blue-100" onClick={handleUploadClick}>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleFileChange} 
            />
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-[var(--color-gbsa-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800">엑셀 파일 업로드 (대량 검색)</h3>
            <p className="text-sm text-gray-500 mt-2 mb-5">클릭하거나 파일을 이곳으로 드래그 앤 드롭 하세요.</p>
            <button className="bg-[var(--color-gbsa-primary)] text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-[var(--color-gbsa-secondary)] transition-colors flex items-center gap-2 shadow-sm" onClick={(e) => { e.stopPropagation(); handleUploadClick(); }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              파일 업로드
            </button>
          </div>
          
          {isUploading && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-2xl flex items-center justify-center z-20">
              <div className="w-64">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--color-gbsa-primary)] animate-progress-bar w-full origin-left"></div>
                </div>
                <p className="text-sm text-center mt-3 font-bold text-[var(--color-gbsa-primary)]">데이터 매칭 중...</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Single Search + Stats Stack */}
        <div className="flex flex-col gap-5 h-full">
          
          {/* Single Company Search */}
          <div className="bg-white rounded-2xl shadow-sm border-2 border-[var(--color-gbsa-primary)] p-6 flex flex-col justify-center relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 p-4 opacity-5 text-[var(--color-gbsa-primary)] pointer-events-none">
              <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-3 text-[var(--color-gbsa-primary)] relative z-10">단일 기업 검색</h3>
            <form onSubmit={handleSingleSearch} className="relative z-10">
              <input 
                type="text" 
                value={singleSearchQuery}
                onChange={(e) => setSingleSearchQuery(e.target.value)}
                placeholder="기업명 또는 사업자등록번호 입력" 
                className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-sm transition-all text-sm"
              />
              <button type="submit" className="absolute right-1.5 top-1.5 p-2 bg-[var(--color-gbsa-primary)] text-white rounded-md hover:bg-[var(--color-gbsa-secondary)] transition-colors flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>
          </div>

          {/* Stats Cards (Vertical Stack) */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4 overflow-hidden flex-1">
            <div className="w-10 h-10 shrink-0 rounded-full bg-red-100 flex items-center justify-center text-red-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 font-medium truncate">중복 의심 (정확/유사)</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{duplicateCount}건</p>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4 overflow-hidden flex-1">
            <div className="w-10 h-10 shrink-0 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 font-medium truncate">신규 접수</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{newCount}건</p>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4 overflow-hidden flex-1">
            <div className="w-10 h-10 shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-[var(--color-gbsa-primary)]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 font-medium truncate">총 누적 지원 건수</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{totalHistoriesCount.toLocaleString()}건</p>
            </div>
          </div>

        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="text-lg font-semibold text-gray-800">최근 검증 결과</h3>
          <button onClick={handleExportReport} className="text-sm text-[var(--color-gbsa-primary)] font-medium hover:underline">엑셀 다운로드</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F1F5F9] text-gray-600">
              <tr>
                <th className="py-4 px-6 font-medium">상태 (매칭도)</th>
                <th className="py-4 px-6 font-medium">기업명</th>
                <th className="py-4 px-6 font-medium">사업자등록번호</th>
                <th className="py-4 px-6 font-medium">소재지</th>
                <th className="py-4 px-6 font-medium">지원분야</th>
                <th className="py-4 px-6 font-medium text-right">과거 누적 지원금액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {companies.map((company) => {
                const validTotal = company.histories
                  .filter((h) => h.status !== "포기" && h.status !== "제외")
                  .reduce((sum, h) => sum + h.supportAmount, 0);

                let badgeClass = "";
                let badgeText = "";
                
                if (company.matchStatus === "EXACT") {
                  badgeClass = "bg-[var(--color-status-red)] text-white";
                  badgeText = "정확도 100%";
                } else if (company.matchStatus === "FUZZY") {
                  badgeClass = "bg-[var(--color-status-orange)] text-white";
                  badgeText = `유사 매칭 ${company.matchScore}%`;
                } else {
                  badgeClass = "bg-[var(--color-status-green)] text-white";
                  badgeText = "신규 기업";
                }

                const hasValidHistory = validTotal > 0;

                return (
                  <tr 
                    key={company.id} 
                    onClick={() => setSelectedCompany(company)}
                    className="hover:bg-[#EBF8FF] cursor-pointer transition-colors group"
                  >
                    <td className="py-4 px-6">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClass}`}>
                        {badgeText}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-medium text-gray-900">{company.companyName}</td>
                    <td className="py-4 px-6 font-mono text-gray-600">{formatBusinessNumber(company.businessNumber)}</td>
                    <td className="py-4 px-6 text-gray-500">{company.location}</td>
                    <td className="py-4 px-6 text-gray-500">{company.supportField}</td>
                    <td className={`py-4 px-6 text-right font-medium ${hasValidHistory ? "text-[var(--color-gbsa-primary)] underline decoration-blue-200 group-hover:decoration-blue-400" : "text-gray-400"}`}>
                      {hasValidHistory ? `${validTotal.toLocaleString()}원` : "-"}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* History Modal */}
      {selectedCompany && (
        <HistoryModal 
          company={selectedCompany} 
          onClose={() => setSelectedCompany(null)} 
          onUpdateHistory={handleUpdateHistory}
          onConfirmDuplicate={handleConfirmDuplicate}
          onFalseAlarm={handleFalseAlarm}
        />
      )}
    </div>
  );
}
