# 구현 기술 노트

## 공통 파서: `parseBulkExcel`

```typescript
// src/services/excelService.ts
export async function parseBulkExcel(file: File, columnMapping: ColumnMapping): Promise<BulkPreviewEntry[]>
```

- FileReader로 ArrayBuffer 읽기
- xlsx 라이브러리로 파싱
- **고정 컬럼 인덱스 기반**으로 데이터 추출 (헤더명 의존 제거)
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