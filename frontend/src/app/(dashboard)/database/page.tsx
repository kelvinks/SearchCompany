"use client";

import { useState, useEffect } from "react";
import { Company } from "@/data/mockData";
import DBManageModal from "@/components/modal/DBManageModal";
import { formatBusinessNumber, extractSiGun } from "@/utils/format";
import BusinessNumber from "@/components/BusinessNumber";
import NewCompanyModal from "@/components/modal/NewCompanyModal";
import { companyService } from "@/services/companyService";
import { excelService } from "@/services/excelService";

export default function DatabasePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isNewCompanyModalOpen, setIsNewCompanyModalOpen] = useState(false);
  const [locationFilter, setLocationFilter] = useState("");
  const [fieldFilter, setFieldFilter] = useState("");

  useEffect(() => {
    const loadData = async () => {
      const data = await companyService.getCompanies();
      setCompanies(data);
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
  };

  const uniqueLocations = Array.from(
    new Set(companies.map(c => extractSiGun(c.location)).filter(Boolean))
  ).sort();

  const uniqueFields = Array.from(
    new Set(companies.map(c => c.supportField).filter(Boolean))
  ).sort();

  const filteredCompanies = companies.filter((c) => {
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-gbsa-primary)]">기업 DB 관리</h1>
          <p className="text-gray-500 mt-2">내부에 등록된 모든 기업 데이터베이스를 조회하고 관리합니다.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={handleExportAll} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg shadow-sm hover:bg-gray-50 font-medium transition-colors">
            데이터 내보내기
          </button>
          <button 
            onClick={() => setIsNewCompanyModalOpen(true)}
            className="px-4 py-2 bg-[var(--color-gbsa-primary)] text-white rounded-lg shadow-sm hover:bg-[var(--color-gbsa-secondary)] font-medium flex items-center transition-colors"
          >
            <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            신규 기업 등록
          </button>
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
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm"
          />
        </div>
        <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="w-full md:w-48 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm bg-white cursor-pointer transition-all">
          <option value="">모든 소재지</option>
          {uniqueLocations.map(loc => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>
        <select value={fieldFilter} onChange={(e) => setFieldFilter(e.target.value)} className="w-full md:w-48 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[var(--color-gbsa-primary)] focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm bg-white cursor-pointer transition-all">
          <option value="">모든 지원분야</option>
          {uniqueFields.map(field => (
            <option key={field} value={field}>{field}</option>
          ))}
        </select>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="text-lg font-semibold text-gray-800">등록된 기업 목록 <span className="text-sm font-normal text-gray-500 ml-2">총 {filteredCompanies.length}건</span></h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F1F5F9] text-gray-600 border-b border-gray-200">
              <tr>
                <th className="py-4 px-6 font-medium">기업명</th>
                <th className="py-4 px-6 font-medium">사업자등록번호</th>
                <th className="py-4 px-6 font-medium">소재지</th>
                <th className="py-4 px-6 font-medium">주요 사업(지원분야)</th>
                <th className="py-4 px-6 font-medium text-right">총 지원금액</th>
                <th className="py-4 px-6 font-medium text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCompanies.length > 0 ? (
                filteredCompanies.map((company) => {
                  const totalSupport = company.histories
                    .filter((h) => h.status !== "포기" && h.status !== "제외")
                    .reduce((sum, h) => sum + h.supportAmount, 0);

                  return (
                    <tr 
                      key={company.id} 
                      className="hover:bg-gray-50 transition-colors group"
                    >
                      <td className="py-4 px-6 font-medium text-gray-900">{company.companyName}</td>
                      <td className="py-4 px-6 font-mono text-gray-600">
                        <BusinessNumber value={company.businessNumber} />
                      </td>
                      <td className="py-4 px-6 text-gray-500">{company.location}</td>
                      <td className="py-4 px-6 text-gray-500">{company.supportField}</td>
                      <td className="py-4 px-6 text-right font-bold text-[var(--color-gbsa-primary)]">
                        {totalSupport > 0 ? `${totalSupport.toLocaleString()}원` : "-"}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button 
                          onClick={() => setSelectedCompany(company)}
                          className="px-3 py-1.5 text-sm font-medium text-[var(--color-gbsa-primary)] bg-blue-50 hover:bg-[var(--color-gbsa-primary)] hover:text-white rounded-lg transition-colors"
                        >
                          관리
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
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
