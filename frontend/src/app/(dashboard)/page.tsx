"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Company } from "@/data/mockData";
import { companyService } from "@/services/companyService";
import { matchingService } from "@/services/matchingService";
import { excelService } from "@/services/excelService";


export default function DashboardPage() {
  const router = useRouter();
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
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      // 8. Add BATCH log (non-blocking)
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

      companyService.addSearchLog({
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
      }).catch((e) => console.warn("Search log save failed:", e));

      // 9. Save results to sessionStorage and navigate to verification-results page
      sessionStorage.setItem("gbsa_search_results", JSON.stringify({
        type: "BATCH",
        results: matchedResults,
        title: file.name,
      }));
      router.push("/verification-results");
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

    try {
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
      
      // Add single search history log (non-blocking)
      companyService.addSearchLog({
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
      }).catch((e) => console.warn("Search log save failed:", e));

      // Save result to sessionStorage and navigate to verification-results page
      sessionStorage.setItem("gbsa_search_results", JSON.stringify({
        type: "SINGLE",
        result: matched,
        query: singleSearchQuery.trim(),
      }));
      router.push("/verification-results");
    } catch (err: any) {
      console.error("Single search error:", err);
      alert("검색 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Main Grid: Upload (Left) & Search + Stats (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Batch Upload Area */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border-2 border-dashed border-blue-300 p-8 flex flex-col items-center justify-start transition-colors relative h-full">
          <h3 className="text-lg font-bold mb-4 text-[var(--color-gbsa-primary)] relative z-10 w-full text-left">대량 기업 검색</h3>
          
          {/* Top Form Fields: Left column (1fr) + Right column (3fr) */}
          <div className="w-full grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 text-left relative z-10" onClick={(e) => e.stopPropagation()}>
            {/* Left Column: 요청기관, 문서번호, 엑셀비밀번호 stacked */}
            <div className="md:col-span-2 flex flex-col gap-4">
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
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-sm font-semibold text-gray-700 ml-1">엑셀 비밀번호</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </span>
                  <input 
                    type="password" 
                    value={excelPassword}
                    onChange={(e) => setExcelPassword(e.target.value)}
                    placeholder="암호화된 파일의 비밀번호" 
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm bg-white" 
                  />
                </div>
              </div>
            </div>
            {/* Right Column: 요청내용 */}
            <div className="md:col-span-3 flex flex-col gap-1.5 relative">
              <label className="text-sm font-semibold text-gray-700 ml-1">요청내용</label>
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-5 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </span>
                <textarea 
                  value={reqDesc}
                  onChange={(e) => setReqDesc(e.target.value)}
                  placeholder="요청 내용을 상세히 입력하세요" 
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm resize-none bg-white h-full"
                ></textarea>
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
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border-2 border-dashed border-[var(--color-gbsa-primary)]/40 p-6 flex flex-col relative overflow-hidden flex-1">
            <div className="absolute top-0 right-0 p-4 opacity-5 text-[var(--color-gbsa-primary)] pointer-events-none">
              <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-4 text-[var(--color-gbsa-primary)] relative z-10">단일 기업 검색</h3>
            <form onSubmit={handleSingleSearch} className="relative z-10 flex flex-col flex-1">
              <div className="flex-1 space-y-3.5">
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
              </div>
              <button 
                type="submit" 
                className="w-full mt-auto py-2.5 bg-[var(--color-gbsa-primary)] hover:bg-[var(--color-gbsa-secondary)] text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                검색 실행
              </button>
            </form>
          </div>

        </div>
      </div>

    </div>
  );
}
