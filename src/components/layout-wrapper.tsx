'use client';

import React from 'react';
import Sidebar from '@/components/sidebar';
import { useApp } from '@/context/AppContext';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading } = useApp();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium animate-pulse text-sm">Checking authentication / অথেন্টিকেশন পরীক্ষা করা হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Redirection to /login is handled in AppContext
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
