import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import { Company } from "@/data/mockData";
import { supabase } from "./supabaseClient";

export type ExcelUploadData = {
  id: string;
  fileName: string;
  fileSize: number;
  fileUrl?: string;
  sheetName: string;
  totalRows: number;
  parsedData: Record<string, any>[];
  columnHeaders: string[];
  createdAt: string;
};

export const excelService = {
  /**
   * Extracts password from filename if it ends with _PWXXXX or _XXXX pattern.
   * e.g., "file_PW1203.xlsx" → "1203", "file_2093.xlsx" → "2093"
   */
  extractPasswordFromFileName(fileName: string): string | undefined {
    // Match _PWXXXX.xlsx pattern first
    const pwMatch = fileName.match(/_PW(\d{4,})\.(xlsx|xls)$/i);
    if (pwMatch) return pwMatch[1];
    
    // Match _XXXX.xlsx pattern (4+ digits at end before extension)
    const numMatch = fileName.match(/_(\d{4,})\.(xlsx|xls)$/i);
    if (numMatch) return numMatch[1];
    
    return undefined;
  },

  /**
   * Removes password suffix from filename for display.
   * e.g., "file_PW1203.xlsx" → "file.xlsx"
   */
  cleanFileName(fileName: string): string {
    return fileName.replace(/_PW\d+(\.(xlsx|xls))$/i, "$1");
  },
  /**
   * Parses an uploaded Excel file on the client side and extracts company details.
   * For encrypted files, calls server-side API to decrypt first.
   */
  async parseUploadFile(file: File, password?: string): Promise<Partial<Company>[]> {
    console.log(`[ExcelService] parseUploadFile start: ${file.name} (${file.size} bytes), password=${password ? "****" : "none"}`);

    let arrayBuffer: ArrayBuffer;

    // Try client-side parsing first (works for non-encrypted files)
    try {
      arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      console.log(`[ExcelService] Client-side parse succeeded, sheets: ${workbook.SheetNames}`);
      return this.parseWorkbook(workbook);
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      console.warn(`[ExcelService] Client-side parse failed: ${errMsg}`);
      // Broaden encryption detection keywords
      const isEncryptRelated = /password|encrypt|decrypt|암호| Protected|ole|cfb/i.test(errMsg);
      if (!password || !isEncryptRelated) {
        console.error(`[ExcelService] Throwing non-password error:`, err);
        throw err;
      }
      console.log(`[ExcelService] File appears encrypted, trying server-side decryption...`);
    }

    // File is encrypted - try server-side decryption via Python API
    try {
      // Convert file to base64
      const buf = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buf).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );
      console.log(`[ExcelService] Calling /api/py-decrypt, base64 length: ${base64.length}`);

      const response = await fetch("/api/py-decrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: base64, password }),
      });

      console.log(`[ExcelService] API response status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[ExcelService] API error response:`, errorData);
        throw new Error(errorData.error || `서버 응답 오류 (${response.status})`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "비밀번호 해제 실패");
      }

      // Decode base64 to buffer
      const binaryString = atob(result.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      console.log(`[ExcelService] Decrypted buffer size: ${bytes.length} bytes`);
      const workbook = XLSX.read(bytes.buffer, { type: "array" });
      console.log(`[ExcelService] Decrypted workbook parsed, sheets: ${workbook.SheetNames}`);
      return this.parseWorkbook(workbook);
    } catch (err: any) {
      console.error("[ExcelService] Server decrypt failed:", err);
      throw new Error(`암호화된 파일 처리 실패: ${err.message}`);
    }
  },

  /**
   * Parses a workbook and extracts company details.
   */
  parseWorkbook(workbook: XLSX.WorkBook): Partial<Company>[] {
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Read all rows as arrays (header: 1)
    const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (rows.length === 0) return [];

    // Find the row with the most non-empty cells → this is the header row
    let maxCols = 0;
    let headerRowIdx = 0;
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i]) continue;
      const count = rows[i].filter(
        (c: any) => c !== undefined && c !== null && String(c).trim() !== ''
      ).length;
      if (count > maxCols) {
        maxCols = count;
        headerRowIdx = i;
      }
    }

    if (maxCols === 0) return [];

    // Map column index by known field names from the detected header row
    const headers: string[] = [];
    for (let j = 0; j < maxCols; j++) {
      headers.push(
        rows[headerRowIdx][j] !== undefined
          ? String(rows[headerRowIdx][j]).trim()
          : ''
      );
    }

    const getColIndex = (...names: string[]) => {
      for (const name of names) {
        const idx = headers.indexOf(name);
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const companyNameIdx = getColIndex("기업명", "업체명", "회사명", "상호");
    const brnIdx = getColIndex("사업자등록번호", "사업자번호", "등록번호");
    const locationIdx = getColIndex("소재지", "주소", "위치");
    const supportFieldIdx = getColIndex("지원분야", "신청분야", "사업분야");
    const programNameIdx = getColIndex("지원사업명", "사업명", "지원사업");
    const projectNameIdx = getColIndex("지원과제명", "과제명", "지원과제");

    // Data rows after the header row
    const dataRows = rows.slice(headerRowIdx + 1).filter(
      (row) =>
        row &&
        row.some(
          (c: any) => c !== undefined && c !== null && String(c).trim() !== ''
        )
    );

    const cleanStr = (val: unknown): string => {
      if (!val) return "";
      return String(val).trim();
    };

    return dataRows.map((row, index) => ({
      id: `upload-${Date.now()}-${index}`,
      companyName:
        companyNameIdx >= 0 ? cleanStr(row[companyNameIdx]) : "",
      businessNumber:
        brnIdx >= 0
          ? cleanStr(row[brnIdx]).replace(/[^0-9]/g, "")
          : "",
      location: locationIdx >= 0 ? cleanStr(row[locationIdx]) : "",
      supportField:
        supportFieldIdx >= 0 ? cleanStr(row[supportFieldIdx]) : "",
      appliedProgramName:
        programNameIdx >= 0 ? cleanStr(row[programNameIdx]) : "",
      appliedProjectName:
        projectNameIdx >= 0 ? cleanStr(row[projectNameIdx]) : "",
    }));
  },

  /**
   * Generates a styled Excel sheet containing duplicate verification results for download.
   */
  async exportReport(companies: Company[]): Promise<Blob> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("중복검증 결과");

    // Define column headers
    worksheet.columns = [
      { header: "검증 결과", key: "matchStatus", width: 18 },
      { header: "매칭율", key: "matchScore", width: 12 },
      { header: "신청 기업명", key: "companyName", width: 25 },
      { header: "사업자등록번호", key: "businessNumber", width: 20 },
      { header: "소재지", key: "location", width: 40 },
      { header: "지원분야", key: "supportField", width: 15 },
      { header: "지원사업명", key: "appliedProgramName", width: 25 },
      { header: "지원과제명", key: "appliedProjectName", width: 25 },
      { header: "기존 DB 기업명", key: "dbCompanyName", width: 25 },
      { header: "유효 누적 지원금액", key: "accumulatedAmount", width: 22 },
      { header: "시스템 분석 메모", key: "systemNote", width: 50 },
    ];

    // Populate rows
    companies.forEach((company) => {
      const validTotal = company.histories
        .filter((h) => h.status !== "포기" && h.status !== "제외")
        .reduce((sum, h) => sum + h.supportAmount, 0);

      let matchStatusStr = "신규 요청 (안전)";
      if (company.isDuplicateSuspect) {
        matchStatusStr = "중복 의심 (분야 겹침)";
      } else if (company.matchStatus === "EXACT") {
        matchStatusStr = "확인 필요 (DB 등록)";
      } else if (company.matchStatus === "FUZZY") {
        matchStatusStr = "의심 (유사 사업자번호)";
      }

      worksheet.addRow({
        matchStatus: matchStatusStr,
        matchScore: company.matchStatus === "NEW" ? "0%" : `${company.matchScore}%`,
        companyName: company.companyName,
        businessNumber: company.businessNumber,
        location: company.location,
        supportField: company.supportField,
        appliedProgramName: company.appliedProgramName || "-",
        appliedProjectName: company.appliedProjectName || "-",
        dbCompanyName: company.dbCompanyName || "-",
        accumulatedAmount: validTotal,
        systemNote: company.systemNote || "",
      });
    });

    // Stylize the header row (GBSA blue color code: #1C4691)
    const headerRow = worksheet.getRow(1);
    headerRow.height = 26;
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "맑은 고딕", size: 11 };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1C4691" }, // #1C4691 GBSA Primary Blue
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FF1A202C" } },
        bottom: { style: "medium", color: { argb: "FF1A202C" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      };
    });

    // Align content cells and format numbers
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.height = 22;
        row.font = { name: "맑은 고딕", size: 10 };
        row.alignment = { vertical: "middle" };

        // Center alignments
        row.getCell("matchStatus").alignment = { vertical: "middle", horizontal: "center" };
        row.getCell("matchScore").alignment = { vertical: "middle", horizontal: "center" };
        row.getCell("businessNumber").alignment = { vertical: "middle", horizontal: "center" };

        // Color highlighting depending on risk
        const statusVal = row.getCell("matchStatus").value;
        if (statusVal === "중복 의심 (분야 겹침)") {
          row.getCell("matchStatus").font = { color: { argb: "FFE53E3E" }, bold: true }; // Red
        } else if (statusVal === "확인 필요 (DB 등록)") {
          row.getCell("matchStatus").font = { color: { argb: "FF3182CE" }, bold: true }; // Blue
        } else if (statusVal === "의심 (유사 사업자번호)") {
          row.getCell("matchStatus").font = { color: { argb: "FFDD6B20" }, bold: true }; // Orange
        } else {
          row.getCell("matchStatus").font = { color: { argb: "FF38A169" }, bold: true }; // Green
        }
      }
    });

    // Format the currency column
    const amountCol = worksheet.getColumn("accumulatedAmount");
    amountCol.numFmt = "#,##0\"원\"";
    amountCol.alignment = { vertical: "middle", horizontal: "right" };

    // Write array buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  },

  /**
   * Parses Excel file and returns raw data with column headers for storage.
   * For encrypted files, calls server-side API to decrypt first.
   */
  async parseRawData(file: File, password?: string): Promise<{ headers: string[]; data: Record<string, any>[]; sheetName: string }> {
    console.log(`[ExcelService] parseRawData start: ${file.name}`);

    let arrayBuffer: ArrayBuffer;

    // Try client-side parsing first
    try {
      arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      console.log(`[ExcelService] parseRawData client-side parse succeeded`);
      return this.parseRawWorkbook(workbook);
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      console.warn(`[ExcelService] parseRawData client-side parse failed: ${errMsg}`);
      const isEncryptRelated = /password|encrypt|decrypt|암호| Protected|ole|cfb/i.test(errMsg);
      if (!password || !isEncryptRelated) {
        throw err;
      }
      console.log(`[ExcelService] parseRawData file appears encrypted, trying server-side...`);
    }

    // File is encrypted - try server-side decryption via Python API
    const buf = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(buf).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    console.log(`[ExcelService] parseRawData calling /api/py-decrypt`);

    const response = await fetch("/api/py-decrypt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: base64, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `서버 응답 오류 (${response.status})`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "비밀번호 해제 실패");
    }

    const binaryString = atob(result.data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    console.log(`[ExcelService] parseRawData decrypted buffer size: ${bytes.length}`);
    const workbook = XLSX.read(bytes.buffer, { type: "array" });
    return this.parseRawWorkbook(workbook);
  },

  /**
   * Parses a workbook and returns raw data with column headers.
   */
  parseRawWorkbook(workbook: XLSX.WorkBook): { headers: string[]; data: Record<string, any>[]; sheetName: string } {
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Read all rows as arrays (header: 1)
    const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (rows.length === 0) {
      return { headers: [], data: [], sheetName };
    }

    // Find the row with the most non-empty cells → this is the header row
    // (skips title rows like row 1, 3 which have only 1-2 columns)
    let maxCols = 0;
    let headerRowIdx = 0;
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i]) continue;
      const count = rows[i].filter(
        (c: any) => c !== undefined && c !== null && String(c).trim() !== ''
      ).length;
      if (count > maxCols) {
        maxCols = count;
        headerRowIdx = i;
      }
    }

    if (maxCols === 0) {
      return { headers: [], data: [], sheetName };
    }

    // Extract header names from the identified header row
    const rawHeaders: string[] = [];
    for (let j = 0; j < maxCols; j++) {
      const cell = rows[headerRowIdx][j];
      rawHeaders.push(cell !== undefined && cell !== null ? String(cell).trim() : '');
    }

    // Data rows are those after the header row with at least one non-empty cell
    const dataRows = rows.slice(headerRowIdx + 1).filter(
      (row) =>
        row &&
        row.some((c: any) => c !== undefined && c !== null && String(c).trim() !== '')
    );

    // Find the last column index that has actual data across ALL data rows
    // This trims empty trailing columns (columns meant for the org to fill in later)
    const lastColWithData =
      dataRows.length > 0
        ? dataRows.reduce((lastCol, row) => {
            for (let j = Math.min(row.length, rawHeaders.length) - 1; j >= 0; j--) {
              if (
                row[j] !== undefined &&
                row[j] !== null &&
                String(row[j]).trim() !== ''
              ) {
                return Math.max(lastCol, j);
              }
            }
            return lastCol;
          }, -1)
        : maxCols - 1;

    if (lastColWithData < 0) {
      return { headers: rawHeaders, data: [], sheetName };
    }

    // Trim headers to only include columns up to the last data column
    const headers = rawHeaders.slice(0, lastColWithData + 1);

    // Build data objects with trimmed headers
    const data = dataRows.map((row) => {
      const obj: Record<string, any> = {};
      headers.forEach((h, i) => {
        obj[h] = i < row.length && row[i] !== undefined ? row[i] : null;
      });
      return obj;
    });

    return { headers, data, sheetName };
  },

  /**
   * Uploads file to Vercel Blob Storage and returns public URL.
   */
  async uploadFileToStorage(file: File, folder: string = "request"): Promise<string | null> {
    console.log(`[Storage] Uploading to Vercel Blob: ${file.name} (${file.size} bytes) → ${folder}/`);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const response = await fetch("/api/blob-upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error(`[Storage] Upload FAILED:`, errData.error);
        return null;
      }

      const result = await response.json();
      console.log(`[Storage] Upload OK:`, result.url);
      return result.url || null;
    } catch (err: any) {
      console.error(`[Storage] Upload error:`, err.message);
      return null;
    }
  },
};
