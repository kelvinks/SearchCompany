const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Parse .env.local manually
let supabaseUrl = '';
let supabaseAnonKey = '';
try {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
  for (const line of envContent.split('\n')) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL='))
      supabaseUrl = line.split('=')[1].trim().replace(/['"]/g, '');
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY='))
      supabaseAnonKey = line.split('=')[1].trim().replace(/['"]/g, '');
  }
} catch (e) {
  console.error("Error reading .env.local:", e.message);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrateStatus() {
  console.log("==================================================");
  console.log("🔧 Status Migration: 진행중 → 선정");
  console.log("==================================================");

  // Step 1: Update existing '진행중' records to '선정' via API
  console.log("\n1. Updating '진행중' → '선정' in support_histories...");
  const { data: updated, error: updateErr } = await supabase
    .from("support_histories")
    .update({ status: "선정" })
    .eq("status", "진행중")
    .select("id, status");

  if (updateErr) {
    console.error("❌ Update failed:", updateErr);
    // The CHECK constraint might block this. Try RPC approach.
    console.log("\n⚠ CHECK constraint may be blocking. Trying RPC...");
    const { error: rpcErr } = await supabase.rpc("exec_sql", {
      query: `
        ALTER TABLE public.support_histories DROP CONSTRAINT IF EXISTS support_histories_status_check;
        UPDATE public.support_histories SET status = '선정' WHERE status = '진행중';
        ALTER TABLE public.support_histories ADD CONSTRAINT support_histories_status_check CHECK (status IN ('선정', '완료', '포기', '제외'));
      `
    });
    if (rpcErr) {
      console.error("❌ RPC also failed:", rpcErr);
      console.log("\n📋 Please run the following SQL manually in Supabase SQL Editor:");
      console.log(`
-- 1. 기존 CHECK 제약조건 삭제
ALTER TABLE public.support_histories DROP CONSTRAINT IF EXISTS support_histories_status_check;

-- 2. 기존 '진행중' 데이터를 '선정'으로 일괄 업데이트
UPDATE public.support_histories SET status = '선정' WHERE status = '진행중';

-- 3. 새 CHECK 제약조건 추가 (선정, 완료, 포기, 제외)
ALTER TABLE public.support_histories ADD CONSTRAINT support_histories_status_check CHECK (status IN ('선정', '완료', '포기', '제외'));
      `);
      process.exit(1);
    }
    console.log("✔ RPC migration completed.");
  } else {
    console.log(`✔ Updated ${updated?.length || 0} records from '진행중' to '선정'.`);
    
    // Step 2: Update CHECK constraint via RPC
    console.log("\n2. Updating CHECK constraint...");
    const { error: rpcErr } = await supabase.rpc("exec_sql", {
      query: `
        ALTER TABLE public.support_histories DROP CONSTRAINT IF EXISTS support_histories_status_check;
        ALTER TABLE public.support_histories ADD CONSTRAINT support_histories_status_check CHECK (status IN ('선정', '완료', '포기', '제외'));
      `
    });
    if (rpcErr) {
      console.log("⚠ Could not update constraint via API. Manual SQL needed (see below).");
      console.log(`
ALTER TABLE public.support_histories DROP CONSTRAINT IF EXISTS support_histories_status_check;
ALTER TABLE public.support_histories ADD CONSTRAINT support_histories_status_check CHECK (status IN ('선정', '완료', '포기', '제외'));
      `);
    } else {
      console.log("✔ CHECK constraint updated successfully.");
    }
  }

  // Step 3: Also update deleted_support_histories if any '진행중' exists there
  console.log("\n3. Updating '진행중' → '선정' in deleted_support_histories...");
  const { data: updatedDeleted, error: updateDelErr } = await supabase
    .from("deleted_support_histories")
    .update({ status: "선정" })
    .eq("status", "진행중")
    .select("id, status");

  if (updateDelErr) {
    console.log("⚠ deleted_support_histories update skipped:", updateDelErr.message);
  } else {
    console.log(`✔ Updated ${updatedDeleted?.length || 0} archived records.`);
  }

  // Verify
  console.log("\n4. Verifying: checking for remaining '진행중' records...");
  const { data: remaining } = await supabase
    .from("support_histories")
    .select("id")
    .eq("status", "진행중");
  
  console.log(`✔ Remaining '진행중' records: ${remaining?.length || 0}`);

  console.log("\n==================================================");
  console.log("🎉 Status Migration Complete!");
  console.log("==================================================");
}

migrateStatus();
