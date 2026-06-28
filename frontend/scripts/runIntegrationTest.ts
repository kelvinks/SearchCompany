import { companyService } from "../src/services/companyService";
import { supabase, isSupabaseConfigured } from "../src/services/supabaseClient";

async function runTest() {
  console.log("==================================================");
  console.log("🧪 GBSA Recycle Bin System Integration Test Start");
  console.log("==================================================");

  if (isSupabaseConfigured && supabase) {
    console.log("✔ Database Mode: Supabase DB");
  } else {
    console.log("⚠ Database Mode: Local Storage Mock");
  }

  // 1. Create a dummy company
  const testCompany = {
    companyName: "자동 테스트 기업 주식회사",
    businessNumber: "999-99-99999",
    location: "경기도 수원시 영통구 광교로 1",
    mainProducts: "테스트 인공지능 솔루션 개발",
    supportField: "기술 개발 지원",
    histories: []
  };

  console.log("\n1. Registering new test company...");
  await companyService.addCompany(testCompany);

  // Load companies and find our test target
  const companiesBefore = await companyService.getCompanies();
  const targetCompany = companiesBefore.find(c => c.businessNumber === "999-99-99999");
  
  if (!targetCompany) {
    throw new Error("❌ Test company registration verification failed!");
  }
  console.log(`✔ Company successfully registered! ID: ${targetCompany.id}`);

  // 2. Add an arbitrary support history
  console.log("\n2. Adding dummy support history to company...");
  if (isSupabaseConfigured && supabase) {
    // DB Direct insert to mock client operation
    const { error: histError } = await supabase
      .from("support_histories")
      .insert({
        company_id: targetCompany.id,
        business_number: "999-99-99999",
        year: "2026",
        program_name: "임의 테스트 지원사업",
        project_name: "AI 테스트 과제",
        status: "진행중",
        selected_amount: 10000000,
        support_amount: 8000000,
        notes: "자동 테스트 이력"
      });
    if (histError) throw histError;
  } else {
    // Local storage mock insert
    targetCompany.histories.push({
      id: "hist-test-999",
      brn: "999-99-99999",
      year: "2026",
      programName: "임의 테스트 지원사업",
      projectName: "AI 테스트 과제",
      status: "진행중",
      selectedAmount: 10000000,
      supportAmount: 8000000,
      notes: "자동 테스트 이력"
    });
    const idx = companiesBefore.findIndex(c => c.id === targetCompany.id);
    companiesBefore[idx] = targetCompany;
    localStorage.setItem("gbsa_companies", JSON.stringify(companiesBefore));
  }

  // Refetch and verify history added
  const companiesWithHistory = await companyService.getCompanies();
  const targetWithHistory = companiesWithHistory.find(c => c.id === targetCompany.id);
  console.log(`✔ Added support history count: ${targetWithHistory?.histories?.length}`);
  if (!targetWithHistory || targetWithHistory.histories.length === 0) {
    throw new Error("❌ Support history insertion failed!");
  }
  console.log(`  - History detail: ${targetWithHistory.histories[0].programName} (${targetWithHistory.histories[0].year})`);

  // 3. Delete Company (Should move to deleted_companies & deleted_support_histories)
  console.log("\n3. Deleting company (Triggering archive back-up)...");
  await companyService.deleteCompany(targetCompany.id);

  // Check active list (should be gone)
  const activeCompaniesAfterDelete = await companyService.getCompanies();
  const isStillInActive = activeCompaniesAfterDelete.some(c => c.id === targetCompany.id);
  console.log(`✔ Is present in Active List? ${isStillInActive ? "Yes (❌ Error)" : "No (✔ Success)"}`);
  if (isStillInActive) {
    throw new Error("❌ Company still remains in active list after delete!");
  }

  // 4. Verify Archive
  console.log("\n4. Checking Recycle Bin (deleted_companies)...");
  const deletedCompanies = await companyService.getDeletedCompanies();
  const archivedTarget = deletedCompanies.find(c => c.id === targetCompany.id);
  if (!archivedTarget) {
    throw new Error("❌ Archived company was not found in deleted_companies table!");
  }
  console.log("✔ Found company in Recycle Bin!");
  console.log(`  - Deleted At: ${archivedTarget.deletedAt}`);
  console.log(`  - Archived History Count: ${archivedTarget.histories.length}`);
  if (archivedTarget.histories.length === 0) {
    throw new Error("❌ Archived support histories were not preserved!");
  }
  console.log(`  - History details: ${archivedTarget.histories[0].programName} (${archivedTarget.histories[0].year})`);

  // 5. Restore company data
  console.log("\n5. Restoring company data...");
  await companyService.restoreCompany(targetCompany.id);

  // Check recycle bin (should be empty now)
  const deletedAfterRestore = await companyService.getDeletedCompanies();
  const isStillInDeleted = deletedAfterRestore.some(c => c.id === targetCompany.id);
  console.log(`✔ Remains in Recycle Bin? ${isStillInDeleted ? "Yes (❌ Error)" : "No (✔ Success)"}`);
  if (isStillInDeleted) {
    throw new Error("❌ Company remains in Recycle Bin after restore!");
  }

  // Check active list (should be restored with its history)
  const activeAfterRestore = await companyService.getCompanies();
  const restoredTarget = activeAfterRestore.find(c => c.id === targetCompany.id);
  if (!restoredTarget) {
    throw new Error("❌ Restored company was not found in active list!");
  }
  console.log("✔ Restored company found in Active List!");
  console.log(`  - Restored History Count: ${restoredTarget.histories.length}`);
  if (restoredTarget.histories.length === 0) {
    throw new Error("❌ Support history was not restored together!");
  }
  console.log(`  - History details: ${restoredTarget.histories[0].programName} (${restoredTarget.histories[0].year})`);

  // Clean-up Test Data
  console.log("\n6. Cleaning up test data...");
  await companyService.deleteCompany(targetCompany.id);
  await companyService.permanentDeleteCompany(targetCompany.id);
  console.log("✔ Test data cleaned up successfully!");

  console.log("\n==================================================");
  console.log("🎉 Integration Test Passed Successfully!");
  console.log("==================================================");
}

runTest().catch(err => {
  console.error("\n❌ Test Failed with Error:", err);
  process.exit(1);
});
