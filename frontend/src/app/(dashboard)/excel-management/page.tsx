"use client";

import { useState, useEffect } from "react";
import { companyService } from "@/services/companyService";
import { excelService, ExcelUploadData } from "@/services/excelService";

export default function ExcelManagementPage() {
  const [uploads, setUploads] = useState<any[]>([]);
  const [selectedUpload, setSelectedUpload] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [reparsing, setReparsing] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editOrg, setEditOrg] = useState("");
  const [editDoc, setEditDoc] = useState("");
  const [editSendDate, setEditSendDate] = useState("");
  const [editRequestDate, setEditRequestDate] = useState("");
  const [editDesc, setEditDesc] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await companyService.getExcelUploads();
      setUploads(data);
    } catch (error) {
      console.error("Error loading excel uploads:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const success = await companyService.deleteExcelUpload(id);
    if (success) {
      setUploads((prev) => prev.filter((u) => u.id !== id));
      if (selectedUpload?.id === id) {
        setSelectedUpload(null);
      }
    }
    setDeleteConfirm(null);
  };

  const handleReparse = async (upload: any) => {
    if (!upload.file_url) {
      alert("파일 URL이 없어 다시 읽을 수 없습니다.");
      return;
    }
    setReparsing(upload.id);
    try {
      const result = await excelService.reparseFileFromUrl(upload.file_url, upload.file_name);
      const ok = await companyService.updateExcelUpload(upload.id, {
        parsedData: result.data,
        columnHeaders: result.headers,
        totalRows: result.data.length,
        title: result.title,
        description: result.description,
      });
      if (ok) {
        setSelectedUpload((prev: any) =>
          prev?.id === upload.id
            ? {
                ...prev,
                parsed_data: result.data,
                column_headers: result.headers,
                total_rows: result.data.length,
                sheet_title: result.title || null,
                sheet_description: result.description || null,
              }
            : prev
        );
        await loadData();
      } else {
        alert("데이터베이스 업데이트에 실패했습니다.");
      }
    } catch (err: any) {
      alert(`다시 읽기 실패: ${err.message}`);
    } finally {
      setReparsing(null);
    }
  };

  const handleEditSave = async (upload: any) => {
    const ok = await companyService.updateExcelUploadMeta(upload.id, {
      orgName: editOrg,
      docNum: editDoc,
      sendDate: editSendDate || undefined,
      requestDate: editRequestDate || undefined,
      uploadNote: editDesc,
    });
    if (ok) {
      setSelectedUpload((prev: any) =>
        prev?.id === upload.id
          ? { ...prev, org_name: editOrg, doc_num: editDoc, send_date: editSendDate || null, request_date: editRequestDate || null, upload_note: editDesc }
          : prev
      );
      await loadData();
      setEditingId(null);
    } else {
      alert("수정 실패");
    }
  };

  const startEditing = (upload: any) => {
    setEditOrg(upload.org_name || "");
    setEditDoc(upload.doc_num || "");
    setEditSendDate(upload.send_date || "");
    setEditRequestDate(upload.request_date || "");
    setEditDesc(upload.upload_note || "");
    setEditingId(upload.id);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400 flex items-center gap-3">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          로딩 중...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 shrink-0">
        <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-[var(--color-gbsa-primary)]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500 font-medium truncate">총 업로드</p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">{uploads.length}<span className="text-sm font-normal text-gray-500 ml-0.5">건</span></p>
          </div>
        </div>
        
        <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 shrink-0 rounded-full bg-green-100 flex items-center justify-center text-green-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500 font-medium truncate">총 기업 수</p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">{uploads.reduce((sum, u) => sum + (u.total_rows || 0), 0).toLocaleString()}<span className="text-sm font-normal text-gray-500 ml-0.5">개사</span></p>
          </div>
        </div>
        
        <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 shrink-0 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500 font-medium truncate">최근 업로드</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5 truncate">{uploads.length > 0 ? formatDate(uploads[0].created_at) : "-"}</p>
          </div>
        </div>
      </div>

      {/* Upload List & Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Upload List */}
        <div className="lg:col-span-1 bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
            <h3 className="text-lg font-semibold text-gray-800">업로드 목록</h3>
          </div>
          <div className="divide-y divide-gray-100 overflow-y-auto flex-1">
            {uploads.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="font-medium">업로드된 파일이 없습니다</p>
                <p className="text-sm mt-1">통합 검색에서 엑셀 파일을 업로드하세요</p>
              </div>
            ) : (
              uploads.map((upload) => (
                <div key={upload.id}>
                  <div
                    onClick={() => { setSelectedUpload(upload); setEditingId(null); }}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedUpload?.id === upload.id
                        ? "bg-[var(--color-gbsa-primary)]/5 border-l-4 border-[var(--color-gbsa-primary)]"
                        : "hover:bg-gray-50 border-l-4 border-transparent"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-800 truncate">{upload.file_name}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(upload.created_at)}</p>
                        {(upload.org_name || upload.doc_num) && (
                          <p className="text-xs text-gray-400 mt-1 truncate">
                            {upload.org_name && `요청: ${upload.org_name}`}{upload.org_name && upload.doc_num && " | "}{upload.doc_num && `문서: ${upload.doc_num}`}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {upload.total_rows || 0}개사
                          </span>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {formatFileSize(upload.file_size || 0)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(upload);
                          }}
                          className="p-1.5 text-gray-400 hover:text-[var(--color-gbsa-primary)] hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(upload.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Inline Edit Form */}
                  {editingId === upload.id && (
                    <div className="px-4 py-4 bg-gray-50 border-b border-gray-100 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-gray-500">요청기관</label>
                          <input type="text" value={editOrg} onChange={(e) => setEditOrg(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white outline-none focus:border-[var(--color-gbsa-primary)]" placeholder="기관명" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-gray-500">문서번호</label>
                          <input type="text" value={editDoc} onChange={(e) => setEditDoc(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white outline-none focus:border-[var(--color-gbsa-primary)]" placeholder="문서번호" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-gray-500">접수일</label>
                          <input type="date" value={editSendDate} onChange={(e) => setEditSendDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white outline-none focus:border-[var(--color-gbsa-primary)]" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-gray-500">요청일</label>
                          <input type="date" value={editRequestDate} onChange={(e) => setEditRequestDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white outline-none focus:border-[var(--color-gbsa-primary)]" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-500">요청내용</label>
                        <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white outline-none focus:border-[var(--color-gbsa-primary)] resize-none" rows={2} placeholder="요청 내용" />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium">취소</button>
                        <button onClick={() => handleEditSave(upload)} className="px-3 py-1.5 text-xs text-white bg-[var(--color-gbsa-primary)] hover:bg-[var(--color-gbsa-secondary)] rounded-lg transition-colors font-medium">저장</button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detail View */}
        <div className="lg:col-span-2 bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          {selectedUpload ? (
            <>
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{selectedUpload.file_name}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    시트: {selectedUpload.sheet_name} | 총 {selectedUpload.total_rows || 0}개사
                  </p>
                </div>
                {selectedUpload.file_url && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleReparse(selectedUpload)}
                      disabled={reparsing === selectedUpload.id}
                      className="text-sm text-[var(--color-gbsa-primary)] font-medium hover:underline flex items-center gap-1 disabled:opacity-50"
                    >
                      {reparsing === selectedUpload.id ? (
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                      {reparsing === selectedUpload.id ? "다시 읽는 중..." : "데이터 다시 읽기"}
                    </button>
                    <a
                      href={selectedUpload.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-500 font-medium hover:underline flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      파일 다운로드
                    </a>
                  </div>
                )}
              </div>
              {/* Title & Description */}
              {selectedUpload.sheet_title && (
                <div className="px-6 py-3 border-b border-gray-100 bg-[#FAFBFC]">
                  <h4 className="text-base font-semibold text-gray-800">{selectedUpload.sheet_title}</h4>
                </div>
              )}
              {selectedUpload.sheet_description && (
                <div className="px-6 py-3 border-b border-gray-100 bg-[#FAFBFC]">
                  <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{selectedUpload.sheet_description}</p>
                </div>
              )}
              {/* Data Table */}
              <div className="overflow-auto flex-1 min-h-0">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F1F5F9] text-gray-600 sticky top-0">
                    <tr>
                      {(selectedUpload.column_headers || []).map((header: string) => (
                        <th key={header} className="py-3 px-4 font-medium text-left whitespace-nowrap">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(selectedUpload.parsed_data || []).slice(0, 100).map((row: Record<string, any>, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        {(selectedUpload.column_headers || []).map((header: string) => (
                          <td key={header} className="py-3 px-4 text-gray-600 max-w-[200px] truncate">
                            {row[header] ?? "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(selectedUpload.parsed_data || []).length > 100 && (
                  <div className="p-4 text-center text-sm text-gray-500 bg-gray-50">
                    최대 100개사만 표시됩니다. (전체: {(selectedUpload.parsed_data || []).length}개사)
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="font-medium">파일을 선택하세요</p>
              <p className="text-sm mt-1">왼쪽 목록에서 업로드된 파일을 클릭하세요</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110]">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-gray-800">삭제 확인</h4>
                <p className="text-sm text-gray-500">이 업로드 기록을 삭제하시겠습니까?</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
