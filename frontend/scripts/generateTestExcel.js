const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function generate() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('신청기업목록');

  // Define columns matching ExcelService expectations
  sheet.columns = [
    { header: '기업명', key: 'companyName', width: 25 },
    { header: '사업자등록번호', key: 'businessNumber', width: 20 },
    { header: '소재지', key: 'location', width: 35 },
    { header: '지원분야', key: 'supportField', width: 25 },
    { header: '주요제품', key: 'mainProducts', width: 25 },
    { header: '신청금액', key: 'requestedAmount', width: 15 },
  ];

  // Add 5 test cases
  sheet.addRow({
    companyName: '(주)알파테크놀로지',
    businessNumber: '1234567890',
    location: '경기도 수원시 영통구 광교로 156',
    supportField: '소프트웨어', // Matching keyword
    mainProducts: 'AI 플랫폼',
    requestedAmount: 50000000
  });

  sheet.addRow({
    companyName: '베타헬스케어',
    businessNumber: '2345678902', // Typo match
    location: '경기도 성남시 분당구 판교로 289',
    supportField: '바이오', // Matching keyword
    mainProducts: '헬스케어 디바이스',
    requestedAmount: 40000000
  });

  sheet.addRow({
    companyName: '신규스타트업',
    businessNumber: '9999999999', // New safe company
    location: '경기도 고양시 일산동구 중앙로 123',
    supportField: '소프트웨어',
    mainProducts: '블록체인 솔루션',
    requestedAmount: 30000000
  });

  sheet.addRow({
    companyName: '감마정밀',
    businessNumber: '3456789012', // Exact match & duplicate overlap suspect
    location: '경기도 용인시 기흥구 흥덕중앙로 120',
    supportField: '스마트공장', // Matching keyword
    mainProducts: '자동화 설비',
    requestedAmount: 60000000
  });

  sheet.addRow({
    companyName: '에타파이낸스',
    businessNumber: '7890123456', // Exact match
    location: '경기도 수원시 장안구 송원로 81',
    supportField: '소프트웨어/IT',
    mainProducts: '핀테크 플랫폼',
    requestedAmount: 45000000
  });

  // Apply styling
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1C4691' } };
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

  const dirPath = path.join(__dirname, '../public/test');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const outputPath = path.join(dirPath, 'test_applicants.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log('Created test Excel file:', outputPath);
}

generate().catch(console.error);
