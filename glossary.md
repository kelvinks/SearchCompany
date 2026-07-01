# 용어 사전 (Glossary)

| 용어 | 영문 | 정의 |
|------|------|------|
| 벌크 업로드 | Bulk Upload | 다수의 레코드를 한 번에 업로드하는 기능 |
| 미리보기 | Preview | 파싱된 데이터를 사용자가 확인할 수 있도록 테이블 형태로 표시하는 단계 |
| 기업 매칭 | Company Matching | 사업자등록번호를 이용해 기존 등록된 기업을 찾아 `company_id`를 확보하는 과정 |
| 매핑 기업 | Matched Company | 사업자등록번호로 찾은 기존 기업 정보 |
| UNIQUE 제약조건 | Unique Constraint | 데이터베이스에서 중복되지 않아야 하는 컬럼에 걸리는 제약조건 |
| 업서트 | Upsert | INSERT 시 중복 키가 있으면 UPDATE, 없으면 INSERT 하는 동작 |
| 파싱 | Parsing | 엑셀 파일에서 데이터를 읽어 구조화된 객체로 변환하는 과정 |
| 컬럼 매핑 | Column Mapping | 엑셀 컬럼 순서/이름과 내부 데이터 필드 간의 대응 관계 |
| 지원사업 | Support Program | 기업이 신청한 정부/기관 지원 프로그램 |
| 지원과제 | Support Project | 지원사업 하위의 세부 과제 |
| 선정금액 | Selected Amount | 심사 후 선정된 지원금액 |
| 지원금액 | Supported Amount | 실제 지급된 지원금액 |
| 중복 의심 | Duplicate Suspect | 기존 데이터와 유사하여 중복 가능성이 있는 데이터 |
| 단건 등록 | Single Registration | 한 건씩 직접 입력하여 등록하는 모드 |
| 대량 등록 | Bulk Registration | 엑셀 파일을 통해 여러 건을 한 번에 등록하는 모드 |
| 토스트 | Toast | 화면 하단/상단에 잠시 나타났다가 사라지는 알림 메시지 |
| 프로그레스 바 | Progress Bar | 작업 진행률을 시각적으로 표시하는 바 |
| 조회요청기업 | Inquiry Request Companies | 엑셀을 통해 조회 요청된 기업의 목록 |
| 조회요청 이력 | Inquiry Request History | 기업별로 접수된 조회요청내역 (접수일, 요청일, 지원사업명, 요청기관, 문서번호, 파일명) |
| 내부DB 매칭 | Internal DB Matching | 검증 결과에서 사업자번호로 내부 DB 기업과 매칭된 정보 |
| program_name | Program Name | `excel_uploads` 테이블의 지원사업명 컬럼 (대량검색 시 사용자 입력값 저장) |
| 커서 기반 페이지네이션 | Cursor-based Pagination | `created_at` + `id` 기준으로 DB 레벨에서 순차 조회하는 페이지네이션 방식 |
| 편집 거리 | Levenshtein Distance | 두 문자열 간의 최소 편집 횟수. 사업자번호 오타 매칭에 활용 (2 이하) |