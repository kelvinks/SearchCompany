import ExcelJS from "exceljs";
import { Company } from "@/data/mockData";

type ExcelRowData = Record<string, string | number | boolean | null | undefined | object>;

interface CellObject {
  text?: string;
  result?: string | number;
  value?: string | number;
}

export const excelService = {
  /**
   * Parses an uploaded Excel file on the client side and extracts company details.
   * Expects standard columns: 기업명(or 업체명), 사업자등록번호(or 사업자번호), 대표자, 소재지, 지원분야, 지원사업명, 지원과제명.
   */
  async parseUploadFile(file: File): Promise<Partial<Company>[]> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];
    const parsedData: ExcelRowData[] = [];
    let headers: string[] = [];

    worksheet.eachRow((row, rowNumber) => {
      // First row contains the column names
      if (rowNumber === 1) {
        headers = (row.values as ExcelJS.CellValue[]).map((v) => (v ? String(v).trim() : ""));
      } else {
        const rowValues = row.values as ExcelJS.CellValue[];
        const item: ExcelRowData = {};
        // Note: exceljs rows have 1-based indexing for rowValues, rowValues[0] is empty/unused
        headers.forEach((header, index) => {
          if (header && index < rowValues.length) {
            item[header] = rowValues[index] as ExcelRowData[string]; // Cast cell value safely
          }
        });
        parsedData.push(item);
      }
    });

    // Map parsed keys to standard Company properties
    return parsedData.map((d, index) => {
      const companyName = d["기업명"] || d["업체명"] || d["회사명"] || d["상호"] || "";
      const businessNumber = d["사업자등록번호"] || d["사업자번호"] || d["등록번호"] || "";
      const location = d["소재지"] || d["주소"] || d["위치"] || "";
      const supportField = d["지원분야"] || d["신청분야"] || d["사업분야"] || "";
      const appliedProgramName = d["지원사업명"] || d["사업명"] || d["지원사업"] || "";
      const appliedProjectName = d["지원과제명"] || d["과제명"] || d["지원과제"] || "";

      // Extract string value from Cell Object if necessary (exceljs sometimes wraps values in objects)
      const cleanStr = (val: unknown): string => {
        if (!val) return "";
        if (typeof val === "object") {
          const obj = val as CellObject;
          return obj.text || String(obj.result ?? "") || JSON.stringify(val);
        }
        return String(val).trim();
      };

      return {
        id: `upl-${Date.now()}-${index}`,
        companyName: cleanStr(companyName),
        businessNumber: cleanStr(businessNumber),
        location: cleanStr(location),
        mainProducts: "", // Not used anymore as per user request
        supportField: cleanStr(supportField),
        requestedAmount: 0, // Not used anymore as per user request
        appliedProgramName: cleanStr(appliedProgramName),
        appliedProjectName: cleanStr(appliedProjectName),
      };
    });
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
};
