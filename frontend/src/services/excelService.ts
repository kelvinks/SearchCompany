import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import { Company } from "@/data/mockData";
import { formatBusinessNumber } from "@/utils/format";
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
  title?: string;
  description?: string;
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
  async parseUploadFile(file: File, password?: string): Promise<(Partial<Company> & { rawData?: Record<string, string> })[]> {
    console.log(`[ExcelService] parseUploadFile start: ${file.name} (${file.size} bytes), password=${password ? "****" : "none"}`);

    let arrayBuffer: ArrayBuffer;

    // Try client-side parsing first (works for non-encrypted files)
    try {
      arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      console.log(`[ExcelService] Client-side parse succeeded, sheets: ${workbook.SheetNames}`);
      const result = this.parseWorkbook(workbook);

      // If XLSX parse returns empty, try ExcelJS as fallback
      if (result.length === 0) {
        console.log(`[ExcelService] XLSX parse returned 0 companies, trying ExcelJS fallback...`);
        return this.parseBufferWithExcelJS(arrayBuffer);
      }

      return result;
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
  parseWorkbook(workbook: XLSX.WorkBook): (Partial<Company> & { rawData?: Record<string, string> })[] {
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Read all rows as arrays (header: 1)
    const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

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

    // Determine the actual column range of the header row
    let lastHeaderCol = -1;
    const headerRow = rows[headerRowIdx];
    for (let j = 0; j < headerRow.length; j++) {
      if (
        headerRow[j] !== undefined &&
        headerRow[j] !== null &&
        String(headerRow[j]).trim() !== ''
      ) {
        lastHeaderCol = j;
      }
    }
    const headerColCount = lastHeaderCol + 1;

    // Build normalized header names for matching
    const normalizeHeader = (h: string) => h.replace(/\s+/g, '').toLowerCase();

    const rawHeaders: string[] = [];
    for (let j = 0; j < headerColCount; j++) {
      rawHeaders.push(
        headerRow[j] !== undefined && headerRow[j] !== null
          ? String(headerRow[j]).trim()
          : ''
      );
    }
    const normalizedHeaders = rawHeaders.map(normalizeHeader);

    const getColIndex = (...names: string[]) => {
      const nns = names.map(normalizeHeader);
      for (const nn of nns) {
        const idx = normalizedHeaders.findIndex((h) => h.includes(nn) || nn.includes(h));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const companyNameIdx = getColIndex(
      "기업명", "업체명", "회사명", "상호", "법인명", "사업자명",
      "companyname", "company_name", "company name", "name", "company"
    );
    const brnIdx = getColIndex(
      "사업자등록번호", "사업자번호", "등록번호", "사업자등록", "법인번호",
      "businessnumber", "business_number", "business number",
      "brn", "bizno", "biz_no", "biznum", "reg_no", "registrationno"
    );
    const locationIdx = getColIndex(
      "소재지", "주소", "위치", "사업장소재지", "본점소재지",
      "address", "location", "addr", "sijuso"
    );
    const supportFieldIdx = getColIndex(
      "지원분야", "신청분야", "사업분야", "업종", "업태", "업종코드",
      "supportfield", "support_field", "field", "category", "businessfield"
    );
    const programNameIdx = getColIndex(
      "지원사업명", "사업명", "지원사업", "사업내용",
      "programname", "program_name", "program"
    );
    const projectNameIdx = getColIndex(
      "지원과제명", "과제명", "지원과제", "과제번호",
      "projectname", "project_name", "project", "task"
    );
    const mainProductsIdx = getColIndex(
      "주요제품", "제품명", "생산품", "주요생산품", "품목",
      "mainproducts", "main_products", "products", "product"
    );
    const appliedAmountIdx = getColIndex(
      "신청금액", "요청금액", "신청액",
      "appliedamount", "applied_amount", "amount", "requestedamount"
    );
    const seqNumIdx = getColIndex("연번", "순번", "번호", "no", "seq", "number");
    console.log(`[ExcelService] Detected column indices:`, { programNameIdx, projectNameIdx, brnIdx });

    const cleanStr = (val: unknown): string => {
      if (val === undefined || val === null) return "";
      return String(val).trim();
    };

    // Data rows after the header row: filter out garbage rows
    const dataRows = rows.slice(headerRowIdx + 1).filter((row) => {
      if (!row) return false;

      const filledFields = [
        companyNameIdx >= 0 && cleanStr(row[companyNameIdx]) ? row[companyNameIdx] : undefined,
        brnIdx >= 0 && cleanStr(row[brnIdx]) ? row[brnIdx] : undefined,
        locationIdx >= 0 && cleanStr(row[locationIdx]) ? row[locationIdx] : undefined,
      ].filter((v) => v !== undefined).length;

      if (filledFields < 1) return false;

      if (seqNumIdx >= 0) {
        const seqVal = cleanStr(row[seqNumIdx]);
        if (seqVal && isNaN(Number(seqVal.replace(/,/g, '')))) {
          return false;
        }
      }

      return true;
    });

    return dataRows.map((row, index) => {
      const rawData: Record<string, string> = {};
      rawHeaders.forEach((h, i) => {
        if (h) rawData[h] = i < row.length ? cleanStr(row[i]) : "";
      });

      return {
        id: `upload-${Date.now()}-${index}`,
        companyName: companyNameIdx >= 0 ? cleanStr(row[companyNameIdx]) : "",
        businessNumber:
          brnIdx >= 0
            ? cleanStr(row[brnIdx]).replace(/[^0-9]/g, "")
            : "",
        location: locationIdx >= 0 ? cleanStr(row[locationIdx]) : "",
        supportField: supportFieldIdx >= 0 ? cleanStr(row[supportFieldIdx]) : "",
        mainProducts: mainProductsIdx >= 0 ? cleanStr(row[mainProductsIdx]) : "",
        appliedProgramName: programNameIdx >= 0 ? cleanStr(row[programNameIdx]) : "",
        appliedProjectName: projectNameIdx >= 0 ? cleanStr(row[projectNameIdx]) : "",
        appliedAmount: appliedAmountIdx >= 0 ? cleanStr(row[appliedAmountIdx]) : "",
        rawData,
      };
    });
  },

  /**
   * Parses an Excel workbook buffer using ExcelJS as a robust fallback.
   */
  async parseBufferWithExcelJS(buffer: ArrayBuffer): Promise<(Partial<Company> & { rawData?: Record<string, string> })[]> {
    const Workbook = (await import("exceljs")).Workbook;
    const workbook = new Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) return [];

    const rows: any[][] = [];
    worksheet.eachRow((row) => {
      const vals: any[] = [];
      row.eachCell((cell) => {
        vals.push(cell.value);
      });
      rows.push(vals);
    });

    if (rows.length === 0) return [];

    const normalizeHeader = (h: string) => String(h).replace(/\s+/g, '').toLowerCase();
    const getColIndex = (...names: string[]) => {
      const nns = names.map(normalizeHeader);
      const headerRow = rows[0].map(normalizeHeader);
      for (const nn of nns) {
        const idx = headerRow.findIndex((h) => h.includes(nn) || nn.includes(h));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const companyNameIdx = getColIndex("기업명", "업체명", "회사명", "상호", "법인명", "사업자명");
    const brnIdx = getColIndex("사업자등록번호", "사업자번호", "등록번호", "사업자등록", "법인번호", "brn", "bizno");
    const locationIdx = getColIndex("소재지", "주소", "위치", "사업장소재지", "본점소재지", "address");
    const supportFieldIdx = getColIndex("지원분야", "신청분야", "사업분야", "업종", "업태");
    const mainProductsIdx = getColIndex("주요제품", "제품명", "생산품", "주요생산품", "품목");

    const cleanStr = (val: unknown): string => {
      if (val === undefined || val === null) return "";
      return String(val).trim();
    };

    const dataRows = rows.slice(1).filter((row) => {
      if (!row || row.length === 0) return false;
      const filled = [
        companyNameIdx >= 0 ? cleanStr(row[companyNameIdx]) : "",
        brnIdx >= 0 ? cleanStr(row[brnIdx]) : "",
        locationIdx >= 0 ? cleanStr(row[locationIdx]) : "",
      ].filter(Boolean).length;
      return filled >= 1;
    });

    return dataRows.map((row, index) => ({
      id: `upload-${Date.now()}-${index}`,
      companyName: companyNameIdx >= 0 ? cleanStr(row[companyNameIdx]) : "",
      businessNumber: brnIdx >= 0 ? cleanStr(row[brnIdx]).replace(/[^0-9]/g, "") : "",
      location: locationIdx >= 0 ? cleanStr(row[locationIdx]) : "",
      supportField: supportFieldIdx >= 0 ? cleanStr(row[supportFieldIdx]) : "",
      mainProducts: mainProductsIdx >= 0 ? cleanStr(row[mainProductsIdx]) : "",
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
        businessNumber: formatBusinessNumber(company.businessNumber),
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
  async parseRawData(file: File, password?: string): Promise<{ headers: string[]; data: Record<string, any>[]; sheetName: string; title?: string; description?: string }> {
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
  parseRawWorkbook(workbook: XLSX.WorkBook): { headers: string[]; data: Record<string, any>[]; sheetName: string; title?: string; description?: string } {
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

    // Extract title and description from rows before the header row.
    // Some files have column A empty with merged cells starting from column B.
    const firstNonEmpty = (row: any[]): string | undefined => {
      for (const cell of row) {
        if (cell !== undefined && cell !== null && String(cell).trim() !== '') {
          return String(cell).trim();
        }
      }
      return undefined;
    };

    const beforeHeaderRows = rows.slice(0, headerRowIdx).filter(
      (row) =>
        row &&
        row.some((c: any) => c !== undefined && c !== null && String(c).trim() !== '')
    );
    let title: string | undefined;
    let description: string | undefined;
    if (beforeHeaderRows.length > 0) {
      title = firstNonEmpty(beforeHeaderRows[0]);
    }
    if (beforeHeaderRows.length > 1) {
      description = beforeHeaderRows
        .slice(1)
        .map((row) => firstNonEmpty(row) || '')
        .filter((s) => s)
        .join('\n');
    }

    // Determine the actual column range of the header row
    // (maxCols only counts non-empty cells; a leading empty cell shifts indices)
    let lastHeaderCol = -1;
    for (let j = 0; j < rows[headerRowIdx].length; j++) {
      if (
        rows[headerRowIdx][j] !== undefined &&
        rows[headerRowIdx][j] !== null &&
        String(rows[headerRowIdx][j]).trim() !== ''
      ) {
        lastHeaderCol = j;
      }
    }
    const headerColCount = lastHeaderCol + 1;

    // Extract header names from the identified header row
    const rawHeaders: string[] = [];
    for (let j = 0; j < headerColCount; j++) {
      const cell = rows[headerRowIdx][j];
      rawHeaders.push(cell !== undefined && cell !== null ? String(cell).trim() : '');
    }

    // Determine the meaningful column range:
    //   startIdx – skip leading empty headers, prefer "연번" / "순번" as the first column
    //   endIdx   – exclude columns from "지원기관명" (support org name) onward
    let startIdx = rawHeaders.findIndex((h) => h !== '');
    const seqIdx = rawHeaders.findIndex((h) => h === '연번' || h === '순번');
    if (seqIdx >= 0) startIdx = seqIdx;
    if (startIdx < 0) startIdx = 0;

    let endIdx = rawHeaders.length;
    const orgIdx = rawHeaders.findIndex((h) => h.startsWith('지원기관명'));
    if (orgIdx >= 0) endIdx = orgIdx;

    // Find "연번"/"번호" column index for filtering non-data rows
    const seqNumIdx = rawHeaders.findIndex(
      (h) => h === '연번' || h === '순번' || h === '번호'
    );

    // Filter data rows: must have content, 연번/번호 must be numeric, and at least 2 meaningful columns
    const dataRows = rows.slice(headerRowIdx + 1).filter((row) => {
      if (!row) return false;

      // Count meaningful cells within the meaningful column range
      let meaningfulCount = 0;
      for (let j = startIdx; j < row.length && j < endIdx; j++) {
        if (
          row[j] !== undefined &&
          row[j] !== null &&
          String(row[j]).trim() !== ''
        ) {
          meaningfulCount++;
        }
      }
      // Rows with fewer than 2 meaningful fields in the data range are garbage
      if (meaningfulCount < 2) return false;

      // If "연번"/"번호" column exists and has a value, it must be numeric
      if (seqNumIdx >= 0) {
        const seqVal = row[seqNumIdx];
        if (
          seqVal !== undefined &&
          seqVal !== null &&
          String(seqVal).trim() !== ''
        ) {
          const strVal = String(seqVal).trim();
          if (isNaN(Number(strVal.replace(/,/g, '')))) {
            return false;
          }
        }
      }

      return true;
    });

    // Find the last column index (in raw space) that has actual data across ALL data rows
    const lastColWithData =
      dataRows.length > 0
        ? dataRows.reduce((lastCol, row) => {
            for (let j = Math.min(row.length, endIdx) - 1; j >= startIdx; j--) {
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
        : endIdx - 1;

    // Trimmed header list before we know the data end
    const trimmedHeaders = rawHeaders.slice(startIdx, endIdx);

    let headers: string[];
    let data: Record<string, any>[];

    if (lastColWithData < startIdx) {
      // No data in the meaningful column range
      headers = trimmedHeaders;
      data = [];
    } else {
      const actualEnd = Math.min(endIdx, lastColWithData + 1);
      headers = rawHeaders.slice(startIdx, actualEnd);
      data = dataRows.map((row) => {
        const obj: Record<string, any> = {};
        headers.forEach((h, i) => {
          const colIdx = startIdx + i;
          obj[h] = colIdx < row.length && row[colIdx] !== undefined ? row[colIdx] : null;
        });
        return obj;
      });
    }

    // Detect business number column and normalize its values to digits-only
    const bizCol = headers.find(
      (h) => /사업자\s*(등록)?\s*번호/.test(h) || /등록번호/.test(h)
    );
    if (bizCol) {
      data = data.map((row) => {
        if (row[bizCol] !== null && row[bizCol] !== undefined) {
          row[bizCol] = String(row[bizCol]).replace(/\D/g, '');
        }
        return row;
      });
    }

    return { headers, data, sheetName, title, description };
  },

  /**
   * Fetches an already-uploaded file from a URL, re-parses it with the current
   * cleaning logic, and returns the result. Used for re-processing existing files.
   * Handles password-protected files by extracting the password from the filename.
   */
  async reparseFileFromUrl(
    url: string,
    fileName?: string
  ): Promise<{
    headers: string[];
    data: Record<string, any>[];
    sheetName: string;
    title?: string;
    description?: string;
    newFileUrl?: string;
  }> {
    console.log(`[ExcelService] reparseFileFromUrl start: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`파일 다운로드 실패 (${response.status})`);
    }

    const arrayBuffer = await response.arrayBuffer();

    // Try client-side parsing first
    try {
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      console.log(`[ExcelService] reparseFileFromUrl – client-side OK, sheets: ${workbook.SheetNames}`);
      return this.parseRawWorkbook(workbook);
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const isEncryptRelated = /password|encrypt|decrypt|암호| Protected|ole|cfb/i.test(errMsg);
      if (!fileName || !isEncryptRelated) {
        throw err;
      }
      console.log(`[ExcelService] reparseFileFromUrl – file encrypted, extracting password from fileName`);
    }

    // Encrypted – extract password from filename and decrypt server-side
    const password = this.extractPasswordFromFileName(fileName);
    if (!password) {
      throw new Error('암호화된 파일이지만 파일명에서 비밀번호를 추출할 수 없습니다.');
    }

    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    console.log(`[ExcelService] reparseFileFromUrl – calling /api/py-decrypt`);

    const decryptRes = await fetch('/api/py-decrypt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: base64, password }),
    });

    if (!decryptRes.ok) {
      const errorData = await decryptRes.json().catch(() => ({}));
      throw new Error(errorData.error || `서버 복호화 오류 (${decryptRes.status})`);
    }

    const result = await decryptRes.json();
    if (!result.success) {
      throw new Error(result.error || '비밀번호 해제 실패');
    }

    const binaryString = atob(result.data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const workbook = XLSX.read(bytes.buffer, { type: 'array' });
    console.log(`[ExcelService] reparseFileFromUrl – decrypted, sheets: ${workbook.SheetNames}`);

    // Re-upload the decrypted version so future reparses don't need a password
    const cleanName = this.cleanFileName(fileName);
    const decryptedFile = new File([bytes], cleanName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const newFileUrl = await this.uploadFileToStorage(decryptedFile).catch(() => null);

    const parsed = this.parseRawWorkbook(workbook);
    return { ...parsed, newFileUrl: newFileUrl || undefined };
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

  /**
   * Decrypts an encrypted OLE2/OOXML file using the given password,
   * returns a new File with decrypted content and a cleaned filename.
   * If the file is not encrypted, returns the original file unchanged.
   */
  async decryptFile(file: File, password: string): Promise<File> {
    const arrayBuffer = await file.arrayBuffer();

    // Quick check — if client-side parse succeeds, file is not encrypted
    try {
      XLSX.read(arrayBuffer, { type: "array" });
      return file;
    } catch {}

    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    const response = await fetch("/api/py-decrypt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: base64, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `복호화 실패 (${response.status})`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "비밀번호 해제 실패");
    }

    const binaryStr = atob(result.data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const cleanName = this.cleanFileName(file.name);
    return new File([bytes], cleanName, { type: file.type });
  },
};
