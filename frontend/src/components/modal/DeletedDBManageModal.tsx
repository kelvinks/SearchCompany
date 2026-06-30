"use client";

import { Company } from "@/data/mockData";
import { useEffect, useState } from "react";
import { companyService } from "@/services/companyService";
import BusinessNumber from "@/components/BusinessNumber";
import LoadingOverlay from "@/components/LoadingOverlay";

interface DeletedDBManageModalProps {
  company: Company & { deletedAt?: string };
  onClose: () => void;
  onRefresh: () => void;
}

export default function DeletedDBManageModal({ company, onClose, onRefresh }: DeletedDBManageModalProps) {
  const [saving, setSaving] = useState(false);

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

  const handleRestore = async () => {
    if (!confirm(`"${company.companyName}" 기업 데이터를 복원하시겠습니까?\n이전의 지원 이력까지 모두 원상 복구됩니다.`)) {
      return;
    }
    setSaving(true);
    try {
      await companyService.restoreCompany(company.id);
      alert("기업 데이터가 성공적으로 복원되었습니다.");
      onRefresh();
      onClose();
    } catch (err) {
      console.error("Error restoring company:", err);
      alert("복원 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!confirm(`※ 경고: "${company.companyName}" 기업 및 관련 지원 이력을 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며 복구가 불가능합니다.`)) {
      return;
    }
    setSaving(true);
    try {
      await companyService.permanentDeleteCompany(company.id);
      alert("영구 삭제 처리가 완료되었습니다.");
      onRefresh();
      onClose();
    } catch (err) {
      console.error("Error permanently deleting company:", err);
      alert("영구 삭제 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "-";
    try {
      const date = new Date(isoString);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-20 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded-md font-semibold">삭제된 데이터</span>
              {company.companyName}
            </h2>
            <p className="text-xs text-gray-500 mt-1">삭제 일시: {formatDate(company.deletedAt)}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Details Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-5 rounded-2xl border border-gray-200/50">
            <div>
              <span className="block text-xs font-semibold text-gray-400 mb-1">사업자등록번호</span>
              <span className="text-sm font-mono text-gray-800 font-semibold">
                <BusinessNumber value={company.businessNumber} />
              </span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-400 mb-1">지원분야</span>
              <span className="text-sm text-gray-800 font-medium">{company.supportField || "-"}</span>
            </div>
            <div className="md:col-span-2">
              <span className="block text-xs font-semibold text-gray-400 mb-1">기업 주소</span>
              <span className="text-sm text-gray-800 font-medium">{company.location || "-"}</span>
            </div>
            <div className="md:col-span-2">
              <span className="block text-xs font-semibold text-gray-400 mb-1">주요 사업 및 주요생산품</span>
              <span className="text-sm text-gray-800 font-medium">{company.mainProducts || "-"}</span>
            </div>
          </div>

          {/* Support History Section */}
          <div className="space-y-3">
            <h3 className="text-md font-bold text-gray-800">당시 등록되어 있던 지원이력</h3>
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 text-gray-600 border-b border-gray-200 font-medium">
                  <tr>
                    <th className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        연도
                      </div>
                    </th>
                    <th className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        지원사업명
                      </div>
                    </th>
                    <th className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        지원과제명
                      </div>
                    </th>
                    <th className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        상태
                      </div>
                    </th>
                    <th className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        선정금액
                      </div>
                    </th>
                    <th className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        지원금액
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {company.histories && company.histories.length > 0 ? (
                    company.histories.map((history) => (
                      <tr key={history.id} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4 text-gray-500 font-mono">{history.year}</td>
                        <td className="py-3 px-4 font-semibold text-gray-800">{history.programName}</td>
                        <td className="py-3 px-4 text-gray-700">{history.projectName || "-"}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            history.status === "완료" ? "bg-green-50 text-green-700" :
                            history.status === "선정" ? "bg-blue-50 text-blue-700" :
                            "bg-red-50 text-red-700"
                          }`}>
                            {history.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold font-mono text-gray-600">
                          {history.selectedAmount.toLocaleString()}원
                        </td>
                        <td className="py-3 px-4 text-right font-bold font-mono text-[var(--color-gbsa-primary)]">
                          {history.supportAmount.toLocaleString()}원
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400 font-medium bg-white">
                        등록된 지원 이력이 존재하지 않습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
          <button
            onClick={handlePermanentDelete}
            className="px-4 py-2 text-sm bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-semibold"
          >
            영구 삭제
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              닫기
            </button>
            <button
              onClick={handleRestore}
              className="px-4 py-2 text-sm bg-[var(--color-gbsa-primary)] text-white rounded-lg hover:bg-[var(--color-gbsa-secondary)] transition-colors font-semibold shadow-sm"
            >
              기업 데이터 복원하기
            </button>
          </div>
        </div>
        <LoadingOverlay show={saving} message="처리 중..." />
      </div>
    </div>
  );
}
