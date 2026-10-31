import { Suspense } from 'react';
import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import { AuthGuard } from '@/components/AuthGuard';
import { LanguageProvider } from '@/lib/LanguageContext';
import { AuthProvider } from '@/lib/AuthContext';

export const metadata: Metadata = {
  title: 'Accord Pharma · Commercial CRM & Clinical e-Detailing Studio',
  description: 'Next-generation pharmaceutical CRM, Key Opinion Leader hub, clinical trial e-detailing aid, and hospital formulary tracker.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
        <AuthProvider>
          <LanguageProvider>
          {/* Navigation Sidebar */}
          <Suspense
            fallback={
              <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-screen sticky top-0 shrink-0" />
            }
          >
            <Sidebar />
          </Suspense>

          {/* Main Application Area */}
          <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-y-auto">
            <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
              <AuthGuard>{children}</AuthGuard>
            </main>
          </div>
        </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
