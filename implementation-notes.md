# 구현 기술 노트

## 공통 파서: `parseBulkExcel`

```typescript
// src/services/excelService.ts
export async function parseBulkExcel(file: File, columnMapping: ColumnMapping): Promise<BulkPreviewEntry[]>
```

- FileReader로 ArrayBuffer 읽기
- xlsx 라이브러리로 파싱 (ExcelJS 폴백 지원: `parseBufferWithExcelJS`)
- **고정 컬럼 인덱스 기반**으로 데이터 추출 (헤더명 의존 제거)
- `defval: ""` 옵션 + `meaningfulCount < 1`로 빈 행 필터링
- 반환: `BulkPreviewEntry[]` - 통합된 미리보기 타입

### 컬럼 매핑 설정
```typescript
interface ColumnMapping {
  businessNumber: number;  // 0
  year?: number;           // 1 (지원사업용)
  companyName?: number;    // 0 (기업 등록용)
  // ... 기타 필드
}
```

## 상태 관리 (useBulkUpload 훅)

```typescript
interface BulkUploadState {
  file: File | null;
  isReading: boolean;
  bulkPreview: BulkPreviewEntry[];
  isUploading: boolean;
  submitting: boolean;
}
```

## API 통신

### 공통 업로드 함수
```typescript
async function uploadBatch(entries: BulkPreviewEntry[], type: 'company' | 'history'): Promise<UploadResult>
```

- FormData 구성
- 파일 + 메타데이터 동시 전송
- 성공/실패 카운트 및 에러 상세 반환

## 기업 매칭 서비스 (companyService.ts)

```typescript
// src/services/companyService.ts
export async function getCompanyIdByBusinessNumber(businessNumber: string): Promise<string | null>
```

- Supabase client 재사용
- `business_number` 정규화 (하이픈 제거 후 비교)
- 결과 없으면 `null` 반환

## 조회요청기업 서비스

```typescript
// src/services/companyService.ts
export async function getInquiryCompanies(
  limit: number,
  options?: { cursor?: { createdAt: string; id: string }; searchTerm?: string }
): Promise<{ companies: InquiryCompany[]; nextCursor?: { createdAt: string; id: string } }>
```

- DB 레벨 커서 기반 페이지네이션 (초기 20건, 더보기로 추가 로드)
- 검색 시 `fetchMultiplier=10`으로 더 많은 로그 fetch
- 중복 제거: **년도+BRN+지원사업명+지원과제명** 4가지 기준
- 년도 추출: 파일명 YYMMDD > 4자리 년도 > `created_at`

```typescript
export async function getCompanyInquiryRequests(businessNumber: string): Promise<InquiryRequest[]>
```

- BATCH 로그 + excel_uploads 조인
- 접수일: `send_date` 없으면 `created_at` 사용

## 엑셀 파일 삭제

```typescript
// src/services/companyService.ts
export async function deleteExcelUpload(uploadId: string): Promise<void>
```

- excel_uploads 삭제 시 관련 search_logs(BATCH)도 함께 삭제

## 검색 UI 통일 규칙

- **타이틀**: 아이콘(파란 배경 `rounded-lg`) + `text-xl font-bold` + `text-xs text-gray-500` 설명
- **라벨**: `text-sm font-semibold text-gray-700` + SVG 아이콘
- **입력필드**: `h-10 px-4 rounded-xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100`
- **필수 표시**: 라벨 끝에 `* text-red-500`

## 미리보기 테이블 컴포넌트

```tsx
// src/components/BulkPreviewTable.tsx
interface BulkPreviewTableProps {
  items: BulkPreviewEntry[];
  columns: ColumnDef[];
  onRowClick?: (item: BulkPreviewEntry) => void;
}
```

- `columns` prop으로 컬럼 정의만 다르게 전달
- 기업 등록용 컬럼 vs 지원사업 등록용 컬럼

## 에러 처리

| 단계 | 에러 유형 | 처리 |
|------|-----------|------|
| 파일 읽기 | FileReader error | Toast "파일 읽기 실패" |
| 파싱 | xlsx parse error | Toast "파싱 실패" |
| 기업 매칭 | 매칭 없음 | 행에 "매칭 기업 없음" 표시, 등록 제외 |
| DB 저장 | Unique violation | Toast "중복 데이터" / 업데이트 옵션 제공 |
| 필수 검증 | 미입력 필드 | alert("모든 필수 항목을 입력해주세요.") |

## 타입 정의

```typescript
// src/types/bulk-upload.ts
export interface BulkPreviewEntry {
  id: string;
  businessNumber: string;
  companyName?: string;      // 기업 등록: 입력값 / 지원사업: 매칭된 기업명
  year?: string;             // 지원사업용
  programName?: string;
  projectName?: string;
  status?: string;
  selectedAmount?: number;
  supportAmount?: number;
  notes?: string;
  matchStatus: 'new' | 'duplicate' | 'unmatched' | 'missing_required';
}
```

## 검증결과 데이터 흐름

```
search/page.tsx → sessionStorage('gbsa_search_results') → verify/history 페이지
```

- 대량 검색 시 매칭 결과(`db*` 필드 포함)를 세션 스토리지에 저장
- verify 페이지에서 세션 스토리지의 매칭 결과를 우선 사용
- SearchResultModal에서 내부DB 기업명/소재지/지원분야 컬럼 표시

## 엑셀관리 네비게이션

- 조회요청 이력 클릭 → `/file?fileName=xxx&companyId=yyy&bizNo=zzz`
- `fileName`으로 해당 파일 자동 선택 + 파일 목록 강조(파란색 배경)
- `bizNo`로 상세 테이블에서 해당 기업 행 하이라이트
- 돌아가기 버튼 → `/database?companyId=yyy` (모달 자동 열림)
- `router.replace("/database")`로 쿼리 파라미터 소비 (무한루프 방지)
