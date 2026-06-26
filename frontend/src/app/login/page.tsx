'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Mock login delay
    setTimeout(() => {
      setIsLoading(false);
      if (email === "admin@gbsa.or.kr" && password === "admin") {
        // Set session cookie valid for 1 day
        document.cookie = "gbsa_session=true; path=/; max-age=86400";
        router.replace("/");
      } else {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      }
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gray-900">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-40"
      >
        <source src="/CompanySearch2.mp4" type="video/mp4" />
      </video>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md p-8 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-gbsa-primary)] mb-2">GBSA 지원 관리</h1>
          <p className="text-gray-500 font-medium">중복 지원 검색 시스템 관리자 로그인</p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-semibold text-center animate-fade-in flex items-center justify-center gap-2">
            <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">이메일 (관리자 계정)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@gbsa.or.kr"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[var(--color-gbsa-secondary)] focus:border-transparent outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[var(--color-gbsa-secondary)] focus:border-transparent outline-none transition-all"
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center text-gray-600 cursor-pointer">
              <input type="checkbox" className="mr-2 rounded text-[var(--color-gbsa-primary)] focus:ring-[var(--color-gbsa-primary)]" />
              로그인 상태 유지
            </label>
            <a href="#" className="text-[var(--color-gbsa-primary)] hover:underline font-medium">비밀번호 찾기</a>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[var(--color-gbsa-primary)] hover:bg-blue-800 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              "로그인"
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-400">
          <p>© 2026 Gyeonggido Business &amp; Science Accelerator.</p>
          <p>All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
