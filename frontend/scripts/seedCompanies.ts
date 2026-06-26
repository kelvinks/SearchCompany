import { supabase, isSupabaseConfigured } from '../src/services/supabaseClient';

async function seedCompanies() {
  if (!isSupabaseConfigured || !supabase) {
    console.error('Supabase is not configured. Check .env.local');
    return;
  }
  const companies = [
    {
      business_number: '123-45-6789',
      company_name: '(주)알파테크놀로지',
      location: '수원시',
      main_products: 'AI 플랫폼',
      support_field: '소프트웨어/IT',
      representative: '김선영',
      additional_data: {},
    },
    {
      business_number: '234-56-7890',
      company_name: '베타헬스케어',
      location: '성남시',
      main_products: '헬스케어 디바이스',
      support_field: '바이오/의료',
      representative: '이민호',
      additional_data: {},
    },
    {
      business_number: '345-67-8901',
      company_name: '감마정밀',
      location: '용인시',
      main_products: '자동화 설비',
      support_field: '제조/생산',
      representative: '박지현',
      additional_data: {},
    },
    {
      business_number: '456-78-9012',
      company_name: '델타소프트웨어',
      location: '수원시',
      main_products: '클라우드 서비스',
      support_field: '소프트웨어/IT',
      representative: '최준호',
      additional_data: {},
    },
    {
      business_number: '567-89-0123',
      company_name: '입실론바이오',
      location: '성남시',
      main_products: '바이오 시뮬레이션',
      support_field: '바이오/의료',
      representative: '한예진',
      additional_data: {},
    },
    {
      business_number: '678-90-1234',
      company_name: '(주)제타로지스틱스',
      location: '용인시',
      main_products: '스마트 물류 솔루션',
      support_field: '제조/생산',
      representative: '오승민',
      additional_data: {},
    },
    {
      business_number: '789-01-2345',
      company_name: '에타파이낸스',
      location: '수원시',
      main_products: '핀테크 플랫폼',
      support_field: '소프트웨어/IT',
      representative: '신지수',
      additional_data: {},
    },
    {
      business_number: '890-12-3456',
      company_name: '세타에너지',
      location: '성남시',
      main_products: '재생 에너지 설비',
      support_field: '제조/생산',
      representative: '김현우',
      additional_data: {},
    },
    {
      business_number: '901-23-4567',
      company_name: '이오타메디컬',
      location: '용인시',
      main_products: '의료 데이터 분석',
      support_field: '바이오/의료',
      representative: '유승아',
      additional_data: {},
    },
    {
      business_number: '012-34-5678',
      company_name: '카파로보틱스(주)',
      location: '수원시',
      main_products: '산업용 로봇',
      support_field: '제조/생산',
      representative: '정민수',
      additional_data: {},
    },
  ];

  // Delete all existing companies first to clear old English data
  const { error: deleteError } = await supabase.from('companies').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (deleteError) {
    console.error('Failed to clear companies:', deleteError);
  } else {
    console.log('Cleared existing companies.');
  }

  for (const comp of companies) {
    const { error } = await supabase.from('companies').insert(comp);
    if (error) console.error('Insert error for', comp.company_name, error);
  }
  console.log('Seeding complete. Inserted', companies.length, 'companies');
}

seedCompanies().then(() => process.exit());
