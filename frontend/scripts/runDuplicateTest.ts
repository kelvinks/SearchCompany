import { createClient } from '@supabase/supabase-js';
import { matchingService } from '../src/services/matchingService';
import ExcelJS from 'exceljs';
import path from 'path';

const url = 'https://jpnzhtbgagwdstienmxy.supabase.co';
const key = 'sb_publishable_VZf242axrJ9sO7QJVGMxVg_CCpbbtfL';

const supabase = createClient(url, key);

function mapDbCompany(dbCo: any) {
  return {
    id: dbCo.id,
    businessNumber: dbCo.business_number || "",
    companyName: dbCo.company_name,
    location: dbCo.location || "",
    mainProducts: dbCo.main_products || "",
    supportField: dbCo.support_field || "",
    matchStatus: "NEW" as const,
    matchScore: 0,
    histories: (dbCo.histories || []).map((h: any) => ({
      id: h.id,
      year: h.year,
      programName: h.program_name,
      status: h.status,
      selectedAmount: Number(h.selected_amount) || 0,
      supportAmount: Number(h.support_amount) || 0,
      notes: h.notes || undefined,
    })),
    ...(dbCo.additional_data || {}),
  };
}

async function runTest() {
  console.log('1. Loading existing companies and support histories from Supabase...');
  
  const { data: dbData, error: dbError } = await supabase
    .from('companies')
    .select('*, histories:support_histories(*)');

  if (dbError) {
    console.error('Failed to fetch DB companies:', dbError.message);
    return;
  }

  const databaseCompanies = (dbData || []).map(mapDbCompany);
  console.log(`Successfully loaded ${databaseCompanies.length} companies from DB.\n`);

  console.log('2. Reading and parsing test applicants Excel file...');
  const filePath = path.join(__dirname, '../public/test/test_applicants.xlsx');
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];

  const parsedCandidates: any[] = [];
  
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      const companyName = row.getCell(1).text || '';
      const businessNumber = row.getCell(2).text || '';
      const location = row.getCell(3).text || '';
      const supportField = row.getCell(4).text || '';
      const mainProducts = row.getCell(5).text || '';
      const requestedAmount = Number(row.getCell(6).value) || 0;

      parsedCandidates.push({
        id: `candidate-${rowNumber}`,
        companyName: companyName.trim(),
        businessNumber: businessNumber.replace(/[^0-9]/g, '').trim(),
        location: location.trim(),
        supportField: supportField.trim(),
        mainProducts: mainProducts.trim(),
        requestedAmount: requestedAmount,
      });
    }
  });

  console.log(`Parsed ${parsedCandidates.length} candidate companies from Excel.\n`);

  console.log('3. Running duplicate verification match engine...');
  const results = matchingService.matchCompanies(parsedCandidates, databaseCompanies);

  console.log('\n====================== TEST RESULTS ======================');
  results.forEach((res, i) => {
    console.log(`\n[Company #${i + 1}] ${res.companyName}`);
    console.log(`  - Business Number  : ${res.businessNumber}`);
    console.log(`  - Location         : ${res.location}`);
    console.log(`  - Support Field    : ${res.supportField}`);
    console.log(`  - Match Status     : ${res.matchStatus} (Score: ${res.matchScore}%)`);
    if (res.dbCompanyName) {
      console.log(`  - Matched DB Co    : ${res.dbCompanyName}`);
    }
    console.log(`  - Duplicate Suspect: ${res.isDuplicateSuspect ? '⚠️ YES' : '✅ NO'}`);
    if (res.duplicateReason) {
      console.log(`  - Suspect Reason   : ${res.duplicateReason}`);
    }
    console.log(`  - System Note      : ${res.systemNote}`);
  });
  console.log('\n==========================================================');

  console.log('\n4. Logging search results to Supabase search_logs table via description JSON...');
  const duplicateCount = results.filter(r => r.matchStatus === 'EXACT' || r.matchStatus === 'FUZZY').length;
  
  const { data: logData, error: logError } = await supabase
    .from('search_logs')
    .insert({
      type: 'BATCH',
      risk_level: duplicateCount > 0 ? 'High Risk' : 'Safe',
      title: 'test_applicants.xlsx',
      org_name: '경기도경제과학진흥원(테스트)',
      doc_num: 'GBSA-TEST-003',
      // Store results array within description field as stringified JSON
      description: JSON.stringify({
        desc: '5개사 대상 일괄 중복 수혜 검증 시뮬레이션 테스트 (JSON 포맷 저장)',
        results: results
      }),
      total_count: 5,
      duplicate_count: duplicateCount,
    })
    .select()
    .single();

  if (logError) {
    console.error('Failed to insert search log:', logError.message);
  } else {
    console.log('Successfully recorded test search log in DB:', logData.id);
  }
}

runTest().then(() => process.exit());
