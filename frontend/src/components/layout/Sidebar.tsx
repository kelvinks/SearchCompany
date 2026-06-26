"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    // Delete session cookie and redirect
    document.cookie = "gbsa_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.replace("/login");
  };

  const navItems = [
    {
      name: "통합 검색",
      href: "/",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      name: "기업 DB 관리",
      href: "/database",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      name: "검색 기록",
      href: "/history",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <aside suppressHydrationWarning={true} className="w-64 bg-white/70 backdrop-blur-md text-slate-800 flex flex-col h-screen sticky top-0 shrink-0 border-r border-slate-200/50 shadow-sm z-20">
      <div className="p-6 border-b border-slate-100 bg-white/35">
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-gbsa-primary)]">GBSA Enterprise</h1>
        <p className="text-xs text-slate-500 mt-1">Support System</p>
      </div>
      <nav className="flex-1 px-3 space-y-1.5 mt-6">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive 
                  ? "bg-[var(--color-gbsa-primary)]/10 text-[var(--color-gbsa-primary)] font-bold border-l-4 border-[var(--color-gbsa-primary)] shadow-sm" 
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-l-4 border-transparent hover:translate-x-1"
              }`}
            >
              <span className={isActive ? "text-[var(--color-gbsa-primary)]" : "text-slate-400"}>
                {item.icon}
              </span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-[var(--color-gbsa-primary)] font-bold text-sm shrink-0">
            G
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">GBSA 관리자</p>
            <p className="text-xs text-slate-500 truncate">admin@gbsa.or.kr</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          title="로그아웃"
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
