const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local to avoid missing 'dotenv' package error
let supabaseUrl = '';
let supabaseAnonKey = '';
try {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim().replace(/['"]/g, '');
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = line.split('=')[1].trim().replace(/['"]/g, '');
    }
  }
} catch (e) {
  console.error("❌ Error reading .env.local file:", e.message);
  process.exit(1);
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Supabase environment variables could not be parsed from .env.local!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runDatabaseIntegrationTest() {
  console.log("==================================================");
  console.log("🧪 Supabase Recycle Bin (Trigger & RPC) E2E Test");
  console.log("==================================================");

  const testCompanyId = "d3b07384-d113-4c4e-b5c6-c956942c75a4"; // Fixed UUID for test stability

  try {
    // 0. Clean up any leftover test data first
    await supabase.from("companies").delete().eq("id", testCompanyId);
    await supabase.from("deleted_companies").delete().eq("id", testCompanyId);

    // 1. Insert a Test Company
    console.log("\n1. Inserting Test Company into 'companies'...");
    const { error: insertCompanyErr } = await supabase
      .from("companies")
      .insert({
        id: testCompanyId,
        business_number: "999-99-99999",
        company_name: "자동화 테스트 기업(주)",
        location: "경기도 수원시 영통구 광교로 1",
        main_products: "테스트 AI 로봇",
        support_field: "기술 개발 지원"
      });
    
    if (insertCompanyErr) throw insertCompanyErr;
    console.log("✔ Test Company inserted successfully.");

    // 2. Insert a Test Support History
    console.log("\n2. Inserting Test Support History into 'support_histories'...");
    const { error: insertHistoryErr } = await supabase
      .from("support_histories")
      .insert({
        company_id: testCompanyId,
        business_number: "999-99-99999",
        year: "2026",
        program_name: "임시 테스트 지원사업",
        project_name: "AI 로봇 고도화 과제",
        status: "진행중",
        selected_amount: 10000000,
        support_amount: 8000000,
        notes: "휴지통 트리거 테스트용"
      });

    if (insertHistoryErr) throw insertHistoryErr;
    console.log("✔ Test Support History inserted successfully.");

    // Verify company & history exist
    const { data: beforeDeleteCompany } = await supabase.from("companies").select("*, histories:support_histories(*)").eq("id", testCompanyId).single();
    console.log(`✔ Verified Active Data: Company Name = "${beforeDeleteCompany?.company_name}", Support History Count = ${beforeDeleteCompany?.histories?.length}`);

    // 3. Delete Company (Should trigger DB BEFORE DELETE and copy to deleted_companies)
    console.log("\n3. Deleting Company (Triggering DB Archive to deleted_companies)...");
    const { error: deleteErr } = await supabase.from("companies").delete().eq("id", testCompanyId);
    if (deleteErr) throw deleteErr;
    console.log("✔ Delete command completed.");

    // Verify gone from companies
    const { data: activeCheck } = await supabase.from("companies").select("*").eq("id", testCompanyId);
    console.log(`✔ Active list count after delete: ${activeCheck?.length}`);

    // Verify present in deleted_companies
    const { data: deletedCompanyCheck, error: deletedFetchErr } = await supabase
      .from("deleted_companies")
      .select("*, histories:deleted_support_histories(*)")
      .eq("id", testCompanyId)
      .single();

    if (deletedFetchErr || !deletedCompanyCheck) {
      throw new Error("❌ Target company was not archived in 'deleted_companies' table!");
    }
    console.log("✔ Verified Deleted (Archived) Data:");
    console.log(`  - Company Name: "${deletedCompanyCheck.company_name}"`);
    console.log(`  - Deleted At: ${deletedCompanyCheck.deleted_at}`);
    console.log(`  - Archived History Count: ${deletedCompanyCheck.histories?.length}`);
    console.log(`  - History detail: "${deletedCompanyCheck.histories?.[0]?.program_name}"`);

    // 4. Restore Company (Triggers restore_company_data RPC function)
    console.log("\n4. Calling 'restore_company_data' database RPC function...");
    const { error: restoreErr } = await supabase.rpc("restore_company_data", {
      target_company_id: testCompanyId
    });
    if (restoreErr) throw restoreErr;
    console.log("✔ Restore RPC completed.");

    // Verify restored back in companies table
    const { data: restoredCompanyCheck } = await supabase
      .from("companies")
      .select("*, histories:support_histories(*)")
      .eq("id", testCompanyId)
      .single();

    if (!restoredCompanyCheck) {
      throw new Error("❌ Restored company was not found in active 'companies' table!");
    }
    console.log("✔ Verified Restored Data in Active Database:");
    console.log(`  - Company Name: "${restoredCompanyCheck.company_name}"`);
    console.log(`  - Restored History Count: ${restoredCompanyCheck.histories?.length}`);
    console.log(`  - History details: "${restoredCompanyCheck.histories?.[0]?.program_name}"`);

    // Verify deleted_companies is now empty
    const { data: archiveCheckAfter } = await supabase.from("deleted_companies").select("*").eq("id", testCompanyId);
    console.log(`✔ Archived table entry count after restore: ${archiveCheckAfter?.length}`);

    // 5. Cleanup Test Data (Delete permanently)
    console.log("\n5. Cleaning up test database records...");
    await supabase.from("companies").delete().eq("id", testCompanyId);
    await supabase.from("deleted_companies").delete().eq("id", testCompanyId);
    console.log("✔ Cleanup complete.");

    console.log("\n==================================================");
    console.log("🎉 All DB Trigger & RPC Restore Tests Passed!");
    console.log("==================================================");

  } catch (err) {
    console.error("\n❌ Test Failed with Error:", err);
    // Cleanup on error
    await supabase.from("companies").delete().eq("id", testCompanyId);
    await supabase.from("deleted_companies").delete().eq("id", testCompanyId);
    process.exit(1);
  }
}

runDatabaseIntegrationTest();
