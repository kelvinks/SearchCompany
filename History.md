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

## 6. 지원과제명 필드 추가 및 검색 우선순위 로직 개편 (현재)
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

---

## 💡 AI (Antigravity) 메모리 핵심 요약
1. **프로젝트 정체성:** 이 시스템은 단순 검색이 아니라 **'정부/기관의 중복 수혜 방지'**를 위한 엄격한 데이터 교차 검증 도구입니다.
2. **기술적 핵심:** 엑셀 파싱 및 대량 데이터 처리, 사업자번호(정확도 100%)와 기업명(유사도 알고리즘)을 결합한 하이브리드 검색.
3. **검색 키워드 우선순위:** 지원과제명 → 지원사업명 → 비고 순으로 중복 키워드를 검색하며, 가장 먼저 매칭되는 필드의 결과를 사용합니다.
4. **BUSINESS_NUMBER 자동 동기화:** `support_histories.business_number`는 DB 트리거를 통해 `companies.business_number`에서 자동으로 채워지며 사용자가 직접 편집할 수 없습니다.
5. **검색 로그 보존성 완성**: 단건 검색(`MANUAL`) 및 벌크 검색(`BATCH`) 실행 시, 당시 매칭된 세부 기업 정보와 사업자번호 전체가 `search_logs.additional_data` 에 직렬화되어 온전히 백업 및 보존됩니다. 따라서 실시간 DB의 변동과 관계없이 검증 당시의 기록(Audit Trail)을 안정적으로 복원하여 열어볼 수 있습니다.
6. **디자인 테마:** 전문성, 신뢰성, 모던함. (경기도경제과학진흥원 GBSA 공식 규격 및 HSL 컬러 사용)
7. **연동 및 확장성:** 비동기 서비스 레이어로 구조화되어 있어 향후 Supabase의 인증(Auth) 혹은 API Gateway 도입 시 프론트엔드 코드의 변경을 최소화하고 안정적으로 확장 가능합니다.

