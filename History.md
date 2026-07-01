# 중복 수혜 기업 검색 시스템 - 프로젝트 진행 히스토리 및 메모리

이 문서는 이 프로젝트가 시작된 시점부터 현재까지 Antigravity와 사용자가 나눈 주요 대화 내용과 개발 히스토리, 핵심 결정 사항(메모리)을 요약한 문서입니다. 새로운 PC에서 작업을 이어가거나, 프로젝트의 맥락을 파악할 때 참고하세요.

## 1. 프로젝트 초기 기획 (Conversation: e98201ed...)
* **목표:** 정부/기관 지원 사업에 신청한 기업 데이터와 내부 데이터베이스를 교차 검증하여 중복 수혜를 탐지하는 웹 기반 검색 시스템 구축.
* **핵심 요구사항:**
  * **데이터 관리:** 기업명, 사업자등록번호, 소재지, 제품명, 지원 분야 등을 관리하며, 대표자명 등 개인정보는 보호 처리.
  * **일괄 처리(Batch Processing):** 사용자가 엑셀(Excel) 파일로 신청자 데이터를 업로드하여 한 번에 처리할 수 있는 기능.
  * **이중 검색 메커니즘:** 
    1. 사업자등록번호를 통한 '정확한 매칭(Precise matching)'
    2. 오타나 기재 오류를 감안한 기업명 기반 '유사도 매칭(Fuzzy matching)'
* **결과물:** 데이터 흐름과 기술적 요구사항을 정의한 기획 문서(`Plan.md`) 작성.

## 2. UI/UX 디자인 설계 (Conversation: a5f75c3d...)
* **목표:** 직관적이고 보안이 유지되며 데이터 처리에 효율적인 UI/UX 디자인 도출.
* **주요 내용:**
  * 정부/내부 기관용 대시보드에 걸맞은 전문적이고 깔끔한 인터페이스 디자인 기획.
  * 엑셀 일괄 업로드, 데이터 검증 결과, 유사도 매칭 결과를 한눈에 볼 수 있는 UI/UX 프롬프트 작성 및 설계.
* **결과물:** 프론트엔드 개발을 위한 디자인 명세 문서(`Design.md`) 작성.

## 3. 프론트엔드 개발 진행 (Conversation: b770a38a...)
* **목표:** 기획과 디자인 명세를 바탕으로 실제 프론트엔드 애플리케이션 구축.
* **기술 스택:** Next.js (React), Tailwind CSS.
* **주요 구현 사항:**
  * 모던하고 세련된 UI의 대시보드 레이아웃(사이드바, 헤더 등) 구성.
  * 메인 검색 페이지 (엑셀 업로드 UI 및 개별 검색 기능).
  * 내부 DB 관리 및 검색 기록(History) 모달/페이지 구현.
  * 반응형 웹 적용 및 모달 컴포넌트(`DBManageModal.tsx`, `HistoryModal.tsx`, `NewCompanyModal.tsx` 등) 구현.

## 4. 백엔드 서비스 연동 및 비즈니스 로직 고도화 완료
* **목표:** 기업 데이터베이스, 매칭 엔진, 엑셀 파서 및 상세 편집 기능을 최종적으로 연동하고 비동기식 구조로 전환.
* **진행 내용:**
  * **하이브리드 DB 레이어 구현**: Supabase PostgreSQL 원격 DB 또는 브라우저 `localStorage`를 클라이언트 환경 설정에 따라 선택하여 영구 보존하는 비동기식 `companyService` 구축.
  * **유사도 매칭 엔진 탑재**: 사업자번호 정규화 대조(Exact Match) 및 Levenshtein Distance 기반의 오타 판별(Fuzzy Match) 2단계 검증 적용.
  * **엑셀 파서/내보내기 연동**: `exceljs`를 통한 브라우저 측 업로드 데이터 추출 및 GBSA 공식 브랜딩 색상이 포함된 검증 결과 리포트 내보내기 구현.
  * **상세 CRUD 기능 완성**: `DBManageModal`을 통해 기존 기업의 정보 편집/삭제 및 개별 과거 수혜 이력 행의 인라인 수정/삭제 구현 완료.
  * **코드 빌드 무결성 검증**: ESLint 경고 및 TypeScript 타입 불일치를 전면 해결하여 `npm run lint` 및 `npm run build` 최종 컴파일 성공.

## 5. Supabase 완전 연동 및 벌크 검증 기록 보존 (Conversation: b486e115...)
* **목표:** 실 Supabase 백엔드 연동 완성, 벌크 매칭 결과 DB 저장 및 검색 기록 페이지 정상화.
* **주요 내용:**
  * **벌크 매칭 결과 DB 보존 구조 완성**: `search_logs.description` 필드에 매칭 대상 기업별 상세 결과를 JSON으로 직렬화하여 저장. `getBatchResults()`가 이 JSON을 파싱해 복원하는 구조.
  * **Supabase Auth 사용자 프로필 업데이트**: `family_name=강`, `name=정일`, `full_name=강정일`로 표시 이름 갱신 완료.
  * **사업자등록번호(`brn`) 자동 동기화 트리거 설계**:
    * `support_histories.brn` 컬럼 추가 (사용자 직접 입력 불가).
    * PostgreSQL 트리거(`trg_sync_support_history_brn_on_insert`)로 이력 INSERT/UPDATE 시 `companies.business_number`에서 자동 채움.
    * 기업의 사업자번호 변경 시 연결된 모든 이력의 `brn`도 자동 동기화하는 트리거(`trg_sync_support_history_brn_on_company_update`) 추가.

## 6. 지원과제명 필드 추가 및 검색 우선순위 로직 개편
* **목표:** 지원 이력에 세부 과제명(`지원과제명`) 필드를 추가하고, 중복 수혜 키워드 검색 우선순위를 구조화.
* **주요 내용:**
  * **DB 스키마 변경**: `support_histories` 테이블에 `project_name varchar(500)` 컬럼 추가 (`supabase_schema.sql` 반영, Supabase SQL Editor 실행 필요).
  * **프론트엔드 타입 반영**: `SupportHistory` 타입에 `projectName?: string` 추가 (`mockData.ts`).
  * **데이터 매핑 레이어 갱신**: `companyService.ts`의 DB 읽기·쓰기 매퍼에 `project_name ↔ projectName` 양방향 변환 추가.
  * **매칭 엔진 검색 우선순위 개편** (`matchingService.ts`):
    * `checkProgramOverlap()` 함수를 **우선순위 기반 순차 검색**으로 리팩토링:
      1. **지원과제명** (`projectName`) — 1순위
      2. **지원사업명** (`programName`) — 2순위  
      3. **비고** (`notes`) — 3순위
    * 가장 먼저 키워드가 일치하는 필드에서 결과를 반환, 이후 필드는 검사하지 않음.
  * **UI 반영**: `DBManageModal.tsx`에 이력 등록/수정 폼과 테이블에 지원과제명 입력/표시 컬럼 추가. `HistoryModal.tsx`에 과제명 배지 표시 및 새 시그니처 적용.
  * **빌드 검증**: `npm run build` 타입 오류 0건 통과 확인.

## 7. UI/UX 개선 및 검증결과 테이블 재구성
* **검증결과 테이블 개편:**
  * **번호 컬럼 추가** (역순 `w-28`)
  * **사업자등록번호·소재지·지원분야** → `text-center` 정렬
  * **지원사업명 + 지원과제명 병합** → `년도 지원사업명 (지원과제명)` + 비고 한 줄
  * **지원금액 pill** 크기 증가 (`px-3 py-1 text-sm`)
  * **"상태 (매칭도)"** → **"구분"** 으로 라벨 변경
  * **"과거 누적 지원금액"** → **"지원금 총합"** 으로 라벨 변경
* **등록기업 페이지 개편:**
  * **사이드바/헤더** "기업DB관리" → "등록기업"
  * **지원사업명 컬럼** — 2줄 포맷: `년도 지원사업명 (지원과제명)` / `비고: ...`
  * **사업자번호 red pill** — 전년도 이후 포기/제외 이력이 있는 기업 표시
* **DBManageModal (기업지원이력 팝업) 개편:**
  * 여러 개 뱃지 → **단일 amber pill** (마지막 지원사업)
  * **red pill** 추가 — 전년도 이후 포기/제외: `년도 사업명(과제명) 상태`
  * 기업명 → `text-red-600` (최근 포기/제외 시)
  * **유효 총 지원금액** pill에 `지원금총액` 라벨 포함
  * **포기/제외 행**: 배경 `bg-gray-50` → `bg-red-50/60`, 포기는 `text-red-400`, 제외는 `text-orange-400`
  * **포기 뱃지**: `bg-gray-100 text-gray-700` → `bg-red-100 text-red-700`
  * **제외 뱃지**: `bg-red-100 text-red-700` → `bg-orange-100 text-orange-700`
  * **테이블 컬럼 삭제 제거**, 우측 상단 `닫기` → `삭제` 버튼 교체
  * **정렬 변경**: 지원사업명 좌측 정렬, 선정금액/지원금액 우측 정렬
  * **고정 너비** (`table-fixed` + `colgroup`) 적용
  * **버튼 아이콘** 추가 (취소 X, 저장 체크, 삭제 휴지통)
  * **저장 시 전체화면 로딩 오버레이** 추가
* **Header "통합검색"** 기본 타이틀로 변경

## 8. 로딩 오버레이 시스템 구축
* **`LoadingOverlay` 컴포넌트** 생성 (`components/LoadingOverlay.tsx`)
  * 모던 스켈레톤 스타일: 상단 진행바 + 중앙 스피너 + 백그라운드 블러
  * `show`와 `message` prop 지원
* **전체 저장/검색/삭제/업로드 동작에 일괄 적용** (10개 파일):
  * `page.tsx` (단일 검색), `NewCompanyModal.tsx`, `excel-management/page.tsx`, `database/page.tsx`
  * `verification-results/page.tsx`, `history/page.tsx`, `DeletedDBManageModal.tsx`
  * `EditCompanyModal.tsx`, `login/page.tsx`, `DBManageModal.tsx`
* **로딩 테스트 페이지** (`loading-test/page.tsx`) 생성
  * 10가지 로딩 스타일 미리보기
  * 클릭 시 5초 전체화면 미리보기
* **`animate-progress-bar`** 키프레임 애니메이션 `globals.css`에 추가
* **사이드바**에 "로딩 테스트" 메뉴 추가 ("폰트 테스트" 아래)

## 9. 라우트 구조 변경
* `/` (루트) → **로그인 페이지**로 변경
* `/login` → 로그인 페이지 (유지)
* `/search` → **통합검색 (대시보드)** 페이지로 신규 생성
* `(dashboard)/page.tsx` 삭제 → `(dashboard)/search/page.tsx`로 이동
* 변경된 참조 일괄 수정: `proxy.ts`, `AuthProvider.tsx`, `Sidebar.tsx`, `Header.tsx`, `login/page.tsx`
* **Route Group** `(dashboard)`은 Next.js 공식 문법이므로 유지하기로 결정

---

## 11. 신규지원이력등록 모달 및 사업자번호 포맷팅 표준화
* **목표:** 기존 등록 기업에 지원이력을 추가하는 신규 모달을 만들고, 사업자등록번호의 DB 저장/화면 표시 규칙을 전면 표준화.
* **주요 내용:**
  * **`NewHistoryModal.tsx` 생성** (`components/modal/`):
    * 단건 등록: 기업 검색 드롭다운 + 지원이력 폼 (년도, 지원사업명, 과제명, 상태, 선정금액, 지원금액, 비고)
    * 엑셀 대량 업로드: 사업자등록번호로 기업 매칭 → 지원이력 일괄 추가, 결과 표시
    * `history_registration_template.xlsx` 템플릿 파일 생성 (`public/templates/`)
    * 상태는 년도와 동일한 폭으로 지원사업명 앞에 배치, 년도 폭 축소
    * 선정금액/지원금액: 3자리 콤마 + `font-mono`, 원 표시 제거
    * 기업검색/년도 라벨에 SVG 아이콘 적용
  * **사업자번호 포맷팅 표준화:**
    * `formatBusinessNumber()` — 화면 출력 시 `123-45-67890` 형태로 표시
    * `normalizeBusinessNumber()` — DB 저장 시 10자리 숫자만 보관
    * `NewCompanyModal`, `EditCompanyModal`, `NewHistoryModal`, `matchingService`, `excelService` 전체 적용 완료
  * **입력 필드 높이 통일:** `NewCompanyModal` + `NewHistoryModal` 모든 `<input>`, `<select>`에 `h-10` 적용
  * **로딩 오버레이 시스템 개선:**
    * `overlayStyles.tsx` 공유 파일 생성 — 10가지 로딩 스타일 정의
    * `LoadingOverlay.tsx` → `localStorage`에서 선택된 스타일 읽어 렌더링
    * `loading-test/page.tsx` → `localStorage` 읽기/쓰기, 기본값 글래스모피즘
* **결과:** 사업자번호는 DB에 10자리 숫자로만 저장되고 화면에서는 항상 포맷팅되어 표시됨. 로딩 스타일을 사용자가 선택/기억 가능.

---

## 10. 엑셀 암호화 파일 복호화 및 다시 읽기 기능 구현
* **목표:** Vercel에만 구현되어 있던 엑셀 암호화 파일(.xlsx with password) 복호화 기능을 로컬 개발 환경에서도 동작하도록 포팅하고, 복호화 → Blob 재업로드 → 다시 읽기 전 과정을 개선.
* **주요 내용:**
  * **`/api/py-decrypt` API 라우트 구현** (`frontend/src/app/api/py-decrypt/route.ts`): Next.js Route Handler로 Python `msoffcrypto-tool`을 `execSync`로 호출. 파일(base64) + 비밀번호를 받아 복호화 후 base64 JSON 반환. `maxBuffer`를 50MB로 설정. Python 경로: `~/.pyenv/versions/3.12.7/bin/python`
  * **`api/py-decrypt.py` 전면 재작성**: Vercel Serverless HTTP handler + Local CLI 모드 공존 (argparse 분기). `decrypt_bytes()` 공통 코어. 예외 처리 개선 (`InvalidPasswordError` → `DecryptionError`/`InvalidKeyError`). `stdout.flush()` 추가.
  * **Python 3.14.0a1 → 3.12.7 전환**: Python 3.14 알파 + `cryptography` SIGSEGV 문제 해결.
  * **`msoffcrypto-tool` 5.4.2 다운그레이드**: Vercel 환경과 일치하도록 6.0.0 → 5.4.2.
  * **라우트명 변경**: `/verification-results` → `/verify`, `/excel-management` → `/file` (디렉토리 rename + Sidebar/Header/search page 참조 업데이트).
  * **복호화 파일 저장 로직**: `excelService.decryptFile()` — 복호화된 `File` 반환. `search/page.tsx`에서 `workingPassword` 추적 + 복호화 파일 Blob 업로드. `reparseFileFromUrl`에 복호화 → 재업로드 자동화.
  * **Blob 업로드 문제 해결**: `.env.local`에 `BLOB_READ_WRITE_TOKEN` 누락 → 사용자 발급 후 추가 완료. `companyService.updateExcelUpload()`에 `fileUrl` 필드 지원.
* **결과:** 암호화된 엑셀 파일도 정상 업로드/복호화/다시 읽기 가능.

---

## 12. 검증결과 내부DB 데이터 표시 개선 및 검색 UI 통일
* **목표:** 검증결과 페이지에서 내부DB 매칭 데이터 표시 오류 해결, 대량/단일 검색 UI 디자인 통일, 조회요청기업 연동 기능 완성.
* **주요 내용:**
  * **verify 페이지 레이스 컨디션 수정:** 두 개의 독립 `useEffect`를 단일 `useEffect`로 통합. 세션 스토리지(`gbsa_search_results`)의 매칭 결과를 우선 사용하여 DB 로드 시 `db*` 필드 누락 문제 해결.
  * **SearchResultModal 내부DB 컬럼 추가:** 검증 결과 테이블에 `내부DB 기업명`, `내부DB 소재지`, `내부DB 지원분야` 3개 컬럼 추가.
  * **검색 UI 전면 통일:**
    * 단일검색/대량검색 모두 동일한 타이틀 스타일: 아이콘(파란 배경) + `text-xl` 타이틀 + `text-xs` 설명
    * 라벨: `text-sm text-gray-700` + 아이콘, `ml-1` 제거
    * 입력필드: `shadow-sm focus:outline-none` 통일
    * 대량검색 아이콘: 엑셀 격자(3x3 그리드) SVG로 변경
  * **대량검색 지원사업명 필드:** 요청내용 위에 추가, `*` 필수 표시, `batchProgramName` 상태 + 필수 검증 (미입력 시 alert)
  * **단일검색 필수 검증:** 기업명 또는 사업자번호 미입력 시 alert + `*` 라벨
  * **DB `program_name` 컬럼 추가:** `excel_uploads` 테이블에 `program_name varchar(500)` 컬럼 추가, Supabase CLI 마이그레이션 생성 및 적용
  * **조회요청 이력 테이블 정렬:** 접수일/요청일/지원사업명/요청기관 `text-center`, 문서번호/파일명 좌측 정렬
  * **조회요청 이력→엑셀관리 연동:** 행 클릭 시 `/file?fileName=xxx&companyId=yyy&bizNo=zzz` 네비게이션
  * **엑셀관리 자동 선택:** `fileName` 쿼리로 해당 파일 자동 선택 + 파일 목록 강조(파란색 배경)
  * **엑셀관리 상세 테이블 사업자번호 하이라이트:** `bizNo` 쿼리로 해당 기업 행 파란색 배경+굵은 글씨
  * **엑셀관리 돌아가기 버튼:** `companyId` 쿼리로 `/database?companyId=yyy` 네비게이션 → 모달 자동 열림
  * **쿼리 파라미터 무한루프 방지:** `router.replace("/database")`로 companyId 소비
  * **Header 조회요청기업 추가:** `/request` 경로 — 타이틀 `조회요청기업`, 서브타이틀 `엑셀을 통해서 조회 요청된 기업의 목록`
  * **등록기업 버튼 스타일 통일:** "신규 지원이력 등록" 버튼이 "신규 기업 등록"과 동일한 primary 색상 디자인으로 변경
  * **과거 지원 이력 테이블 정렬 수정:** 년도/지원사업명 좌측, 선정금액/지원금액 우측 정렬
  * **DB 백업 및 초기화:** 전체 DB 데이터(companies 16건, support_histories 54건, excel_uploads 4건, search_logs 29건) SQL 백업 후 삭제, Vercel Blob 엑셀 파일 4개 삭제 완료
  * 타입체크/린트 에러 수정 (`useRef` 초기값, `private` 수정자)
  * git 커밋/푸시 완료 (`eca796b`)

---

## 💡 AI (Antigravity) 메모리 핵심 요약
1. **프로젝트 정체성:** 이 시스템은 단순 검색이 아니라 **'정부/기관의 중복 수혜 방지'**를 위한 엄격한 데이터 교차 검증 도구입니다.
2. **기술적 핵심:** 엑셀 파싱 및 대량 데이터 처리, 사업자번호(정확도 100%)와 기업명(유사도 알고리즘)을 결합한 하이브리드 검색.
3. **검색 키워드 우선순위:** 지원과제명 → 지원사업명 → 비고 순으로 중복 키워드를 검색하며, 가장 먼저 매칭되는 필드의 결과를 사용합니다.
4. **BUSINESS_NUMBER 자동 동기화:** `support_histories.business_number`는 DB 트리거를 통해 `companies.business_number`에서 자동으로 채워지며 사용자가 직접 편집할 수 없습니다.
5. **검색 로그 보존성 완성**: 단건 검색(`MANUAL`) 및 벌크 검색(`BATCH`) 실행 시, 당시 매칭된 세부 기업 정보와 사업자번호 전체가 `search_logs.additional_data` 에 직렬화되어 온전히 백업 및 보존됩니다. 따라서 실시간 DB의 변동과 관계없이 검증 당시의 기록(Audit Trail)을 안정적으로 복원하여 열어볼 수 있습니다.
6. **디자인 테마:** 전문성, 신뢰성, 모던함. (경기도경제과학진흥원 GBSA 공식 규격 및 HSL 컬러 사용)
7. **연동 및 확장성:** 비동기 서비스 레이어로 구조화되어 있어 향후 Supabase의 인증(Auth) 혹은 API Gateway 도입 시 프론트엔드 코드의 변경을 최소화하고 안정적으로 확장 가능합니다.
8. **포기/제외 행 스타일:** 배경은 연한 빨강(`bg-red-50/60`), 포기 텍스트는 빨강(`text-red-400`), 제외 텍스트는 주황(`text-orange-400`)으로 구분.
9. **로딩 오버레이:** 중앙 집중식 `LoadingOverlay` 컴포넌트로 모든 async 저장/검색/삭제 동작을 일관된 UI로 처리.
10. **라우트 구조:** `/`는 로그인, `/search`는 통합검색 대시보드, `/login`도 로그인 (두 경로 모두 로그인 페이지로 동작).
11. **Python 복호화:** `execSync`로 `~/.pyenv/versions/3.12.7/bin/python` + `msoffcrypto-tool==5.4.2` 호출. SIGSEGV 방지를 위해 Python 3.12.7 고정.
12. **Vercel Blob 인증:** `.env.local`에 `BLOB_READ_WRITE_TOKEN` 필요. OIDC만으로는 development 환경에서 인증 불가.
13. **다시 읽기(Reparse) 플로우:** 파일 URL → 다운로드 → client-side `XLSX.read()` 시도 → 실패 시 비밀번호 추출 → `/api/py-decrypt` → 복호화 성공 시 Blob 재업로드 → 재시도. 복호화된 파일은 Blob에 저장되어 추후 비밀번호 불필요.
14. **사업자등록번호 저장/표시 규칙:** DB 저장은 `normalizeBusinessNumber()`로 10자리 숫자만, 화면 출력은 `formatBusinessNumber()`로 `123-45-67890` 형태로 표시.
15. **로딩 오버레이 선택 시스템:** `overlayStyles.tsx`에서 공유 스타일 정의, `localStorage`로 선택 유지, 기본값은 글래스모피즘 (id: 2).
16. **신규지원이력등록 모달:** `NewHistoryModal.tsx` — 단건(기업 검색 + 지원이력 폼) + 엑셀 일괄 업로드(사업자등록번호 기준 매칭) 지원.
17. **검증결과 내부DB 표시:** verify 페이지 레이스 컨디션 수정으로 세션스토리지 매칭 결과를 직접 사용, SearchResultModal에 내부DB 기업명/소재지/지원분야 컬럼 추가.
18. **검색 UI 통일:** 단일/대량 검색 모두 동일한 타이틀(아이콘+타이틀+설명), 라벨, 입력필드 스타일 적용. 대량검색에 지원사업명 필수 필드 추가.
19. **조회요청 이력 연동:** DBManageModal에서 조회요청 이력 클릭 시 엑셀관리 페이지로 이동, 자동 파일 선택 및 사업자번호 하이라이트. 돌아가기 버튼으로 기업관리 모달 복원.
20. **Header 라우팅:** `/request` 경로에 타이틀 `조회요청기업`, 서브타이틀 `엑셀을 통해서 조회 요청된 기업의 목록` 추가.
21. **버튼 스타일 통일:** 등록기업 페이지의 "신규 지원이력 등록" 버튼이 "신규 기업 등록"과 동일한 primary 색상으로 변경.
22. **DB program_name:** `excel_uploads` 테이블에 `program_name` 컬럼 추가, 대량검색 시 지원사업명을 DB에 저장.
23. **DB 백업/초기화:** SQL 백업 파일 생성(`/db_backup_20260702.sql`), 모든 테이블 데이터 삭제, Vercel Blob 엑셀 파일 4개 삭제 완료.

