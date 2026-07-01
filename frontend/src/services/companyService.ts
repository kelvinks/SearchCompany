/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Company, SupportHistory, mockCompanies } from "@/data/mockData";
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { matchingService } from "./matchingService";
import { normalizeBusinessNumber } from "@/utils/format";

export type SkippedMissingField = {
  companyName: string;
  businessNumber: string;
  missingFields: string[];
};

export type DuplicateEntry = {
  input: Partial<Company>;
  existing: Company;
};

export type BulkAddResult = {
  added: Company[];
  skippedMissingFields: SkippedMissingField[];
  duplicates: DuplicateEntry[];
};

const REQUIRED_COMPANY_FIELDS = [
  { key: "companyName" as const, label: "기업명" },
  { key: "businessNumber" as const, label: "사업자등록번호" },
];

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
  if (co.businessNumber !== undefined) dbCo.business_number = normalizeBusinessNumber(co.businessNumber);
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
  if (l.brn !== undefined) dbL.business_number = normalizeBusinessNumber(l.brn);
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
        try {
          const res = await this.addCompany(c);
          added.push(res);
        } catch (err) {
          console.warn(`[addCompanies] Skipping company "${c.companyName}":`, err);
        }
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

  // Batch registration with validation & duplicate detection
  async addCompaniesWithValidation(
    newCompanies: Omit<Company, "id" | "matchStatus" | "matchScore">[]
  ): Promise<BulkAddResult> {
    const result: BulkAddResult = {
      added: [],
      skippedMissingFields: [],
      duplicates: [],
    };

    // Step 1: validate required fields
    const validCompanies: (Omit<Company, "id" | "matchStatus" | "matchScore">)[] = [];
    for (const c of newCompanies) {
      const missingFields = REQUIRED_COMPANY_FIELDS
        .filter(f => !c[f.key] || String(c[f.key]).trim() === '')
        .map(f => f.label);
      if (missingFields.length > 0) {
        result.skippedMissingFields.push({
          companyName: c.companyName || '이름 없음',
          businessNumber: c.businessNumber || '',
          missingFields,
        });
      } else {
        validCompanies.push(c);
      }
    }

    // Step 2: check duplicates (by business number)
    if (isSupabaseConfigured && supabase) {
      const brns = [...new Set(validCompanies.map(c => normalizeBusinessNumber(c.businessNumber)))];
      const { data: existingRows } = await supabase
        .from("companies")
        .select("*, histories:support_histories(*)")
        .in("business_number", brns);

      const existingMap = new Map(
        (existingRows || []).map(r => [r.business_number, mapDbCompany(r)])
      );

      const toInsert: typeof validCompanies = [];
      for (const c of validCompanies) {
        const brn = normalizeBusinessNumber(c.businessNumber);
        const existing = existingMap.get(brn);
        if (existing) {
          result.duplicates.push({ input: c, existing });
        } else {
          toInsert.push(c);
        }
      }

      for (const c of toInsert) {
        try {
          const res = await this.addCompany(c);
          result.added.push(res);
        } catch (err) {
          console.warn(`[addCompanies] Error adding "${c.companyName}":`, err);
        }
      }
    } else {
      const companies = await this.getCompanies();
      const existingMap = new Map(
        companies.map(c => [normalizeBusinessNumber(c.businessNumber), c])
      );

      const toCreate: Company[] = [];
      for (const c of validCompanies) {
        const brn = normalizeBusinessNumber(c.businessNumber);
        const existing = existingMap.get(brn);
        if (existing) {
          result.duplicates.push({ input: c, existing });
        } else {
          toCreate.push({
            ...c,
            id: `c-bulk-${Date.now()}-${toCreate.length}`,
            matchStatus: "NEW",
            matchScore: 0,
            histories: c.histories || [],
          } as Company);
        }
      }
      const updated = [...toCreate, ...companies];
      this.saveCompanies(updated);
      result.added = toCreate;
    }

    return result;
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
    title?: string;
    description?: string;
    uploadNote?: string;
    orgName?: string;
    docNum?: string;
    programName?: string;
  }): Promise<any | null> {
    if (!isSupabaseConfigured || !supabase) {
      const stored = localStorage.getItem("gbsa_excel_uploads");
      const uploads = stored ? JSON.parse(stored) : [];
      const newUpload = {
        id: `excel-${Date.now()}`,
        ...upload,
        program_name: upload.programName || null,
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
        sheet_title: upload.title || null,
        sheet_description: upload.description || null,
        upload_note: upload.uploadNote || null,
        org_name: upload.orgName || null,
        doc_num: upload.docNum || null,
        program_name: upload.programName || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding excel upload:", error);
      throw error;
    }

    return data;
  },

  async updateExcelUpload(
    id: string,
    updates: {
      parsedData: Record<string, any>[];
      columnHeaders: string[];
      totalRows: number;
      title?: string;
      description?: string;
      fileUrl?: string;
    }
  ): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) {
      const stored = localStorage.getItem("gbsa_excel_uploads");
      const uploads = stored ? JSON.parse(stored) : [];
      const idx = uploads.findIndex((u: any) => u.id === id);
      if (idx >= 0) {
        uploads[idx].parsed_data = updates.parsedData;
        uploads[idx].column_headers = updates.columnHeaders;
        uploads[idx].total_rows = updates.totalRows;
        uploads[idx].sheet_title = updates.title || null;
        uploads[idx].sheet_description = updates.description || null;
        if (updates.fileUrl !== undefined) uploads[idx].file_url = updates.fileUrl;
        localStorage.setItem("gbsa_excel_uploads", JSON.stringify(uploads));
      }
      return true;
    }

    const supabaseUpdates: Record<string, any> = {
      parsed_data: updates.parsedData,
      column_headers: updates.columnHeaders,
      total_rows: updates.totalRows,
      sheet_title: updates.title || null,
      sheet_description: updates.description || null,
    };
    if (updates.fileUrl !== undefined) supabaseUpdates.file_url = updates.fileUrl;

    const { error } = await supabase
      .from("excel_uploads")
      .update(supabaseUpdates)
      .eq("id", id);

    if (error) {
      console.error("Error updating excel upload:", error);
      return false;
    }

    return true;
  },

  async updateExcelUploadMeta(
    id: string,
    meta: {
      orgName?: string;
      docNum?: string;
      sendDate?: string;
      requestDate?: string;
      uploadNote?: string;
    }
  ): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) {
      const stored = localStorage.getItem("gbsa_excel_uploads");
      const uploads = stored ? JSON.parse(stored) : [];
      const idx = uploads.findIndex((u: any) => u.id === id);
      if (idx >= 0) {
        if (meta.orgName !== undefined) uploads[idx].org_name = meta.orgName;
        if (meta.docNum !== undefined) uploads[idx].doc_num = meta.docNum;
        if (meta.sendDate !== undefined) uploads[idx].send_date = meta.sendDate;
        if (meta.requestDate !== undefined) uploads[idx].request_date = meta.requestDate;
        if (meta.uploadNote !== undefined) uploads[idx].upload_note = meta.uploadNote;
        localStorage.setItem("gbsa_excel_uploads", JSON.stringify(uploads));
      }
      return true;
    }

    const { error } = await supabase
      .from("excel_uploads")
      .update({
        org_name: meta.orgName ?? undefined,
        doc_num: meta.docNum ?? undefined,
        send_date: meta.sendDate ?? undefined,
        request_date: meta.requestDate ?? undefined,
        upload_note: meta.uploadNote ?? undefined,
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating excel upload meta:", error);
      return false;
    }

    return true;
  },

  async deleteExcelUpload(id: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) {
      const stored = localStorage.getItem("gbsa_excel_uploads");
      const uploads = stored ? JSON.parse(stored) : [];
      const filtered = uploads.filter((u: any) => u.id !== id);
      localStorage.setItem("gbsa_excel_uploads", JSON.stringify(filtered));
      return true;
    }

    // 삭제할 업로드의 파일명 조회 (관련 search_logs 찾기 위해)
    const { data: upload } = await supabase
      .from("excel_uploads")
      .select("file_name")
      .eq("id", id)
      .single();

    // 관련 BATCH search_logs 삭제
    if (upload?.file_name) {
      const { error: logError } = await supabase
        .from("search_logs")
        .delete()
        .eq("type", "BATCH")
        .eq("title", upload.file_name);

      if (logError) {
        console.error("Error deleting related search logs:", logError);
      }
    }

    // excel_uploads 삭제
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

  // ==================== Inquiry Companies (from BATCH search logs) ====================

  async cleanupInquiryCompanies(): Promise<number> {
    let removedCount = 0;

    if (isSupabaseConfigured && supabase) {
      const { data: logs, error } = await supabase
        .from("search_logs")
        .select("id, additional_data, description")
        .eq("type", "BATCH");

      if (error) {
        console.error("Error fetching logs for cleanup:", error);
        return 0;
      }

      for (const log of (logs || [])) {
        let needsUpdate = false;
        const updateData: any = {};

        // additional_data.results 정리
        if (log.additional_data?.results) {
          const original = log.additional_data.results;
          const filtered = original.filter((r: any) => r.business_number || r.businessNumber);
          if (filtered.length < original.length) {
            removedCount += original.length - filtered.length;
            updateData.additional_data = { ...log.additional_data, results: filtered };
            needsUpdate = true;
          }
        }

        // description JSON에서 results 제거 (additional_data가 있으면 description의 results는 불필요)
        if (log.description && log.additional_data?.results) {
          try {
            const parsed = JSON.parse(log.description);
            if (parsed.results) {
              delete parsed.results;
              updateData.description = JSON.stringify(parsed);
              needsUpdate = true;
            }
          } catch {
            // ignore
          }
        }

        if (needsUpdate) {
          await supabase
            .from("search_logs")
            .update(updateData)
            .eq("id", log.id);
        }
      }
    }

    if (isClient) {
      const stored = localStorage.getItem("gbsa_duplicate_search_logs");
      if (stored) {
        try {
          const logs: SearchLog[] = JSON.parse(stored);
          let changed = false;
          for (const log of logs) {
            if (log.type !== "BATCH") continue;
            const addData = log.additionalData as any;
            if (!addData || Object.keys(addData).length === 0) {
              // additionalData가 없으면 description에서 results 제거
              if (log.description) {
                try {
                  const parsed = JSON.parse(log.description);
                  if (parsed.results) {
                    delete parsed.results;
                    log.description = JSON.stringify(parsed);
                    changed = true;
                  }
                } catch {}
              }
              continue;
            }
            if (!addData.results) continue;
            const original = addData.results as Company[];
            const filtered = original.filter((r) => r.businessNumber?.trim());
            if (filtered.length === original.length) continue;
            removedCount += original.length - filtered.length;
            addData.results = filtered;
            changed = true;
          }
          if (changed) {
            localStorage.setItem("gbsa_duplicate_search_logs", JSON.stringify(logs));
          }
        } catch {
          // ignore
        }
      }
    }

    return removedCount;
  },

  async getInquiryCompanies(limit = 20, options?: {
    cursor?: { createdAt: string; id: string };
    searchTerm?: string;
  }): Promise<{
    companies: Company[];
    nextCursor?: { createdAt: string; id: string };
    total: number;
  }> {
    const { cursor, searchTerm } = options || {};

    // DB에서 BATCH 로그를 커서 기반으로 순차 조회
    let query = supabase!
      .from("search_logs")
      .select("*")
      .eq("type", "BATCH")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (cursor) {
      query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
    }

    // 검색 시 더 많은 로그를 가져옴 (중복 제거 후 검색 결과 확보)
    const fetchMultiplier = searchTerm ? 10 : 3;
    const fetchLimit = Math.max(limit * fetchMultiplier, 60);
    query = query.limit(fetchLimit);

    const { data: logs, error } = await query;

    if (error) {
      console.error("Error fetching BATCH logs:", error);
      return { companies: [], total: 0 };
    }

    if (!logs || logs.length === 0) {
      return { companies: [], total: 0 };
    }

    const allResults: { company: Company; logYear: string }[] = [];

    for (const log of logs) {
      const mapped = mapDbSearchLog(log);
      let results: Company[] | undefined;

      if (mapped.additionalData && (mapped.additionalData as any).results) {
        results = (mapped.additionalData as any).results;
      } else if (!mapped.additionalData && mapped.description) {
        try {
          const parsed = JSON.parse(mapped.description);
          if (parsed.results) {
            results = parsed.results;
          }
        } catch {
          // ignore
        }
      }

      const sourceFile = mapped.title || "";
      const logYear = this.extractYear(sourceFile, mapped.createdAt);

      if (results && Array.isArray(results)) {
        for (const r of results.filter((r) => r.businessNumber?.trim())) {
          allResults.push({ company: r, logYear });
        }
      }
    }

    // 검색 필터링 (회사명 또는 사업자번호)
    let filtered = allResults;
    if (searchTerm) {
      const q = searchTerm.toLowerCase().replace(/-/g, "");
      filtered = allResults.filter(({ company }) => {
        const name = (company.companyName || "").toLowerCase();
        const brn = (company.businessNumber || "").replace(/-/g, "");
        return name.includes(q) || brn.includes(q);
      });
    }

    // 년도 + 지원사업명 + 지원과제명 + 사업자번호 기준 중복 제거
    const seen = new Set<string>();
    const deduplicated = filtered.filter(({ company, logYear }) => {
      const year = logYear || (company as any).year || "";
      const program = (company as any).appliedProgramName || "";
      const project = (company as any).appliedProjectName || "";
      const key = `${year}_${normalizeBusinessNumber(company.businessNumber)}_${program}_${project}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // 요청된 limit만큼 잘라서 반환
    const sliced = deduplicated.slice(0, limit);

    // 다음 커서: 가져온 로그 중 마지막 로그 기준
    const lastLog = logs[logs.length - 1];
    const nextCursor = logs.length >= fetchLimit
      ? { createdAt: lastLog.created_at, id: lastLog.id }
      : undefined;

    return {
      companies: sliced.map(({ company }) => company),
      nextCursor,
      total: deduplicated.length,
    };
  },

  // 특정 기업의 조회요청 이력 조회 (사업자번호 기준)
  async getCompanyInquiryRequests(businessNumber: string): Promise<{
    fileName: string;
    sendDate: string;
    requestDate: string;
    orgName: string;
    docNum: string;
    appliedProgramName: string;
    appliedProjectName: string;
    matchStatus: string;
  }[]> {
    if (!isSupabaseConfigured || !supabase) return [];

    const normalizedBrn = normalizeBusinessNumber(businessNumber);

    // BATCH 로그 조회
    const { data: logs, error } = await supabase
      .from("search_logs")
      .select("title, created_at, additional_data, description")
      .eq("type", "BATCH")
      .order("created_at", { ascending: false });

    if (error || !logs) return [];

    // excel_uploads에서 메타데이터 조회 (파일명 기준 매칭)
    const { data: uploads } = await supabase
      .from("excel_uploads")
      .select("file_name, org_name, doc_num, send_date, request_date");

    const uploadMeta = new Map<string, { orgName: string; docNum: string; sendDate: string; requestDate: string }>();
    for (const u of (uploads || [])) {
      uploadMeta.set(u.file_name, {
        orgName: u.org_name || "",
        docNum: u.doc_num || "",
        sendDate: u.send_date || "",
        requestDate: u.request_date || "",
      });
    }

    const requests: {
      fileName: string;
      sendDate: string;
      requestDate: string;
      orgName: string;
      docNum: string;
      appliedProgramName: string;
      appliedProjectName: string;
      matchStatus: string;
    }[] = [];

    for (const log of logs) {
      let results: any[] | undefined;

      if (log.additional_data?.results) {
        results = log.additional_data.results;
      } else if (log.description) {
        try {
          const parsed = JSON.parse(log.description);
          if (parsed.results) results = parsed.results;
        } catch {}
      }

      if (!results || !Array.isArray(results)) continue;

      const meta = uploadMeta.get(log.title) || { orgName: "", docNum: "", sendDate: "", requestDate: "" };

      for (const r of results) {
        const rBrn = normalizeBusinessNumber(r.businessNumber || "");
        if (rBrn === normalizedBrn) {
          requests.push({
            fileName: log.title || "",
            sendDate: meta.sendDate || (log.created_at ? new Date(log.created_at).toISOString().slice(0, 10) : ""),
            requestDate: meta.requestDate || "",
            orgName: meta.orgName,
            docNum: meta.docNum,
            appliedProgramName: r.appliedProgramName || "",
            appliedProjectName: r.appliedProjectName || "",
            matchStatus: r.matchStatus || "",
          });
        }
      }
    }

    return requests;
  },

  // 파일명/사업명에서 년도 추출 (YYMMDD, 4자리 년도 등)
  extractYear(sourceFile: string, createdAt?: string): string {
    // 1. 파일명에서 YYMMDD 형식 추출 (파일명 끝: _YYMMDD 또는 -YYMMDD 또는 공백YYMMDD)
    if (sourceFile) {
      const yymmddMatch = sourceFile.match(/(\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(?:\.\w+)?$/);
      if (yymmddMatch) {
        const yy = parseInt(yymmddMatch[1], 10);
        return String(yy >= 50 ? 1900 + yy : 2000 + yy);
      }
      // 4자리 년도 추출 (2020~2029)
      const fullYearMatch = sourceFile.match(/(20[2-3]\d)/);
      if (fullYearMatch) {
        return fullYearMatch[1];
      }
    }

    // 2. 로그 생성시간에서 년도 추출
    if (createdAt) {
      return String(new Date(createdAt).getFullYear());
    }

    return "";
  },

  // 사업자등록번호로 company_id 조회 (지원이력 벌크등록용)
  async getCompanyIdByBusinessNumber(businessNumber: string): Promise<string | null> {
    if (!isSupabaseConfigured || !supabase) {
      // Supabase 미연결 시 로컬 데이터에서 조회
      if (!isClient) return null;
      const companies = await this.getCompanies();
      const normalizedNum = normalizeBusinessNumber(businessNumber);
      const found = companies.find((c) => normalizeBusinessNumber(c.businessNumber) === normalizedNum);
      return found?.id ?? null;
    }

    // 숫자만 추출하여 정규화
    const normalizedNum = businessNumber.replace(/[^\d]/g, '');

    const { data, error } = await supabase
      .from("companies")
      .select("id")
      .eq("business_number", normalizedNum)
      .single();

    if (error || !data) {
      console.warn("Company lookup failed for BRN:", businessNumber, error?.message);
      return null;
    }
    return data.id;
  },
};
