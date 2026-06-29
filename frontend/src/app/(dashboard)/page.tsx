"use client";

import { useState, useEffect, useRef } from "react";
import { Company, SupportHistory } from "@/data/mockData";
import HistoryModal from "@/components/modal/HistoryModal";
import { companyService } from "@/services/companyService";
import BusinessNumber from "@/components/BusinessNumber";
import { extractSiGun } from "@/utils/format";
import { matchingService } from "@/services/matchingService";
import { excelService } from "@/services/excelService";


export default function DashboardPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Single Search State
  const [singleSearchQuery, setSingleSearchQuery] = useState("");
  const [singleSearchProgram, setSingleSearchProgram] = useState("");
  const [singleSearchProject, setSingleSearchProject] = useState("");
  
  // Upload metadata form state
  const [reqOrg, setReqOrg] = useState("");
  const [reqDoc, setReqDoc] = useState("");
  const [reqDesc, setReqDesc] = useState("");
  const [excelPassword, setExcelPassword] = useState("");
  
  const [totalHistoriesCount, setTotalHistoriesCount] = useState(0);
  const [activeBatchInfo, setActiveBatchInfo] = useState<{ id: string; title: string } | null>(null);
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
      console.log("DEBUG_COMPANIES_LOADED:", loaded.map(c => ({ id: c.id, name: c.companyName, brn: c.businessNumber, dbBrn: c.dbBusinessNumber })));
      
      // Check if there is an active batch passed from search logs page
      if (typeof window !== "undefined") {
        const activeBatchStr = sessionStorage.getItem("gbsa_active_batch");
        if (activeBatchStr) {
          const activeBatch = JSON.parse(activeBatchStr);
          setCompanies(activeBatch.companies);
          setActiveBatchInfo({ id: activeBatch.id, title: activeBatch.title });
          sessionStorage.removeItem("gbsa_active_batch");
          
          const total = loaded.reduce((acc, c) => acc + c.histories.length, 0);
          setTotalHistoriesCount(total);
          return;
        }
      }

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

    console.log(`[Upload] Start: ${file.name} (${file.size} bytes, type: ${file.type})`);
    setIsUploading(true);
    try {
      // 1. Extract password from filename
      const filePassword = excelService.extractPasswordFromFileName(file.name);
      const effectivePassword = filePassword || excelPassword || undefined;
      console.log(`[Upload] Step 1 - Password: ${effectivePassword ? "****" : "none"}, filePattern: ${!!filePassword}, manual: ${!!excelPassword}`);
      
      // 2. Parse Excel data for matching
      console.log(`[Upload] Step 2 - Parsing Excel for matching...`);
      let parsedCandidates;
      try {
        parsedCandidates = await excelService.parseUploadFile(file, effectivePassword);
        console.log(`[Upload] Step 2 OK - ${parsedCandidates.length} candidates parsed`);
      } catch (err: any) {
        console.error(`[Upload] Step 2 FAILED:`, err);
        throw new Error(`[파일 읽기 실패] ${err.message}`);
      }
      
      // 3. Parse raw data for storage
      console.log(`[Upload] Step 3 - Parsing raw data...`);
      let rawData;
      try {
        rawData = await excelService.parseRawData(file, effectivePassword);
        console.log(`[Upload] Step 3 OK - headers: ${rawData.headers.length}, rows: ${rawData.data.length}`);
      } catch (err: any) {
        console.error(`[Upload] Step 3 FAILED:`, err);
        throw new Error(`[원본 데이터 파싱 실패] ${err.message}`);
      }

      // 4. Upload file to Supabase Storage (non-critical)
      let fileUrl: string | null = null;
      try {
        console.log(`[Upload] Step 4 - Uploading to Supabase Storage...`);
        fileUrl = await excelService.uploadFileToStorage(file);
        console.log(`[Upload] Step 4 OK - URL: ${fileUrl || "null"}`);
      } catch (storageErr: any) {
        console.warn(`[Upload] Step 4 FAILED (non-critical):`, storageErr);
      }

      // 5. Save to excel_uploads table (non-critical)
      try {
        console.log(`[Upload] Step 5 - Saving to excel_uploads...`);
        await companyService.addExcelUpload({
          fileName: file.name,
          fileSize: file.size,
          fileUrl: fileUrl || undefined,
          sheetName: rawData.sheetName,
          totalRows: rawData.data.length,
          parsedData: rawData.data,
          columnHeaders: rawData.headers,
          uploadNote: reqDesc || undefined,
        });
        console.log(`[Upload] Step 5 OK`);
      } catch (dbErr: any) {
        console.warn(`[Upload] Step 5 FAILED (non-critical):`, dbErr);
      }

      // 6. Fetch current DB
      console.log(`[Upload] Step 6 - Fetching DB companies...`);
      const db = await companyService.getCompanies();
      console.log(`[Upload] Step 6 OK - ${db.length} companies in DB`);

      // 7. Run Matching logic
      console.log(`[Upload] Step 7 - Running matching...`);
      const matchedResults = matchingService.matchCompanies(parsedCandidates, db);
      console.log(`[Upload] Step 7 OK - ${matchedResults.length} results`);

      // 8. Update state
      setCompanies(matchedResults);
      setActiveBatchInfo(null);

      // 9. Add BATCH log
      console.log(`[Upload] Step 9 - Saving search log...`);
      const batchDesc = reqDesc || `${parsedCandidates.length}개사 중복 검증 요청`;
      const batchMeta = {
        orgName: reqOrg || "외부요청",
        docNum: reqDoc || "미지정",
        description: batchDesc,
        sourceFile: file.name,
      };

      const duplicateCount = matchedResults.filter(
        (c) => c.matchStatus === "EXACT" || c.matchStatus === "FUZZY"
      ).length;

      await companyService.addSearchLog({
        type: "BATCH",
        riskLevel: duplicateCount > 0 ? "High Risk" : "Safe",
        title: batchMeta.sourceFile,
        brn: undefined,
        orgName: batchMeta.orgName,
        docNum: batchMeta.docNum,
        description: JSON.stringify({
          desc: batchMeta.description,
          sourceFile: batchMeta.sourceFile,
          isBulk: true,
        }),
        totalCount: matchedResults.length,
        duplicateCount: duplicateCount,
        additionalData: {
          results: matchedResults,
        },
      });

      await updateTotalHistoriesCount();
      console.log(`[Upload] All steps completed successfully`);

    } catch (error: any) {
      console.error("[Upload] Fatal error:", error);
      const msg = error?.message || String(error);
      let userMsg = `엑셀 파일 처리 중 오류가 발생했습니다.\n\n${msg}`;
      if (msg.includes("파일 읽기 실패") || msg.includes("암호화")) {
        userMsg = `파일 처리 오류\n\n${msg}\n\n• 파일이 암호화된 경우 _PW1234 패턴 확인 또는 비밀번호 수동 입력`;
      } else if (msg.includes("fetch") || msg.includes("Failed to fetch")) {
        userMsg = "서버 연결에 실패했습니다. 네트워크 연결을 확인하세요.";
      }
      alert(userMsg);
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
      ? {
          businessNumber: singleSearchQuery.trim(),
          appliedProgramName: singleSearchProgram.trim(),
          appliedProjectName: singleSearchProject.trim(),
        }
      : {
          companyName: singleSearchQuery.trim(),
          appliedProgramName: singleSearchProgram.trim(),
          appliedProjectName: singleSearchProject.trim(),
        };

    // Run matching on single candidate
    const matched = matchingService.matchCompany(candidate, db);
    const isDuplicate = matched.matchStatus === "EXACT" || matched.matchStatus === "FUZZY";
    
    // Add single search history log
    await companyService.addSearchLog({
      type: "MANUAL",
      riskLevel: isDuplicate ? "High Risk" : "Safe",
      title: matched.companyName || singleSearchQuery.trim(),
      brn: matched.businessNumber || singleSearchQuery.trim(),
      description: JSON.stringify({
        desc: "단일 기업 중복 수혜 검증",
        appliedProgramName: singleSearchProgram.trim(),
        appliedProjectName: singleSearchProject.trim(),
        isBulk: false,
      }),
      additionalData: {
        matchedCompany: matched,
      },
    });

    // Reset single search subfields
    setSingleSearchProgram("");
    setSingleSearchProject("");

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
  const duplicateCount = companies.filter((c) => c.isDuplicateSuspect).length;
  const newCount = companies.filter((c) => c.matchStatus === "NEW").length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Main Grid: Upload (Left) & Search + Stats (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Batch Upload Area */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border-2 border-dashed border-blue-300 p-8 flex flex-col items-center justify-start transition-colors relative h-full">
          <h3 className="text-lg font-bold mb-4 text-[var(--color-gbsa-primary)] relative z-10 w-full text-left">대량 기업 검색</h3>
          
          {/* Top Form Fields */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-left relative z-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col gap-1.5 relative">
              <label className="text-sm font-semibold text-gray-700 ml-1">요청기관</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </span>
                <input 
                  type="text" 
                  value={reqOrg}
                  onChange={(e) => setReqOrg(e.target.value)}
                  placeholder="기관명을 입력하세요" 
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm bg-white" 
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5 relative">
              <label className="text-sm font-semibold text-gray-700 ml-1">문서번호</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                </span>
                <input 
                  type="text" 
                  value={reqDoc}
                  onChange={(e) => setReqDoc(e.target.value)}
                  placeholder="문서번호를 입력하세요" 
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm bg-white" 
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2 relative">
              <label className="text-sm font-semibold text-gray-700 ml-1">요청내용</label>
              <div className="relative">
                <span className="absolute left-3.5 top-5 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </span>
                <textarea 
                  value={reqDesc}
                  onChange={(e) => setReqDesc(e.target.value)}
                  placeholder="요청 내용을 상세히 입력하세요" 
                  rows={4} 
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm resize-none bg-white"
                ></textarea>
              </div>
            </div>
          </div>

          {/* Excel Password Input */}
          <div className="w-full mb-4 relative z-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </span>
                <input 
                  type="password" 
                  value={excelPassword}
                  onChange={(e) => setExcelPassword(e.target.value)}
                  placeholder="엑셀 비밀번호 (암호화된 파일만 해당)" 
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm bg-white" 
                />
              </div>
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
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center z-20">
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
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border-2 border-dashed border-[var(--color-gbsa-primary)]/40 p-6 flex flex-col justify-center relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 p-4 opacity-5 text-[var(--color-gbsa-primary)] pointer-events-none">
              <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-4 text-[var(--color-gbsa-primary)] relative z-10">단일 기업 검색</h3>
            <form onSubmit={handleSingleSearch} className="relative z-10 space-y-3.5">
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">기업명 또는 사업자번호</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </span>
                  <input 
                    type="text" 
                    value={singleSearchQuery}
                    onChange={(e) => setSingleSearchQuery(e.target.value)}
                    placeholder="예: 경기테크노밸리 또는 123-45-67890" 
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-sm transition-all text-sm bg-white"
                    required
                  />
                </div>
              </div>
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">지원사업명</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  </span>
                  <input 
                    type="text" 
                    value={singleSearchProgram}
                    onChange={(e) => setSingleSearchProgram(e.target.value)}
                    placeholder="예: 2024 창업도약패키지 (선택)" 
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-sm transition-all text-sm bg-white"
                  />
                </div>
              </div>
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">지원과제명</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                  </span>
                  <input 
                    type="text" 
                    value={singleSearchProject}
                    onChange={(e) => setSingleSearchProject(e.target.value)}
                    placeholder="예: 인공지능 모듈 개발 (선택)" 
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-sm transition-all text-sm bg-white"
                  />
                </div>
              </div>
              <button 
                type="submit" 
                className="w-full py-2.5 bg-[var(--color-gbsa-primary)] hover:bg-[var(--color-gbsa-secondary)] text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                검색 실행
              </button>
            </form>
          </div>

          {/* Stats Cards (Horizontal Row) */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-3 overflow-hidden">
              <div className="w-10 h-10 shrink-0 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-red-600 truncate">중복 의심</p>
                <p className="text-lg font-bold text-red-700 mt-0.5">{duplicateCount}<span className="text-sm font-normal text-gray-500 ml-0.5">건</span></p>
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-3 overflow-hidden">
              <div className="w-10 h-10 shrink-0 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500 font-medium truncate">신규 요청</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{newCount}<span className="text-sm font-normal text-gray-500 ml-0.5">건</span></p>
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-3 overflow-hidden">
              <div className="w-10 h-10 shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-[var(--color-gbsa-primary)]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500 font-medium truncate">총 누적 지원</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{totalHistoriesCount.toLocaleString()}<span className="text-sm font-normal text-gray-500 ml-0.5">건</span></p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-800">
              {activeBatchInfo ? `최근 검증 결과 (${activeBatchInfo.title})` : "최근 검증 결과"}
            </h3>
            {activeBatchInfo && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-md border border-blue-200">
                과거 검색 기록 로드됨
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {activeBatchInfo && (
              <button 
                onClick={async () => {
                  setActiveBatchInfo(null);
                  const loaded = await companyService.getCompanies();
                  setCompanies(loaded);
                }}
                className="text-xs text-red-500 hover:underline font-semibold"
              >
                결과 초기화
              </button>
            )}
            <button onClick={handleExportReport} className="text-sm text-[var(--color-gbsa-primary)] font-medium hover:underline">엑셀 다운로드</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F1F5F9] text-gray-600">
              <tr>
                <th className="py-4 px-6 font-medium text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    상태 (매칭도)
                  </div>
                </th>
                <th className="py-4 px-6 font-medium text-left">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    기업명
                  </div>
                </th>
                <th className="py-4 px-6 font-medium text-left">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    사업자등록번호
                  </div>
                </th>
                <th className="py-4 px-6 font-medium text-left">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    지원사업명
                  </div>
                </th>
                <th className="py-4 px-6 font-medium text-left">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    지원과제명
                  </div>
                </th>
                <th className="py-4 px-6 font-medium text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    소재지
                  </div>
                </th>
                <th className="py-4 px-6 font-medium text-left">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                    지원분야
                  </div>
                </th>
                <th className="py-4 px-6 font-medium text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    과거 누적 지원금액
                  </div>
                </th>
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
                  if (company.isDuplicateSuspect) {
                    badgeClass = "bg-[var(--color-status-red)] text-white";
                    badgeText = "중복의심 (일치)";
                  } else {
                    badgeClass = "bg-blue-600 text-white";
                    badgeText = "조회 완료 (안전)";
                  }
                } else if (company.matchStatus === "FUZZY") {
                  if (company.isDuplicateSuspect) {
                    badgeClass = "bg-[var(--color-status-red)] text-white";
                  } else {
                    badgeClass = "bg-[var(--color-status-orange)] text-white";
                  }
                } else {
                  badgeClass = "bg-[var(--color-status-green)] text-white";
                  badgeText = "신규 요청";
                }

                const hasValidHistory = validTotal > 0;

                return (
                  <tr 
                    key={company.id} 
                    onClick={() => setSelectedCompany(company)}
                    className="hover:bg-[#EBF8FF] cursor-pointer transition-colors group"
                  >
                    <td className="py-4 px-6">
                      <div className="flex flex-col sm:flex-row gap-1.5 sm:items-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClass}`}>
                          {company.matchStatus === "FUZZY" ? (
                            <>{company.isDuplicateSuspect ? "중복의심" : "확인 필요"} (<span className="font-mono">{company.matchScore}%</span>)</>
                          ) : badgeText}
                        </span>
                        {company.isDuplicateSuspect && (
                          <span className="inline-block px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold border border-red-200 animate-pulse">
                            ⚠️ 중복 의심
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-left font-medium text-gray-900">{company.companyName}</td>
                    <td className="py-4 px-6 text-left font-mono text-gray-600">
                      <BusinessNumber value={company.businessNumber} />
                    </td>
                    <td className="py-4 px-6 text-left text-gray-500 max-w-[180px] truncate">{company.appliedProgramName || "-"}</td>
                    <td className="py-4 px-6 text-left text-gray-500 max-w-[180px] truncate">{company.appliedProjectName || "-"}</td>
                    <td className="py-4 px-6 text-center text-gray-500">{extractSiGun(company.location)}</td>
                    <td className="py-4 px-6 text-left text-gray-500">{company.supportField}</td>
                    <td className="py-4 px-6 text-right">
                      {hasValidHistory ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--color-gbsa-primary)] text-white text-sm font-bold">
                          <span className="font-mono">{validTotal.toLocaleString()}</span><span className="font-sans ml-0.5">원</span>
                        </span>
                      ) : "-"}
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
