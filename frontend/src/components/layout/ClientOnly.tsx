"use client";

import { useEffect, useState } from "react";

interface ClientOnlyProps {
  children: React.ReactNode;
}

export default function ClientOnly({ children }: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return (
      <div className="min-h-screen bg-[var(--color-gbsa-bg)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[var(--color-gbsa-primary)]/30 border-t-[var(--color-gbsa-primary)] rounded-full animate-spin"></div>
          <p suppressHydrationWarning={true} className="text-xs text-slate-400 font-medium">시스템을 로드하는 중...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
