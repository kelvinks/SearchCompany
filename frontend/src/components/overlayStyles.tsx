export interface OverlayStyle {
  id: number;
  name: string;
  description: string;
  render: (message?: string) => React.ReactNode;
}

export const OVERLAY_STYLES: OverlayStyle[] = [
  {
    id: 1,
    name: "모던 스켈레톤",
    description: "상단 얇은 진행바 + 중앙 둥근 스피너, 백그라운드 블러",
    render: (msg) => (
      <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-100">
          <div className="h-full w-2/3 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full animate-pulse" />
        </div>
        <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin" />
        <span className="text-sm text-gray-600 font-semibold tracking-wide">{msg}</span>
      </div>
    ),
  },
  {
    id: 2,
    name: "글래스모피즘 카드",
    description: "유리 질감 카드 + 로딩 스피너, 모던한 중앙 집중형",
    render: (msg) => (
      <div className="absolute inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center">
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 p-8 flex flex-col items-center gap-4 min-w-[200px]">
          <div className="w-10 h-10 rounded-full border-[3px] border-blue-200 border-t-blue-600 animate-spin" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-bold text-gray-800">{msg}</span>
            <span className="text-[11px] text-gray-500">잠시만 기다려주세요</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    name: "바운싱 도트",
    description: "세로로 춤추는 3개의 도트, 심플하고 귀여운 느낌",
    render: (msg) => (
      <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <span className="text-sm text-gray-600 font-semibold">{msg}</span>
        </div>
      </div>
    ),
  },
  {
    id: 4,
    name: "펄스 링",
    description: "확장되는 원형 링 애니메이션, 세련된 로딩 효과",
    render: (msg) => (
      <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
        <div className="flex flex-col items-center gap-5">
          <div className="relative w-14 h-14 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-blue-200 animate-ping" />
            <div className="absolute inset-2 rounded-full border-2 border-blue-300 animate-ping" style={{ animationDelay: "0.3s" }} />
            <div className="w-4 h-4 rounded-full bg-blue-500" />
          </div>
          <span className="text-sm text-gray-600 font-semibold">{msg}</span>
        </div>
      </div>
    ),
  },
  {
    id: 5,
    name: "미니멀 탑바",
    description: "화면 상단 얇은 바만 흐름, 배경 변화 없음. 가장 미니멀",
    render: (msg) => (
      <div className="absolute inset-0 flex flex-col">
        <div className="relative h-1 bg-blue-100 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-[slide_1.5s_ease-in-out_infinite]" style={{ width: "40%", left: "-40%" }} />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm text-gray-500 font-semibold">{msg}</span>
        </div>
      </div>
    ),
  },
  {
    id: 6,
    name: "로딩 선 리본",
    description: "중앙에 얇은 선이 좌우로 움직이며 로딩 상태 표시",
    render: (msg) => (
      <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
        <div className="flex flex-col items-center gap-5">
          <div className="relative w-32 h-[3px] bg-gray-200 rounded-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-blue-600 to-blue-400 rounded-full animate-[slide_1.2s_ease-in-out_infinite]" style={{ width: "50%" }} />
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm text-gray-600 font-semibold">{msg}</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 7,
    name: "체크 애니메이션",
    description: "저장 완료 시 체크 표시로 전환, 완료 피드백까지 제공",
    render: (msg) => (
      <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center">
            <svg className="w-7 h-7 text-blue-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-sm text-gray-600 font-semibold">{msg}</span>
        </div>
      </div>
    ),
  },
  {
    id: 8,
    name: "코너 로딩",
    description: "화면 모서리를 따라 도는 보더 애니메이션, 독특한 스타일",
    render: (msg) => (
      <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center">
        <div className="relative p-8">
          <div className="absolute top-0 left-0 w-8 h-[3px] bg-gradient-to-r from-transparent to-blue-500 animate-pulse" />
          <div className="absolute top-0 right-0 w-[3px] h-8 bg-gradient-to-b from-transparent to-blue-500 animate-pulse" style={{ animationDelay: "0.25s" }} />
          <div className="absolute bottom-0 right-0 w-8 h-[3px] bg-gradient-to-l from-transparent to-blue-500 animate-pulse" style={{ animationDelay: "0.5s" }} />
          <div className="absolute bottom-0 left-0 w-[3px] h-8 bg-gradient-to-t from-transparent to-blue-500 animate-pulse" style={{ animationDelay: "0.75s" }} />
          <div className="flex flex-col items-center gap-3">
            <svg className="w-8 h-8 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm text-gray-600 font-semibold">{msg}</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 9,
    name: "진행바 (업로드형)",
    description: "엑셀 업로드/매칭에 사용되는 진행바, 데이터 처리 중 표시",
    render: (msg) => (
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center z-20">
        <div className="w-64">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 animate-progress-bar rounded-full" />
          </div>
          <p className="text-sm text-center mt-3 font-bold text-blue-600">{msg}</p>
        </div>
      </div>
    ),
  },
  {
    id: 10,
    name: "인라인 스피너",
    description: "검색기록/검증결과 페이지에서 사용, 간결한 인라인 로딩",
    render: (msg) => (
      <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">{msg}</span>
        </div>
      </div>
    ),
  },
];

export const STORAGE_KEY = "loadingOverlayStyleId";

export function getSavedOverlayStyle(): number {
  if (typeof window === "undefined") return 2;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const id = Number(saved);
    if (OVERLAY_STYLES.some((s) => s.id === id)) return id;
  }
  return 2;
}

export function saveOverlayStyle(id: number): void {
  localStorage.setItem(STORAGE_KEY, String(id));
}
