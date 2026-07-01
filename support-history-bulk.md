# 지원이력 대량 등록 상세 스펙

## 개요
기존 등록 기업의 지원사업 이력을 엑셀로 일괄 등록하는 기능입니다. 기업 등록과 동일한 UI 흐름을 따릅니다.

## 데이터 필드
| 필드명 | 타입 | 필수 | 비고 |
|--------|------|------|------|
| 사업자등록번호 | string | Y | 기업 매칭용 |
| 연도 | string | Y | 4자리 (예: "2024") |
| 지원사업명 | string | Y | **DB `excel_uploads.program_name`에 저장** |
| 지원과제명 | string | N | |
| 상태 | string | Y | "선정", "완료", "포기", "제외" |
| 선정금액 | number | N | default: 0 |
| 지원금액 | number | N | default: 0 |
| 비고 | string | N | |

## 대량검색 필수 입력값
대량검색 시 다음 필드는 반드시 입력해야 합니다 (라벨에 `*` 표시):
| 입력값 | 비고 |
|--------|------|
| 지원사업명(*) | DB `excel_uploads.program_name`에 저장 |
| 요청기관(*) | |
| 문서번호(*) | |
| 접수일(*) | |
| 요청일(*) | |

## 템플릿 파일
`/public/templates/history_registration_template.xlsx`

## 백엔드 API
- 엔드포인트: `POST /api/support-histories/bulk`
- 요청: multipart/form-data (파일 + 메타데이터)
- 응답: { success: number, failed: number, errors: [] }

## 데이터 처리 흐름 (2단계)
1. **파싱**: 엑셀 행 → 객체 배열 (고정 컬럼 순서 기반)
2. **기업 매칭**: 사업자등록번호 → `companyService.getCompanyIdByBusinessNumber()` → `company_id` 확보
3. **등록**: 확보된 `company_id`로 `support_histories` INSERT

## 기업 매칭 실패 처리
- 매칭되는 기업이 없는 경우: "(매칭 기업 없음: 사업자번호)" 표시
- 등록 시 해당 행은 자동 제외 (경고 표시 후 건너뛰기)
- 사용자에게는 "매칭 기업 없음" 행 수 안내

## 상태 표시
| 상태 | 설명 |
|------|------|
| 정상 | 매칭 기업 존재, 필수 필드 모두 있음 |
| 매칭 기업 없음 | 사업자번호로 기업을 찾을 수 없음 |
| 필수값 누락 | 연도, 지원사업명, 상태 중 하나라도 없음 |

## 프로세스 흐름 (기업 등록과 동일)
1. 파일 다운로드 → 2. 작성 → 3. 업로드 → 4. 파싱 → 5. 미리보기 → 6. 업로드 확정 → 7. 결과 확인