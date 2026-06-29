"use client";

import { usePathname } from "next/navigation";
import FontSelector from "./FontSelector";

export default function Header() {
  const pathname = usePathname();

  let title = "통합검색";
  let subtitle = "엑셀 파일 업로드 또는 단일 검색으로 중복 수혜 여부를 검증합니다.";

  if (pathname === "/database") {
    title = "등록기업";
    subtitle = "내부에 등록된 모든 기업 데이터베이스를 조회하고 관리합니다.";
  } else if (pathname === "/history") {
    title = "검색 기록";
    subtitle = "단일 조회 및 엑셀 대량 조회 이력을 건별로 확인합니다.";
  } else if (pathname === "/verification-results") {
    title = "검증결과";
    subtitle = "최근 통합검색을 통해 검증한 결과 목록입니다.";
  } else if (pathname === "/excel-management") {
    title = "엑셀관리";
    subtitle = "업로드된 엑셀 파일과 파싱된 데이터를 조회하고 관리합니다.";
  } else if (pathname === "/font-test") {
    title = "폰트 테스트";
    subtitle = "한글 폰트 후보를 비교하고 선택합니다.";
  }

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/50 flex items-center justify-between px-8 sticky top-0 z-30 shadow-sm shrink-0">
      <div className="flex flex-col justify-center">
        <div className="flex items-baseline gap-2">
          <h1 className="text-base font-bold text-[var(--color-gbsa-primary)] leading-tight">{title}</h1>
          <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">{subtitle}</span>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <FontSelector />
        <div className="w-px h-6 bg-gray-200" />
        <button className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-[var(--color-gbsa-primary)] transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
        <button className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-[var(--color-gbsa-primary)] transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
