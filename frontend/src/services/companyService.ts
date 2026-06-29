/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Company, SupportHistory, mockCompanies } from "@/data/mockData";
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { matchingService } from "./matchingService";

export type SearchLog = {
  id: string;
  type: "BATCH" | "MANUAL";
  riskLevel: "High Risk" | "Safe" | "Manual Search";
  title: string;
  createdAt: string; // ISO String format
  orgName?: string;
  docNum?: string;
  description?: string;
  totalCount?: number;
  duplicateCount?: number;
  brn?: string;
  additionalData?: any;
};

const STORAGE_KEYS = {
  COMPANIES: "gbsa_duplicate_companies",
  SEARCH_LOGS: "gbsa_duplicate_search_logs",
};

// Initial default search logs to showcase the UI
const initialSearchLogs: SearchLog[] = [
  {
    id: "log-1",
    type: "BATCH",
    riskLevel: "High Risk",
    title: "Q3_Funding_Applicants.xlsx",
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 mins ago
    orgName: "경기도청",
    docNum: "GBSA-2024-089",
    description: "2024년 하반기 창업지원사업 대상자 검증 요청",
    totalCount: 3,
    duplicateCount: 2,
  },
  {
    id: "log-2",
    type: "BATCH",
    riskLevel: "Safe",
    title: "Tech_Startup_List_2023.csv",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    orgName: "중소벤처기업부",
    docNum: "MSS-23-V12",
    description: "신규 벤처기업 리스트 데이터베이스 동기화",
    totalCount: 128,
    duplicateCount: 0,
  },
  {
    id: "log-3",
    type: "MANUAL",
    riskLevel: "Manual Search",
    title: "삼성전자(주)",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
    brn: "124-81-00998",
  },
  {
    id: "log-4",
    type: "MANUAL",
    riskLevel: "Manual Search",
    title: "(주)경기테크노밸리",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
    brn: "123-45-67890",
  }
];

// Helper to check if window is available (client-side)
const isClient = typeof window !== "undefined";

// Mappers for Supabase to map snake_case database schema to camelCase front-end types
// NOTE: "location" fields in DB and types represent the FULL detailed address (e.g. 경기도 수원시 ...). 
// The city/county (소재지) is derived dynamically on the frontend via extractSiGun(address).
function mapDbCompany(dbCo: any): Company {
  return {
    id: dbCo.id,
    businessNumber: dbCo.business_number || "",
    companyName: dbCo.company_name,
    location: dbCo.location || "",
    mainProducts: dbCo.main_products || "",
    supportField: dbCo.support_field || "",
    matchStatus: "NEW", // Default status, evaluated by matchingService on upload
    matchScore: 0,
    histories: (dbCo.histories || []).map((h: any) => ({
      id: h.id,
      brn: h.business_number || h.brn || undefined,
      year: h.year,
      programName: h.program_name,
      projectName: h.project_name || undefined,
      status: h.status,
      selectedAmount: Number(h.selected_amount) || 0,
      supportAmount: Number(h.support_amount) || 0,
      notes: h.notes || undefined,
    })).sort((a: any, b: any) => b.year.localeCompare(a.year)),
    ...(dbCo.additional_data || {}),
  };
}

function mapDbDeletedCompany(dbCo: any): Company & { deletedAt?: string } {
  return {
    ...mapDbCompany(dbCo),
    deletedAt: dbCo.deleted_at || undefined,
  };
}

function mapToDbCompany(co: Partial<Company>) {
  const dbCo: any = {};
  if (co.companyName !== undefined) dbCo.company_name = co.companyName;
  if (co.businessNumber !== undefined) dbCo.business_number = co.businessNumber;
  if (co.location !== undefined) dbCo.location = co.location;
  if (co.mainProducts !== undefined) dbCo.main_products = co.mainProducts;
  if (co.supportField !== undefined) dbCo.support_field = co.supportField;
  
  // Save UI/UX match fields under jsonb additional_data
  const extraFields: any = {};
  if (co.requestedAmount !== undefined) extraFields.requestedAmount = co.requestedAmount;
  if (co.dbCompanyName !== undefined) extraFields.dbCompanyName = co.dbCompanyName;
  if (co.dbLocation !== undefined) extraFields.dbLocation = co.dbLocation;
  if (co.dbSupportField !== undefined) extraFields.dbSupportField = co.dbSupportField;
  if (co.dbMainProducts !== undefined) extraFields.dbMainProducts = co.dbMainProducts;
  if (co.systemNote !== undefined) extraFields.systemNote = co.systemNote;
  if (co.matchStatus !== undefined) extraFields.matchStatus = co.matchStatus;
  if (co.matchScore !== undefined) extraFields.matchScore = co.matchScore;
  
  dbCo.additional_data = extraFields;
  return dbCo;
}

function mapToDbHistory(h: Partial<SupportHistory>) {
  const dbH: any = {};
  if (h.year !== undefined) dbH.year = h.year;
  if (h.programName !== undefined) dbH.program_name = h.programName;
  if (h.projectName !== undefined) dbH.project_name = h.projectName;
  if (h.status !== undefined) dbH.status = h.status;
  if (h.selectedAmount !== undefined) dbH.selected_amount = h.selectedAmount;
  if (h.supportAmount !== undefined) dbH.support_amount = h.supportAmount;
  if (h.notes !== undefined) dbH.notes = h.notes;
  return dbH;
}

function mapDbSearchLog(l: any): SearchLog {
  return {
    id: l.id,
    type: l.type,
    riskLevel: l.risk_level,
    title: l.title,
    createdAt: l.created_at,
    orgName: l.org_name || undefined,
    docNum: l.doc_num || undefined,
    description: l.description || undefined,
    totalCount: l.total_count !== null && l.total_count !== undefined ? Number(l.total_count) : undefined,
    duplicateCount: l.duplicate_count !== null && l.duplicate_count !== undefined ? Number(l.duplicate_count) : undefined,
    brn: l.business_number || undefined,
    additionalData: l.additional_data || undefined,
  };
}

function mapToDbSearchLog(l: Partial<SearchLog>) {
  const dbL: any = {};
  if (l.type !== undefined) dbL.type = l.type;
  if (l.riskLevel !== undefined) dbL.risk_level = l.riskLevel;
  if (l.title !== undefined) dbL.title = l.title;
  if (l.orgName !== undefined) dbL.org_name = l.orgName;
  if (l.docNum !== undefined) dbL.doc_num = l.docNum;
  if (l.description !== undefined) dbL.description = l.description;
  if (l.totalCount !== undefined) dbL.total_count = l.totalCount;
  if (l.duplicateCount !== undefined) dbL.duplicate_count = l.duplicateCount;
  if (l.brn !== undefined) dbL.business_number = l.brn;
  if (l.additionalData !== undefined) dbL.additional_data = l.additionalData;
  return dbL;
}

export const companyService = {
  // Load companies
  async getCompanies(): Promise<Company[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("companies")
        .select("*, histories:support_histories(*)")
        .order("created_at", { ascending: false });
        
      if (error) {
        console.error("Error fetching companies from Supabase:", error);
        return [];
      }
      return (data || []).map(mapDbCompany);
    }

    if (!isClient) return mockCompanies;
    const stored = localStorage.getItem(STORAGE_KEYS.COMPANIES);
    if (!stored) {
      localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(mockCompanies));
      return mockCompanies;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return mockCompanies;
    }
  },

  // Save companies
  saveCompanies(companies: Company[]): void {
    if (isSupabaseConfigured) return; // Managed directly in PostgreSQL database
    if (!isClient) return;
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(companies));
  },

  // Add a company
  async addCompany(company: Omit<Company, "id" | "matchStatus" | "matchScore">): Promise<Company> {
    if (isSupabaseConfigured && supabase) {
      const dbCo = mapToDbCompany(company);
      const { data, error } = await supabase
        .from("companies")
        .insert(dbCo)
        .select()
        .single();
        
      if (error) {
        console.error("Error adding company to Supabase:", error);
        throw error;
      }

      if (company.histories && company.histories.length > 0) {
        const dbHistories = company.histories.map((h) => ({
          ...mapToDbHistory(h),
          company_id: data.id,
        }));
        const { error: histError } = await supabase
          .from("support_histories")
          .insert(dbHistories);
        if (histError) console.error("Error inserting histories for added company:", histError);
      }

      // Refetch with histories
      const { data: refetched, error: refetchError } = await supabase
        .from("companies")
        .select("*, histories:support_histories(*)")
        .eq("id", data.id)
        .single();
        
      if (refetchError) {
        console.error("Error refetching added company:", refetchError);
        return mapDbCompany(data);
      }
      return mapDbCompany(refetched);
    }

    const companies = await this.getCompanies();
    const newCompany: Company = {
      ...company,
      id: `c-${Date.now()}`,
      matchStatus: "NEW",
      matchScore: 0,
      histories: company.histories || [],
    };
    companies.unshift(newCompany);
    this.saveCompanies(companies);
    return newCompany;
  },

  // Add multiple companies (batch registration)
  async addCompanies(newCompanies: Omit<Company, "id" | "matchStatus" | "matchScore">[]): Promise<Company[]> {
    if (isSupabaseConfigured && supabase) {
      const added: Company[] = [];
      for (const c of newCompanies) {
        const res = await this.addCompany(c);
        added.push(res);
      }
      return added;
    }

    const companies = await this.getCompanies();
    const added: Company[] = newCompanies.map((c, index) => ({
      ...c,
      id: `c-bulk-${Date.now()}-${index}`,
      matchStatus: "NEW",
      matchScore: 0,
      histories: c.histories || [],
    }));
    const updated = [...added, ...companies];
    this.saveCompanies(updated);
    return added;
  },

  // Update company profile details
  async updateCompany(id: string, updates: Partial<Company>): Promise<Company | null> {
    if (isSupabaseConfigured && supabase) {
      const dbCo = mapToDbCompany(updates);
      const { error } = await supabase
        .from("companies")
        .update(dbCo)
        .eq("id", id);
        
      if (error) {
        console.error("Error updating company in Supabase:", error);
        return null;
      }
      
      const { data, error: refetchError } = await supabase
        .from("companies")
        .select("*, histories:support_histories(*)")
        .eq("id", id)
        .single();
        
      if (refetchError) {
        console.error("Error refetching updated company:", refetchError);
        return null;
      }
      return mapDbCompany(data);
    }

    const companies = await this.getCompanies();
    let updatedCompany: Company | null = null;
    const nextCompanies = companies.map((c) => {
      if (c.id === id) {
        updatedCompany = { ...c, ...updates };
        return updatedCompany;
      }
      return c;
    });
    if (updatedCompany) {
      this.saveCompanies(nextCompanies);
    }
    return updatedCompany;
  },

  // Delete company
  async deleteCompany(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from("companies")
        .delete()
        .eq("id", id);
      if (error) console.error("Error deleting company in Supabase:", error);
      return;
    }

    const companies = await this.getCompanies();
    const target = companies.find((c) => c.id === id);
    const filtered = companies.filter((c) => c.id !== id);
    this.saveCompanies(filtered);

    if (target) {
      const deleted = await this.getDeletedCompanies();
      deleted.push({
        ...target,
        deletedAt: new Date().toISOString()
      });
      localStorage.setItem("gbsa_deleted_companies", JSON.stringify(deleted));
    }
  },

  // Get all deleted companies
  async getDeletedCompanies(): Promise<(Company & { deletedAt?: string })[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("deleted_companies")
        .select("*, histories:deleted_support_histories(*)");
      if (error) {
        console.error("Error fetching deleted companies from Supabase:", error);
        return [];
      }
      return (data || []).map(mapDbDeletedCompany);
    }

    if (!isClient) return [];
    const localData = localStorage.getItem("gbsa_deleted_companies");
    return localData ? JSON.parse(localData) : [];
  },

  // Restore deleted company
  async restoreCompany(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.rpc("restore_company_data", {
        target_company_id: id
      });
      if (error) console.error("Error restoring company in Supabase:", error);
      return;
    }

    const deleted = await this.getDeletedCompanies();
    const target = deleted.find((c) => c.id === id);
    if (!target) return;

    // Remove from deleted and add back to main
    const nextDeleted = deleted.filter((c) => c.id !== id);
    localStorage.setItem("gbsa_deleted_companies", JSON.stringify(nextDeleted));

    const companies = await this.getCompanies();
    const { deletedAt, ...rest } = target;
    companies.push(rest);
    this.saveCompanies(companies);
  },

  // Permanently delete company from archive
  async permanentDeleteCompany(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from("deleted_companies")
        .delete()
        .eq("id", id);
      if (error) console.error("Error permanently deleting company in Supabase:", error);
      return;
    }

    const deleted = await this.getDeletedCompanies();
    const nextDeleted = deleted.filter((c) => c.id !== id);
    localStorage.setItem("gbsa_deleted_companies", JSON.stringify(nextDeleted));
  },

  // Update a specific support history row
  async updateSupportHistory(companyId: string, historyId: string, updates: Partial<SupportHistory>): Promise<Company | null> {
    if (isSupabaseConfigured && supabase) {
      const dbHist = mapToDbHistory(updates);
      const { error } = await supabase
        .from("support_histories")
        .update(dbHist)
        .eq("id", historyId);
        
      if (error) {
        console.error("Error updating support history in Supabase:", error);
        return null;
      }
      
      const { data, error: refetchError } = await supabase
        .from("companies")
        .select("*, histories:support_histories(*)")
        .eq("id", companyId)
        .single();
        
      if (refetchError) {
        console.error("Error refetching company after history update:", refetchError);
        return null;
      }
      return mapDbCompany(data);
    }

    const companies = await this.getCompanies();
    let updatedCompany: Company | null = null;
    const nextCompanies = companies.map((c) => {
      if (c.id !== companyId) return c;
      const updatedHistories = c.histories.map((h) => 
        h.id === historyId ? { ...h, ...updates } : h
      );
      updatedCompany = { ...c, histories: updatedHistories };
      return updatedCompany;
    });
    if (updatedCompany) {
      this.saveCompanies(nextCompanies);
    }
    return updatedCompany;
  },

  // Add a specific support history row
  async addSupportHistory(companyId: string, history: Omit<SupportHistory, "id">): Promise<Company | null> {
    if (isSupabaseConfigured && supabase) {
      const dbHist = {
        ...mapToDbHistory(history),
        company_id: companyId,
      };
      const { error } = await supabase
        .from("support_histories")
        .insert(dbHist);
        
      if (error) {
        console.error("Error inserting support history in Supabase:", error);
        return null;
      }
      
      const { data, error: refetchError } = await supabase
        .from("companies")
        .select("*, histories:support_histories(*)")
        .eq("id", companyId)
        .single();
        
      if (refetchError) {
        console.error("Error refetching company after history insert:", refetchError);
        return null;
      }
      return mapDbCompany(data);
    }

    const companies = await this.getCompanies();
    let updatedCompany: Company | null = null;
    const nextCompanies = companies.map((c) => {
      if (c.id !== companyId) return c;
      const newHistory: SupportHistory = {
        ...history,
        id: `h-${Date.now()}`,
      };
      updatedCompany = { ...c, histories: [newHistory, ...c.histories] };
      return updatedCompany;
    });
    if (updatedCompany) {
      this.saveCompanies(nextCompanies);
    }
    return updatedCompany;
  },

  // Delete a specific support history row
  async removeSupportHistory(companyId: string, historyId: string): Promise<Company | null> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from("support_histories")
        .delete()
        .eq("id", historyId);
        
      if (error) {
        console.error("Error deleting support history in Supabase:", error);
        return null;
      }
      
      const { data, error: refetchError } = await supabase
        .from("companies")
        .select("*, histories:support_histories(*)")
        .eq("id", companyId)
        .single();
        
      if (refetchError) {
        console.error("Error refetching company after history delete:", refetchError);
        return null;
      }
      return mapDbCompany(data);
    }

    const companies = await this.getCompanies();
    let updatedCompany: Company | null = null;
    const nextCompanies = companies.map((c) => {
      if (c.id !== companyId) return c;
      updatedCompany = { ...c, histories: c.histories.filter((h) => h.id !== historyId) };
      return updatedCompany;
    });
    if (updatedCompany) {
      this.saveCompanies(nextCompanies);
    }
    return updatedCompany;
  },

  // Get Search logs
  async getSearchLogs(): Promise<SearchLog[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("search_logs")
        .select("*")
        .order("created_at", { ascending: false });
        
      if (error) {
        console.error("Error fetching search logs from Supabase:", error);
        return [];
      }
      return (data || []).map(mapDbSearchLog);
    }

    if (!isClient) return initialSearchLogs;
    const stored = localStorage.getItem(STORAGE_KEYS.SEARCH_LOGS);
    if (!stored) {
      localStorage.setItem(STORAGE_KEYS.SEARCH_LOGS, JSON.stringify(initialSearchLogs));
      return initialSearchLogs;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return initialSearchLogs;
    }
  },

  // Add search log
  async addSearchLog(log: Omit<SearchLog, "id" | "createdAt">): Promise<SearchLog> {
    if (isSupabaseConfigured && supabase) {
      const dbLog = mapToDbSearchLog(log);
      const { data, error } = await supabase
        .from("search_logs")
        .insert(dbLog)
        .select()
        .single();
        
      if (error) {
        console.error("Error inserting search log in Supabase:", error);
        throw error;
      }
      return mapDbSearchLog(data);
    }

    if (!isClient) {
      return { ...log, id: "temp", createdAt: new Date().toISOString() };
    }
    const logs = await this.getSearchLogs();
    const newLog: SearchLog = {
      ...log,
      id: `log-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    logs.unshift(newLog);
    localStorage.setItem(STORAGE_KEYS.SEARCH_LOGS, JSON.stringify(logs));
    return newLog;
  },

  // Get matched companies for a BATCH log
  async getBatchResults(logId: string): Promise<Company[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("search_logs")
        .select("additional_data, description")
        .eq("id", logId)
        .single();
        
      if (!error && data) {
        if (data.additional_data && data.additional_data.results) {
          return data.additional_data.results;
        }
        if (data.description) {
          try {
            const parsed = JSON.parse(data.description);
            if (parsed.results) {
              return parsed.results;
            }
          } catch {
            // ignore
          }
        }
      }
    }

    if (isClient) {
      const stored = localStorage.getItem(`gbsa_batch_results_${logId}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // ignore
        }
      }
    }
    
    // Fallback/Mock generator for initial logs
    if (logId === "log-1") {
      const db = await this.getCompanies();
      const candidates: Partial<Company>[] = [
        { id: "c-b1", companyName: "삼성전자", businessNumber: "124-81-00988", location: "경기도 수원시 영통구 삼성로 129", supportField: "반도체/IT", requestedAmount: 50000000 },
        { id: "c-b2", companyName: "(주)아펙스디자인", businessNumber: "120-88-12345", location: "경기도 성남시 분당구 판교로 20", supportField: "디자인/마케팅", requestedAmount: 15000000 },
        { id: "c-b3", companyName: "테스트솔루션", businessNumber: "320-11-99887", location: "경기도 안양시 동안구 시민대로 100", supportField: "소프트웨어/IT", requestedAmount: 20000000 },
        { id: "c-b4", companyName: "동일정밀", businessNumber: "135-24-99811", location: "경기도 시흥시 공단1대로 50", supportField: "기계/제조", requestedAmount: 30000000 },
        { id: "c-b5", companyName: "그린바이오텍", businessNumber: "220-45-77611", location: "경기도 수원시 권선구 수인로 10", supportField: "바이오/의료", requestedAmount: 40000000 },
      ];
      return matchingService.matchCompanies(candidates, db);
    }
    
    if (logId === "log-3") {
      const db = await this.getCompanies();
      const candidates: Partial<Company>[] = [
        { id: "c-b6", companyName: "네이버", businessNumber: "220-81-62517", location: "경기도 성남시 분당구 불정로 6", supportField: "IT/소프트웨어", requestedAmount: 100000000 },
        { id: "c-b7", companyName: "카카오", businessNumber: "120-81-47521", location: "경기도 성남시 분당구 판교역로 166", supportField: "IT/플랫폼", requestedAmount: 80000000 },
        { id: "c-b8", companyName: "라인플러스", businessNumber: "220-88-11223", location: "경기도 성남시 분당구 황새울로 360", supportField: "IT/메신저", requestedAmount: 60000000 },
      ];
      return matchingService.matchCompanies(candidates, db);
    }

    return [];
  },

  // ==================== Excel Uploads CRUD ====================
  
  async getExcelUploads(): Promise<any[]> {
    if (!isSupabaseConfigured || !supabase) {
      const stored = localStorage.getItem("gbsa_excel_uploads");
      return stored ? JSON.parse(stored) : [];
    }

    const { data, error } = await supabase
      .from("excel_uploads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching excel uploads:", error);
      return [];
    }

    return data || [];
  },

  async getExcelUploadById(id: string): Promise<any | null> {
    if (!isSupabaseConfigured || !supabase) {
      const stored = localStorage.getItem("gbsa_excel_uploads");
      const uploads = stored ? JSON.parse(stored) : [];
      return uploads.find((u: any) => u.id === id) || null;
    }

    const { data, error } = await supabase
      .from("excel_uploads")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching excel upload:", error);
      return null;
    }

    return data;
  },

  async addExcelUpload(upload: {
    fileName: string;
    fileSize: number;
    fileUrl?: string;
    sheetName: string;
    totalRows: number;
    parsedData: Record<string, any>[];
    columnHeaders: string[];
    uploadNote?: string;
    orgName?: string;
    docNum?: string;
  }): Promise<any | null> {
    if (!isSupabaseConfigured || !supabase) {
      const stored = localStorage.getItem("gbsa_excel_uploads");
      const uploads = stored ? JSON.parse(stored) : [];
      const newUpload = {
        id: `excel-${Date.now()}`,
        ...upload,
        created_at: new Date().toISOString(),
      };
      uploads.unshift(newUpload);
      localStorage.setItem("gbsa_excel_uploads", JSON.stringify(uploads));
      return newUpload;
    }

    const { data, error } = await supabase
      .from("excel_uploads")
      .insert({
        file_name: upload.fileName,
        file_size: upload.fileSize,
        file_url: upload.fileUrl || null,
        sheet_name: upload.sheetName,
        total_rows: upload.totalRows,
        parsed_data: upload.parsedData,
        column_headers: upload.columnHeaders,
        upload_note: upload.uploadNote || null,
        org_name: upload.orgName || null,
        doc_num: upload.docNum || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding excel upload:", error);
      throw error;
    }

    return data;
  },

  async deleteExcelUpload(id: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) {
      const stored = localStorage.getItem("gbsa_excel_uploads");
      const uploads = stored ? JSON.parse(stored) : [];
      const filtered = uploads.filter((u: any) => u.id !== id);
      localStorage.setItem("gbsa_excel_uploads", JSON.stringify(filtered));
      return true;
    }

    const { error } = await supabase
      .from("excel_uploads")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting excel upload:", error);
      return false;
    }

    return true;
  },
};
