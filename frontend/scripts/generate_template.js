/* eslint-disable @typescript-eslint/no-require-imports */
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function generate() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('기업일괄등록', {
    views: [{ state: 'frozen', ySplit: 1 }] // freeze header row
  });

  // Add columns
  sheet.columns = [
    { header: '기업명', key: 'companyName', width: 25 },
    { header: '사업자등록번호', key: 'businessNumber', width: 20 },
    { header: '소재지', key: 'location', width: 35 },
    { header: '주요 사업(지원분야)', key: 'supportField', width: 25 },
    { header: '주요 제품', key: 'mainProducts', width: 25 },
  ];

  // Add mock data row
  sheet.addRow({
    companyName: '(주)예시기업',
    businessNumber: '123-45-67890',
    location: '경기도 수원시 영통구',
    supportField: 'SW 개발',
    mainProducts: 'AI 솔루션'
  });

  // Apply basic table style
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1C4691' } }; // GBSA primary color
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  const dirPath = path.join(__dirname, '../public/templates');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const outputPath = path.join(dirPath, 'company_registration_template.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log('Created:', outputPath);
}

generate().catch(console.error);
