<!-- BEGIN:nextjs-agent-rules -->
# 주의: 이것은 여러분이 알고 있는 Next.js가 아닙니다

이 버전에는 호환성이 깨지는 변경사항이 있습니다 — API, 규칙, 파일 구조가 여러분의 학습 데이터와 모두 다를 수 있습니다. 코드를 작성하기 전에 `node_modules/next/dist/docs/`에서 관련 가이드를 읽으십시오. Deprecation 공지를 주의하십시오.
<!-- END:nextjs-agent-rules -->

# 개발 서버
- 개발 서버는 3005번 포트에서 실행됩니다: `npx next dev -p 3005`

# 사업자등록번호 포맷팅
- DB 저장: `normalizeBusinessNumber(value)` — 10자리 숫자만 (예: `1234567890`)
- 화면 출력: `formatBusinessNumber(value)` — 대시 포함 (예: `123-45-67890`)
- `<BusinessNumber>` 컴포넌트가 자동 포맷팅, input 필드는 `value={formatBusinessNumber(state)}`
- 수정 시 `onChange`에서 `e.target.value.replace(/\D/g, '')`로 숫자만 state 저장

# 로딩 오버레이
- `overlayStyles.tsx`에서 10가지 스타일 정의
- `LoadingOverlay.tsx`가 `localStorage("loadingOverlayStyleId")` 읽어 선택된 스타일 렌더링
- 기본값: 글래스모피즘(id: 2)
- 로딩 테스트 페이지: `/loading-test`

# 신규지원이력등록 (`NewHistoryModal`)
- 단건: 기업 검색 + 지원이력 폼
- 엑셀 대량 업로드: 사업자등록번호로 기업 매칭 → 지원이력 추가
- 매칭은 오직 사업자등록번호 정확 일치 (기업명 조건 없음)
