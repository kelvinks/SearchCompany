import { supabase, isSupabaseConfigured } from '../src/services/supabaseClient';

async function seedCompanies() {
  if (!isSupabaseConfigured || !supabase) {
    console.error('Supabase is not configured. Check .env.local');
    return;
  }

  const companies = [
    {
      business_number: '1234567890',
      company_name: '(주)알파테크놀로지',
      location: '경기도 수원시 영통구 광교로 156',
      main_products: 'AI 플랫폼',
      support_field: '소프트웨어/IT',
      additional_data: {},
    },
    {
      business_number: '2345678901',
      company_name: '베타헬스케어',
      location: '경기도 성남시 분당구 판교로 289',
      main_products: '헬스케어 디바이스',
      support_field: '바이오/의료',
      additional_data: {},
    },
    {
      business_number: '3456789012',
      company_name: '감마정밀',
      location: '경기도 용인시 기흥구 흥덕중앙로 120',
      main_products: '자동화 설비',
      support_field: '제조/생산',
      additional_data: {},
    },
    {
      business_number: '4567890123',
      company_name: '델타소프트웨어',
      location: '경기도 수원시 팔달구 효원로 299',
      main_products: '클라우드 서비스',
      support_field: '소프트웨어/IT',
      additional_data: {},
    },
    {
      business_number: '5678901234',
      company_name: '입실론바이오',
      location: '경기도 성남시 수정구 창업로 42',
      main_products: '바이오 시뮬레이션',
      support_field: '바이오/의료',
      additional_data: {},
    },
    {
      business_number: '6789012345',
      company_name: '(주)제타로지스틱스',
      location: '경기도 용인시 처인구 백옥대로 1005',
      main_products: '스마트 물류 솔루션',
      support_field: '제조/생산',
      additional_data: {},
    },
    {
      business_number: '7890123456',
      company_name: '에타파이낸스',
      location: '경기도 수원시 장안구 송원로 81',
      main_products: '핀테크 플랫폼',
      support_field: '소프트웨어/IT',
      additional_data: {},
    },
    {
      business_number: '8901234567',
      company_name: '세타에너지',
      location: '경기도 성남시 분당구 대왕판교로 645',
      main_products: '재생 에너지 설비',
      support_field: '제조/생산',
      additional_data: {},
    },
    {
      business_number: '9012345678',
      company_name: '이오타메디컬',
      location: '경기도 용인시 수지구 포은대로 512',
      main_products: '의료 데이터 분석',
      support_field: '바이오/의료',
      additional_data: {},
    },
    {
      business_number: '0123456789',
      company_name: '카파로보틱스(주)',
      location: '경기도 수원시 권선구 산업로 156',
      main_products: '산업용 로봇',
      support_field: '제조/생산',
      additional_data: {},
    },
  ];

  // 1. 기존 companies 및 cascade로 엮인 support_histories 삭제
  const { error: deleteError } = await supabase
    .from('companies')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (deleteError) {
    console.error('Failed to clear companies:', deleteError);
    return;
  }
  console.log('Cleared existing companies.');

  // 지원사업 데이터베이스 풀 정의
  const programsMap: { [key: string]: string[] } = {
    '소프트웨어/IT': [
      '경기도 기술개발사업',
      '글로벌 강소기업 육성사업',
      '정보통신기술(ICT) 융합 R&D 지원사업',
      '창업보육센터 지원사업',
      'G-스타트업 성장지원사업',
      '중소기업 디바이스 제작 지원사업'
    ],
    '바이오/의료': [
      '경기도 기술개발사업',
      '글로벌 강소기업 육성사업',
      '바이오산업 핵심기술 개발사업',
      '창업보육센터 지원사업',
      '의료기기 R&D 고도화 지원사업',
      '바이오 헬스케어 스타트업 패키징'
    ],
    '제조/생산': [
      '경기도 기술개발사업',
      '글로벌 강소기업 육성사업',
      '스마트공장 구축 및 고도화 지원사업',
      '중소기업 개발생산판로 맞춤형지원사업',
      '수출기업 글로벌 물류비 지원사업',
      '경기도형 강소기업 육성지원'
    ]
  };

  const years = ['2023', '2024', '2025', '2026'];
  const statuses = ['완료', '완료', '완료', '선정', '선정', '제외', '포기'];

  for (const comp of companies) {
    // 기업 데이터 삽입 및 생성된 ID 반환
    const { data: insertedCompany, error: insertError } = await supabase
      .from('companies')
      .insert(comp)
      .select('id')
      .single();

    if (insertError) {
      console.error('Insert error for', comp.company_name, insertError);
      continue;
    }

    if (insertedCompany) {
      const companyId = insertedCompany.id;
      // 3~5개의 랜덤 지원이력 생성
      const historyCount = Math.floor(Math.random() * 3) + 3; // 3 ~ 5
      const availablePrograms = programsMap[comp.support_field] || [
        '경기도 기술개발사업',
        '글로벌 강소기업 육성사업'
      ];

      // 사업명 중복 선택 방지를 위한 셔플
      const shuffledPrograms = [...availablePrograms].sort(() => 0.5 - Math.random());
      
      const histories = [];
      for (let i = 0; i < Math.min(historyCount, shuffledPrograms.length); i++) {
        const year = years[Math.floor(Math.random() * years.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        // 백만 원 단위 지원금 (1,000만원 ~ 1억 5,000만원)
        const selectedAmount = (Math.floor(Math.random() * 15) + 1) * 10000000;
        let supportAmount = 0;
        
        if (status === '완료' || status === '선정') {
          // 완료 또는 선정인 경우 선정 금액의 90% ~ 100% 지원금 지급 설정
          const ratio = 0.9 + Math.random() * 0.1;
          supportAmount = Math.floor(selectedAmount * ratio / 1000000) * 1000000;
        } else {
          // 제외 또는 포기인 경우 실제 수혜 금액은 0원
          supportAmount = 0;
        }

        histories.push({
          company_id: companyId,
          year,
          program_name: shuffledPrograms[i],
          status,
          selected_amount: selectedAmount,
          support_amount: supportAmount,
          notes: `${comp.company_name} 대상 ${shuffledPrograms[i]} 선정 데이터`
        });
      }

      const { error: historyError } = await supabase
        .from('support_histories')
        .insert(histories);

      if (historyError) {
        console.error('History insert error for', comp.company_name, historyError);
      } else {
        console.log(`Inserted ${histories.length} support histories for ${comp.company_name}`);
      }
    }
  }

  console.log('Seeding complete. Updated all companies and their histories.');
}

seedCompanies().then(() => process.exit());
