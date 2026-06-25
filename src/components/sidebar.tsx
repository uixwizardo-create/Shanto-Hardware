'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  LayoutDashboard,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Paintbrush,
  UserCheck,
  ShieldAlert,
  Settings as SettingsIcon,
  Tags,
  History,
  Ruler
} from 'lucide-react';

export default function Sidebar() {
  const { user, logout, t, language, setLanguage, settings } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  if (!user) return null;

  const menuItems = [
    {
      path: '/dashboard',
      icon: LayoutDashboard,
      labelEn: 'Dashboard',
      labelBn: 'ড্যাশবোর্ড',
    },
    {
      path: '/inventory',
      icon: Package,
      labelEn: 'Stock',
      labelBn: 'স্টক',
    },
    {
      path: '/categories',
      icon: Tags,
      labelEn: 'Categories',
      labelBn: 'ক্যাটাগরি',
    },
    {
      path: '/sizes',
      icon: Ruler,
      labelEn: 'Sizes',
      labelBn: 'সাইজ',
    },
    {
      path: '/stock-in',
      icon: ArrowUpRight,
      labelEn: 'Stock In',
      labelBn: 'স্টক ইন',
    },
    {
      path: '/stock-out',
      icon: ArrowDownLeft,
      labelEn: 'Stock Out',
      labelBn: 'স্টক আউট',
    },
    {
      path: '/stock-alert',
      icon: AlertTriangle,
      labelEn: 'Stock Alert',
      labelBn: 'স্টক সতর্কতা',
    },
    {
      path: '/sell-analyze',
      icon: TrendingUp,
      labelEn: 'Sell Analyze',
      labelBn: 'বিক্রয় বিশ্লেষণ',
    },
    {
      path: '/reports',
      icon: BarChart3,
      labelEn: 'Report',
      labelBn: 'রিপোর্ট',
    },
    {
      path: '/history',
      icon: History,
      labelEn: 'History Log',
      labelBn: 'লেনদেনের ইতিহাস',
    },
    {
      path: '/settings',
      icon: SettingsIcon,
      labelEn: 'Settings',
      labelBn: 'সেটিংস',
    },
  ];

  return (
    <div className={`flex flex-col bg-slate-900 border-r border-slate-805 text-slate-300 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} shrink-0 sticky top-0 h-screen`}>
      {/* Brand Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 h-16">
        {!collapsed && (
          <div className="flex items-center gap-2 font-bold text-white text-base">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="w-5 h-5 object-contain rounded-md" />
            ) : (
              <Paintbrush className="w-5 h-5 text-emerald-500" />
            )}
            <span className="tracking-wide truncate max-w-[150px]">
              {settings ? settings.shop_name : t('Shanto Paint', 'শান্তর পেইন্ট')}
            </span>
          </div>
        )}
        {collapsed && (
          <Paintbrush className="w-5 h-5 text-emerald-500 mx-auto" />
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full p-1 text-slate-400 hover:text-white transition-colors cursor-pointer z-10"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Language Switcher */}
      <div className="p-3 border-b border-slate-800/60">
        <button
          onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
          className="w-full flex items-center justify-center bg-slate-950 hover:bg-slate-800 text-xs py-1.5 rounded-lg text-slate-300 hover:text-emerald-400 font-medium transition-colors border border-slate-805 cursor-pointer"
        >
          {collapsed ? t('EN', 'বাং') : (language === 'en' ? 'Switch to Bangla' : 'ইংরেজিতে দেখুন')}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-emerald-950/70 text-emerald-400 border-l-2 border-emerald-500'
                  : 'hover:bg-slate-800/60 hover:text-white'
              }`}
              title={t(item.labelEn, item.labelBn)}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              {!collapsed && (
                <span className="truncate">{t(item.labelEn, item.labelBn)}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Info Block */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
        {!collapsed ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              {user.role === 'admin' ? (
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {user.role === 'admin' ? t('Admin Access', 'এডমিন অ্যাক্সেস') : t('Staff Access', 'স্টাফ অ্যাক্সেস')}
              </div>
            </div>
            <div className="text-xs text-slate-400 truncate font-mono bg-slate-950/60 p-2 rounded-lg border border-slate-850">
              {user.email}
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 bg-rose-950/60 hover:bg-rose-900 border border-rose-900/60 hover:border-rose-800 text-rose-200 text-xs font-medium py-2 rounded-xl transition-all cursor-pointer mt-1"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('Log Out', 'লগ আউট')}</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-1">
            <div
              title={user.role === 'admin' ? t('Admin', 'এডমিন') : t('Staff', 'স্টাফ')}
              className={`p-1.5 rounded-lg ${user.role === 'admin' ? 'bg-rose-950/60' : 'bg-emerald-950/60'}`}
            >
              {user.role === 'admin' ? (
                <ShieldAlert className="w-4 h-4 text-rose-400" />
              ) : (
                <UserCheck className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            <button
              onClick={logout}
              title={t('Log Out', 'লগ আউট')}
              className="p-2 bg-slate-900 hover:bg-rose-950/60 rounded-xl text-rose-400 hover:text-rose-200 border border-slate-800 hover:border-rose-900/60 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
