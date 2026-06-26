import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0 opacity-15 pointer-events-none"
        >
          <source src="/CompanySearch.mp4" type="video/mp4" />
        </video>
        <Header />
        <main className="flex-1 overflow-auto p-8 relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
}
