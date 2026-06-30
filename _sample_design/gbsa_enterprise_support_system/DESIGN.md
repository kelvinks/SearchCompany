---
name: GBSA Enterprise Support System
colors:
  surface: '#faf8ff'
  surface-dim: '#dad9e0'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3fa'
  surface-container: '#eeedf4'
  surface-container-high: '#e8e7ee'
  surface-container-highest: '#e2e2e9'
  on-surface: '#1a1b20'
  on-surface-variant: '#434651'
  inverse-surface: '#2f3036'
  inverse-on-surface: '#f1f0f7'
  outline: '#747782'
  outline-variant: '#c4c6d3'
  surface-tint: '#365ca8'
  primary: '#002f72'
  on-primary: '#ffffff'
  primary-container: '#1c4691'
  on-primary-container: '#9ab7ff'
  inverse-primary: '#b0c6ff'
  secondary: '#2759bc'
  on-secondary: '#ffffff'
  secondary-container: '#6d98fe'
  on-secondary-container: '#002e76'
  tertiary: '#562400'
  on-tertiary: '#ffffff'
  tertiary-container: '#793500'
  on-tertiary-container: '#ffa169'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d9e2ff'
  primary-fixed-dim: '#b0c6ff'
  on-primary-fixed: '#001944'
  on-primary-fixed-variant: '#18438e'
  secondary-fixed: '#dae2ff'
  secondary-fixed-dim: '#b1c5ff'
  on-secondary-fixed: '#001947'
  on-secondary-fixed-variant: '#00419f'
  tertiary-fixed: '#ffdbc9'
  tertiary-fixed-dim: '#ffb68d'
  on-tertiary-fixed: '#331200'
  on-tertiary-fixed-variant: '#763300'
  background: '#faf8ff'
  on-background: '#1a1b20'
  surface-variant: '#e2e2e9'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  mono-data:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 24px
  gutter: 16px
  sidebar-width: 260px
  stack-gap: 12px
  section-gap: 32px
---

## 브랜드 & 스타일

이 디자인 시스템은 높은 중요도를 가진 B2B 엔터프라이즈 환경, 특히 경기도경제과학진흥원(GBSA)을 위해 설계되었습니다. 브랜드 성격은 **권위적이고, 체계적이며, 정밀합니다**. 사용자가 복잡한 데이터셋을 탐색하여 중복 지원 여부를 식별하는 과정에서 신뢰감과 안정감을 느낄 수 있도록 하는 것이 목표입니다.

디자인 스타일은 **코퍼레이트 / 모던** 스타일로, 높은 활용성의 레이아웃과 구조화된 정보 계층 구조에 중점을 둡니다. 장식보다 명확성을 우선시하며, 깔끔한 그리드, 데이터 가독성을 위한 여백, GBSA 기업 아이덴티티를 강화하는 정교한 색상 팔레트를 활용합니다. 인터페이스는 기능적이고 눈에 거슬리지 않게 유지되며, 중요한 상태 표시(위험, 경고, 안전)가 필요할 때 주목을 받을 수 있도록 합니다.

## 색상

이 디자인 시스템은 구조화된 색상 계층을 사용하여 검증 과정에서 사용자의 시선을 안내합니다.

- **Primary (GBSA Blue):** 주요 액션, 네비게이션 강조, 진행 표시기에 사용되어 기관 브랜드를 강화합니다.
- **Secondary:** 호버 상태와 활성 인터랙티브 요소에 적용되어 명확한 시각적 피드백을 제공합니다.
- **Surface & Background:** 깔끔한 중성 배경(#F8F9FA)이 순백색(#FFFFFF) 카드와 패널에 대비를 제공하여 명확한 "계층적" 깊이감을 만듭니다.
- **Semantic Palette:** 이 시스템에서 가장 중요한 계층입니다.
    - **정확 일치 (위험):** 높은 긴급도의 빨간색으로 즉각적인 주의 환기.
    - **유사 일치 (경고):** 주황색으로 수동 검토 필요 표시.
    - **일치 없음 (안전):** 녹색으로 이상 없음 표시.

## 타이포그래피

이 시스템은 데이터 중심 환경에서 뛰어난 가독성과 중립적이고 전문적인 톤을 제공하는 **Inter**를 사용합니다.

- **계층 구조:** 굵은 두께는 페이지 헤더와 테이블 제목에 사용됩니다.
- **데이터 밀도:** `body-sm`과 `mono-data`는 대시보드의 주요 워크호스로, 가독성을 희생하지 않으면서 높은 정보 밀도를 제공합니다.
- **라벨:** 대문자 스타일은 사이드바와 테이블 헤더에서 구조적 구분을 제공하기 위해 라벨과 카테고리 헤더에 제한적으로 사용됩니다.

## 레이아웃 & 간격

디자인 시스템은 고정 사이드바 제약 조건을 가진 **유동 그리드(Fluid Grid)** 모델을 사용합니다.

- **사이드바:** 고정 260px 너비로 네비게이션이 항상 접근 가능하도록 합니다.
- **메인 콘텐츠:** 화면 너비에 따라 재배치되는 유연한 12컬럼 그리드입니다.
- **데이터 테이블:** 작은 뷰포트에서는 접힘 대신 수평 스크롤을 사용하여 비교를 위한 행 수준의 맥락을 유지해야 합니다.
- **간격 리듬:** 4px 기준선을 기반으로 합니다. 컴포넌트는 일반적으로 16px(4단위) 또는 24px(6단위)의 내부 패딩을 사용하여 여유롭고 전문적인 느낌을 유지합니다.

## 입체감 & 깊이

깔끔한 엔터프라이즈급 외관을 유지하기 위해 시스템은 **톤 레이어링(Tonal Layering)** 과 **앰비언트 섀도우(Ambient Shadows)** 를 결합하여 사용합니다.

- **Level 0 (배경):** 기본 레이어(#F8F9FA).
- **Level 1 (카드/패널):** 4px 블러 섀도우(6% 불투명도)로 부드럽게 떠 있는 느낌을 주는 순백색 표면.
- **Level 2 (모달/팝오버):** 12px 블러 섀도우(10% 불투명도)와 1px 소프트 테두리(#E2E8F0)로 배경 콘텐츠와의 분리를 확보.
- **비교 강조:** 비교 중에는 "활성" 또는 "강조" 패널에 섀도우 대신 2px Primary 색상 테두리를 사용하여 포커스를 표시합니다.

## 형태

형태 언어는 **Rounded (8px)** 기본값을 사용하여 현대적인 SaaS 표준과 일관성을 유지합니다. 이는 데이터의 산업적인 성격을 지나치게 캐주얼해지지 않으면서 부드럽게 만듭니다.

- **주요 컴포넌트:** 버튼, 입력 필드, 카드는 표준 8px 둥글기를 사용합니다.
- **상태 배지:** 완전히 둥근(알약 모양) 둥글기를 사용하여 인터랙티브 버튼이 아닌 상태 표시기임을 구분합니다.
- **데이터 테이블:** 테이블 컨테이너의 상단 모서리는 8px 둥글기를 따르지만, 내부 행 셀은 수평 공간을 최대화하기 위해 날카롭게 유지됩니다.

## 컴포넌트

### 사이드 네비게이션
사이드바는 다크온라이트 또는 GBSA Blue 테마를 사용합니다. 활성 상태는 왼쪽 가장자리의 4px 수직 바와 미묘한 파란색 배경 틴트(Primary 10% 불투명도)로 표시됩니다.

### 검색창 & 입력 필드
검색창은 GBSA Blue 아이콘을 특징으로 합니다. 입력 필드는 1px 테두리(#CBD5E0)를 사용하며 포커스 시 GBSA Blue로 전환됩니다.

### 파일 업로드 영역
드래그 앤 드롭 영역은 GBSA Blue의 점선 테두리와 연한 파란색 배경 틴트를 사용합니다. 아이콘과 주요 텍스트는 중앙에 배치되어 상호작용을 명확히 유도합니다.

### 데이터 테이블
헤더는 연한 회색 배경(#F1F5F9)과 굵은 라벨을 사용합니다. 행에는 미묘한 호버 효과(#F8F9FA)가 적용됩니다. 셀 내의 비교 강조 표시는 고대비 배경(예: 연한 파란색 틴트)을 사용하여 특정 중복 텍스트 문자열을 지적합니다.

### 상태 배지
배지는 "소프트" 색상 처리를 사용합니다: 상태 색상의 15% 불투명도 배경과 100% 불투명도 전경 텍스트 색상으로 최대 가독성을 제공합니다.

### 비교 모달
분할 창 뷰입니다. 왼쪽은 "현재 신청", 오른쪽은 "의심 중복"을 표시합니다. 차이점은 고대비 텍스트 배경으로 Primary 파란색을 사용하여 강조 표시됩니다.

### 진행바
진행바는 연한 회색의 두꺼운 8px 트랙을 사용하며, 활성 진행률은 단색 GBSA Blue로 표시됩니다. 장기 실행 검색 작업의 경우 파란색 채움에 펄스(pulse) 애니메이션이 적용됩니다.
