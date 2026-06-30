"use client";

import { useState, useEffect } from "react";
import { OVERLAY_STYLES, getSavedOverlayStyle, saveOverlayStyle } from "@/components/overlayStyles";

export default function LoadingTestPage() {
  const [selectedId, setSelectedId] = useState<number>(2);
  const [previewId, setPreviewId] = useState<number | null>(null);

  useEffect(() => {
    setSelectedId(getSavedOverlayStyle());
  }, []);

  useEffect(() => {
    if (previewId === null) return;
    const timer = setTimeout(() => setPreviewId(null), 5000);
    return () => clearTimeout(timer);
  }, [previewId]);

  const handleSelect = (id: number) => {
    setSelectedId(id);
    saveOverlayStyle(id);
    setPreviewId(id);
  };

  const previewOverlay = OVERLAY_STYLES.find((o) => o.id === previewId);

  return (
    <div className="min-h-full space-y-4">
      <p className="text-sm text-gray-500 mb-4">
        원하는 로딩 오버레이 스타일을 클릭하면 5초간 전체화면 미리보기가 표시됩니다. 선택한 스타일은 전체 저장 버튼에 적용됩니다.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {OVERLAY_STYLES.map((overlay) => (
          <div
            key={overlay.id}
            onClick={() => handleSelect(overlay.id)}
            className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
              selectedId === overlay.id
                ? "border-blue-500 bg-blue-50 shadow-md"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  selectedId === overlay.id
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {overlay.id}
              </span>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-gray-900 text-sm">{overlay.name}</span>
              </div>
              {selectedId === overlay.id && (
                <span className="text-blue-500 text-xs font-semibold shrink-0">선택됨</span>
              )}
            </div>

            <p className="text-xs text-gray-500 mb-3">{overlay.description}</p>

            <div className="relative w-full h-40 rounded-lg border border-gray-200 overflow-hidden bg-gray-50/50">
              {previewId === overlay.id ? (
                overlay.render()
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs text-gray-400">클릭하여 5초 미리보기</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-white rounded-xl border border-gray-200">
        <p className="text-sm text-gray-500">
          현재 선택: <strong className="text-gray-900">{OVERLAY_STYLES.find((o) => o.id === selectedId)?.name || "글래스모피즘 카드"}</strong>
        </p>
        <p className="text-xs text-gray-400 mt-1">
          선택한 스타일은 전체 저장/삭제/업로드 동작에 일괄 적용됩니다. 카드를 클릭하면 5초간 전체화면 미리보기가 실행됩니다.
        </p>
      </div>

      {previewOverlay && (
        <div className="fixed inset-0 z-[9999]" onClick={() => setPreviewId(null)}>
          {previewOverlay.render()}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-4 py-2 rounded-full">
            클릭하거나 5초 후 닫힘
          </div>
        </div>
      )}
    </div>
  );
}
