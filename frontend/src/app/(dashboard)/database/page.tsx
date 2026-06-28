"use client";

import { useState, useEffect } from "react";
import { Company } from "@/data/mockData";
import DBManageModal from "@/components/modal/DBManageModal";
import DeletedDBManageModal from "@/components/modal/DeletedDBManageModal";
import { extractSiGun } from "@/utils/format";
import BusinessNumber from "@/components/BusinessNumber";
import NewCompanyModal from "@/components/modal/NewCompanyModal";
import { companyService } from "@/services/companyService";
import { excelService } from "@/services/excelService";
import { supabase } from "@/services/supabaseClient";

export default function DatabasePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [deletedCompanies, setDeletedCompanies] = useState<(Company & { deletedAt?: string })[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedDeletedCompany, setSelectedDeletedCompany] = useState<(Company & { deletedAt?: string }) | null>(null);
  const [isNewCompanyModalOpen, setIsNewCompanyModalOpen] = useState(false);
  const [locationFilter, setLocationFilter] = useState("");
  const [fieldFilter, setFieldFilter] = useState("");
  
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "deleted">("active");

  useEffect(() => {
    const checkSuperUser = async () => {
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.user_metadata?.role === "superuser") {
          setIsSuperUser(true);
        }
      }
    };
    checkSuperUser();

    const loadData = async () => {
      const data = await companyService.getCompanies();
      setCompanies(data);
      const deletedData = await companyService.getDeletedCompanies();
      setDeletedCompanies(deletedData);
    };
    loadData();
  }, []);

  const handleExportAll = async () => {
    if (companies.length === 0) return;
    try {
      const blob = await excelService.exportReport(companies);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `GBSA_기업데이터베이스_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export all error:", error);
    }
  };

  const handleRefresh = async () => {
    const data = await companyService.getCompanies();
    setCompanies(data);
    const deletedData = await companyService.getDeletedCompanies();
    setDeletedCompanies(deletedData);
  };

  const currentSourceList = activeTab === "active" ? companies : deletedCompanies;

  const uniqueLocations = Array.from(
    new Set(currentSourceList.map(c => extractSiGun(c.location)).filter(Boolean))
  ).sort();

  const uniqueFields = Array.from(
    new Set(currentSourceList.map(c => c.supportField).filter(Boolean))
  ).sort();

  const filteredCompanies = currentSourceList.filter((c) => {
    const matchesSearch =
      c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.businessNumber.replace(/-/g, "").includes(searchTerm.replace(/-/g, ""));
      
    const matchesLocation = locationFilter ? extractSiGun(c.location) === locationFilter : true;
    const matchesField = fieldFilter ? c.supportField === fieldFilter : true;
      
    return matchesSearch && matchesLocation && matchesField;
  });

  return (
    <div suppressHydrationWarning={true} className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header Area */}
      <div className="flex justify-between items-center">
        {/* Recycle Bin / Archive tabs for superusers */}
        {isSuperUser ? (
          <div className="bg-white/80 p-1 rounded-xl shadow-sm border border-gray-200/50 flex gap-1 backdrop-blur-sm">
            <button
              onClick={() => {
                setActiveTab("active");
                setSearchTerm("");
              }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === "active"
                  ? "bg-[var(--color-gbsa-primary)] text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              활성 기업 목록
            </button>
            <button
              onClick={() => {
                setActiveTab("deleted");
                setSearchTerm("");
              }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                activeTab === "deleted"
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-red-600 hover:bg-red-50/50"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              휴지통 (삭제된 기업)
            </button>
          </div>
        ) : (
          <div />
        )}

        <div className="flex gap-3">
          <button onClick={handleExportAll} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg shadow-sm hover:bg-gray-50 font-medium transition-colors">
            데이터 내보내기
          </button>
          {activeTab === "active" && (
            <button 
              onClick={() => setIsNewCompanyModalOpen(true)}
              className="px-4 py-2 bg-[var(--color-gbsa-primary)] text-white rounded-lg shadow-sm hover:bg-[var(--color-gbsa-secondary)] font-medium flex items-center transition-colors"
            >
              <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              신규 기업 등록
            </button>
          )}
        </div>
      </div>

      {/* Filter Area */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder="기업명 또는 사업자등록번호 검색..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 h-11 rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm"
          />
        </div>
        <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="w-full md:w-48 px-4 h-11 rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm bg-white cursor-pointer transition-all">
          <option value="">모든 소재지</option>
          {uniqueLocations.map(loc => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>
        <select value={fieldFilter} onChange={(e) => setFieldFilter(e.target.value)} className="w-full md:w-48 px-4 h-11 rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm bg-white cursor-pointer transition-all">
          <option value="">모든 지원분야</option>
          {uniqueFields.map(field => (
            <option key={field} value={field}>{field}</option>
          ))}
        </select>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="text-lg font-semibold text-gray-800">
            {activeTab === "active" ? "등록된 기업 목록" : "휴지통에 보관된 기업 목록"}
            <span className="text-sm font-normal text-gray-500 ml-2">총 {filteredCompanies.length}건</span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F1F5F9] text-gray-600 border-b border-gray-200">
              <tr>
                <th className="py-4 px-6 font-medium">기업명</th>
                <th className="py-4 px-6 font-medium">사업자등록번호</th>
                <th className="py-4 px-6 font-medium">소재지</th>
                <th className="py-4 px-6 font-medium">주요 사업(지원분야)</th>
                {activeTab === "active" ? (
                  <th className="py-4 px-6 font-medium text-right">총 지원금액</th>
                ) : (
                  <th className="py-4 px-6 font-medium text-right">삭제 일시</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCompanies.length > 0 ? (
                filteredCompanies.map((company) => {
                  const totalSupport = company.histories
                    .filter((h) => h.status !== "포기" && h.status !== "제외")
                    .reduce((sum, h) => sum + h.supportAmount, 0);

                  const formatDate = (isoString?: string) => {
                    if (!isoString) return "-";
                    try {
                      const d = new Date(isoString);
                      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                    } catch (e) {
                      return isoString;
                    }
                  };

                  return (
                    <tr 
                      key={company.id} 
                      onClick={() => {
                        if (activeTab === "active") {
                          setSelectedCompany(company);
                        } else {
                          setSelectedDeletedCompany(company);
                        }
                      }}
                      className="hover:bg-[#EBF8FF] cursor-pointer transition-colors group"
                    >
                      <td className="py-4 px-6 font-medium text-gray-900">{company.companyName}</td>
                      <td className="py-4 px-6 font-mono text-gray-600">
                        <BusinessNumber value={company.businessNumber} />
                      </td>
                      <td className="py-4 px-6 text-gray-500">{extractSiGun(company.location)}</td>
                      <td className="py-4 px-6 text-gray-500">{company.supportField}</td>
                      {activeTab === "active" ? (
                        <td className="py-4 px-6 text-right font-bold text-[var(--color-gbsa-primary)]">
                          {totalSupport > 0 ? `${totalSupport.toLocaleString()}원` : "-"}
                        </td>
                      ) : (
                        <td className="py-4 px-6 text-right font-medium text-red-500">
                          {formatDate((company as any).deletedAt)}
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    검색 결과가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manage Modal */}
      {selectedCompany && (
        <DBManageModal
          company={selectedCompany}
          onClose={() => {
            setSelectedCompany(null);
            handleRefresh();
          }}
        />
      )}

      {/* Deleted Manage Modal */}
      {selectedDeletedCompany && (
        <DeletedDBManageModal
          company={selectedDeletedCompany}
          onRefresh={handleRefresh}
          onClose={() => {
            setSelectedDeletedCompany(null);
          }}
        />
      )}

      {/* New Company Modal */}
      {isNewCompanyModalOpen && (
        <NewCompanyModal
          onClose={() => setIsNewCompanyModalOpen(false)}
          onAdd={async (newCompanyOrCompanies) => {
            if (Array.isArray(newCompanyOrCompanies)) {
              await companyService.addCompanies(newCompanyOrCompanies);
            } else {
              await companyService.addCompany(newCompanyOrCompanies);
            }
            await handleRefresh();
            setIsNewCompanyModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
