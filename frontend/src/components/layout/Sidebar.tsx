"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/services/supabaseClient";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("jikang@gbsa.or.kr");
  const [userName, setUserName] = useState("강정일");
  const [isSuperUser, setIsSuperUser] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      if (supabase) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            setUserEmail(user.email || "jikang@gbsa.or.kr");
            setUserName(user.user_metadata?.full_name || user.user_metadata?.name || "강정일");
            if (user.user_metadata?.role === "superuser") {
              setIsSuperUser(true);
            }
          }
        } catch (error) {
          console.warn("Could not fetch user session from Supabase. Using fallback.", error);
        }
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    // Delete session cookie and redirect
    document.cookie = "gbsa_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.replace("/login");
  };

  const navItems = [
    {
      name: "통합검색",
      href: "/",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      name: "기업DB 관리",
      href: "/database",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      name: "검색기록",
      href: "/history",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: "검증결과",
      href: "/verification-results",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: "엑셀 관리",
      href: "/excel-management",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    ...(isSuperUser ? [{
      name: "폰트 테스트",
      href: "/font-test",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    }] : []),
  ];

  return (
    <aside className="w-64 bg-white/70 backdrop-blur-md border-r border-slate-200/50 flex flex-col h-screen sticky top-0 z-20 shrink-0">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white/30">
        <Link href="/" className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-gbsa-primary)] flex items-center justify-center text-white font-black shadow-md shadow-blue-500/20">
            G
          </div>
          <span className="text-lg font-extrabold bg-gradient-to-r from-[var(--color-gbsa-primary)] to-[var(--color-gbsa-secondary)] bg-clip-text text-transparent tracking-tight">
            GBSA 중복조회
          </span>
        </Link>
      </div>
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {navItems.filter(item => item.href !== "/font-test").map((item) => {
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
      {isSuperUser && (
        <div className="p-4 border-t border-slate-100">
          <Link
            href="/font-test"
            className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              pathname === "/font-test"
                ? "bg-[var(--color-gbsa-primary)]/10 text-[var(--color-gbsa-primary)] font-bold border-l-4 border-[var(--color-gbsa-primary)] shadow-sm" 
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-l-4 border-transparent hover:translate-x-1"
            }`}
          >
            <span className={pathname === "/font-test" ? "text-[var(--color-gbsa-primary)]" : "text-slate-400"}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
            <span>폰트 테스트</span>
          </Link>
        </div>
      )}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-[var(--color-gbsa-primary)] font-bold text-sm shrink-0">
            {userName ? userName.charAt(0) : "G"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{userName}</p>
            <p className="text-xs text-slate-500 truncate">{userEmail}</p>
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
