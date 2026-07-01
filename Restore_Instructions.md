# 프로젝트 복원 절차 (Antigravity 용)

이 문서는 다른 PC에서 Antigravity를 통해 프로젝트를 원활하게 복원하기 위한 가이드입니다. 

새 PC에서 이 프로젝트의 압축을 해제한 후, Antigravity에게 다음과 같이 요청해주세요:

---

**Antigravity에게 전달할 프롬프트 예시:**

> "현재 폴더에 있는 프로젝트 복원을 도와줘. 
> 이 프로젝트는 Next.js 기반의 웹 애플리케이션 프론트엔드가 포함되어 있어.
> 다음 절차대로 진행해줘:
> 1. `frontend` 폴더로 이동해줘.
> 2. `npm install` 명령어를 실행해서 필요한 패키지(`node_modules`)를 설치해줘.
> 3. 설치가 완료되면 `npm run dev`를 실행해서 개발 서버가 정상적으로 구동되는지 확인해줘."

---

### 수동 복원 참고 사항
직접 복원하시려면 터미널을 열고 다음 명령어를 순서대로 실행하세요:
```bash
cd frontend
npm install
npm run dev
```

### 환경 변수 설정
`frontend/.env.local` 파일에 다음 환경 변수가 필요합니다:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
BLOB_READ_WRITE_TOKEN=your_blob_token
```

### Supabase CLI 설정 (선택)
DB 마이그레이션이 필요한 경우:
```bash
npm install supabase --save-dev
npx supabase init
npx supabase link --project-ref your_project_ref
npx supabase db push
```

### DB 백업 복원
이전 데이터를 복원하려면 백업 파일을 실행하세요:
```bash
psql -d your_database_url -f db_backup_20260702.sql
```

### 주요 라우트 구조
| 경로 | 설명 |
|------|------|
| `/` | 로그인 페이지 |
| `/login` | 로그인 페이지 |
| `/search` | 통합검색 대시보드 |
| `/database` | 등록기업 관리 |
| `/request` | 조회요청기업 |
| `/file` | 엑셀관리 |
| `/verify` | 검증결과 |
| `/history` | 검색 기록 |
