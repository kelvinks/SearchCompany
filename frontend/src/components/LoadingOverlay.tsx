"use client";

import { useEffect, useState } from "react";
import { OVERLAY_STYLES, getSavedOverlayStyle } from "./overlayStyles";

interface LoadingOverlayProps {
  show: boolean;
  message?: string;
}

export default function LoadingOverlay({ show, message = "저장 중입니다..." }: LoadingOverlayProps) {
  const [styleId, setStyleId] = useState(2);

  useEffect(() => {
    setStyleId(getSavedOverlayStyle());
  }, []);

  if (!show) return null;

  const style = OVERLAY_STYLES.find((s) => s.id === styleId) || OVERLAY_STYLES[1];

  return (
    <div className="absolute inset-0 z-[9999]">
      {style.render(message)}
    </div>
  );
}
