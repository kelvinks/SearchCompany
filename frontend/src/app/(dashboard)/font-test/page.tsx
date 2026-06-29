"use client";

import { useFont } from "@/components/FontProvider";

const SAMPLE_TEXT = "경기도경제과학진흥원 중복 지원 기업 검색 시스템";
const SAMPLE_EN = "GBSA Duplicate Support Company Search System";
const SAMPLE_NUM = "2024-06-29 사업자번호 123-45-67890 선정금액 50,000,000원";

export default function FontTestPage() {
  const { selectedFontId, setSelectedFontId, fonts } = useFont();

  return (
    <div className="min-h-full">
      <div className="space-y-4">
        {fonts.map((font) => (
          <div
            key={font.id}
            onClick={() => setSelectedFontId(font.id)}
            className={`cursor-pointer rounded-xl border-2 p-5 transition-all ${
              selectedFontId === font.id
                ? "border-blue-500 bg-blue-50 shadow-md"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  selectedFontId === font.id
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {font.id}
              </span>
              <div className="flex-1">
                <span className="font-bold text-gray-900">{font.name}</span>
              </div>
              {selectedFontId === font.id && (
                <span className="text-blue-500 text-sm font-semibold">선택됨</span>
              )}
            </div>

            <div
              className="space-y-2 text-gray-700"
              style={{ fontFamily: font.css }}
            >
              <p className="text-lg">{SAMPLE_TEXT}</p>
              <p className="text-sm text-gray-500">{SAMPLE_EN}</p>
              <p className="text-sm text-gray-400">{SAMPLE_NUM}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-white rounded-xl border border-gray-200">
        <p className="text-sm text-gray-500">
          현재 선택: <strong className="text-gray-900">{fonts.find((f) => f.id === selectedFontId)?.name}</strong>
        </p>
        <p className="text-xs text-gray-400 mt-1">
          우측 상단의 폰트 선택 드롭다운으로도 변경할 수 있습니다. 선택은 브라우저에 저장됩니다.
        </p>
      </div>
    </div>
  );
}
