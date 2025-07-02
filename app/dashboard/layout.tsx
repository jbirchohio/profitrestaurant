import { Sidebar } from '@/components/shared/sidebar';

export default function DashboardLayout({
  children,
}: { 
  children: React.ReactNode 
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-background">
        <Sidebar />
      </aside>
      <main className="flex-1 p-6 lg:p-8">{children}</main>
    </div>
  );
}
