"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const FONTS = [
  { id: 1, name: "Gowun Dodum", css: '"Gowun Dodum", sans-serif' },
  { id: 2, name: "Noto Sans KR", css: '"Noto Sans KR", sans-serif' },
  { id: 3, name: "Nanum Gothic", css: '"Nanum Gothic", sans-serif' },
  { id: 4, name: "Chiron GoRound TC", css: '"Chiron GoRound TC Variable", sans-serif' },
  { id: 5, name: "Gothic A1", css: '"Gothic A1", sans-serif' },
  { id: 6, name: "Nanum Gothic Coding", css: '"Nanum Gothic Coding", monospace' },
  { id: 7, name: "Dongle", css: '"Dongle", sans-serif' },
  { id: 8, name: "Asta Sans", css: '"Asta Sans Variable", sans-serif' },
  { id: 9, name: "Iosevka Charon", css: '"Iosevka Charon", monospace' },
];

const STORAGE_KEY = "gbsa-font";

interface FontContextType {
  selectedFontId: number;
  setSelectedFontId: (id: number) => void;
  fonts: typeof FONTS;
}

const FontContext = createContext<FontContextType>({
  selectedFontId: 4,
  setSelectedFontId: () => {},
  fonts: FONTS,
});

export function useFont() {
  return useContext(FontContext);
}

export function FontProvider({ children }: { children: ReactNode }) {
  const [selectedFontId, setSelectedFontIdState] = useState(4);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setSelectedFontIdState(Number(saved));
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_KEY, String(selectedFontId));
    const font = FONTS.find((f) => f.id === selectedFontId);
    if (font) {
      document.body.style.fontFamily = font.css;
    }
  }, [selectedFontId, mounted]);

  const setSelectedFontId = (id: number) => {
    setSelectedFontIdState(id);
  };

  return (
    <FontContext.Provider value={{ selectedFontId, setSelectedFontId, fonts: FONTS }}>
      {children}
    </FontContext.Provider>
  );
}
