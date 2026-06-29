import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import ClientOnly from "@/components/layout/ClientOnly";
import VideoBackground from "@/components/layout/VideoBackground";
import { FontProvider } from "@/components/FontProvider";
import { AuthProvider } from "@/components/AuthProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientOnly>
      <AuthProvider>
        <FontProvider>
          <div className="flex h-screen w-full">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
              {/* Background Video */}
              <VideoBackground />
              <Header />
              <main className="flex-1 overflow-auto p-8 relative z-10">
                {children}
              </main>
            </div>
          </div>
        </FontProvider>
      </AuthProvider>
    </ClientOnly>
  );
}
