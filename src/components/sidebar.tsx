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
  Ruler,
  Calculator,
  Coins,
  Menu,
  X
} from 'lucide-react';

export default function Sidebar() {
  const { user, logout, t, language, setLanguage, settings } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    const saved = localStorage.getItem('shanto_sidebar_collapsed');
    if (saved === 'true') {
      setCollapsed(true);
    }
  }, []);

  const toggleCollapsed = () => {
    const nextVal = !collapsed;
    setCollapsed(nextVal);
    localStorage.setItem('shanto_sidebar_collapsed', String(nextVal));
  };

  if (!user) return null;

  const isAdmin = user?.role === 'admin';

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
      path: '/pricing',
      icon: Coins,
      labelEn: 'Pricing List',
      labelBn: 'মূল্য তালিকা',
    },
    {
      path: '/paint-calculator',
      icon: Calculator,
      labelEn: 'Paint Calculator',
      labelBn: 'পেইন্ট ক্যালকুলেটর',
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
      adminOnly: true,
    },
  ].filter(item => !item.adminOnly || isAdmin);

  const drawerItems = [
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
      path: '/pricing',
      icon: Coins,
      labelEn: 'Pricing List',
      labelBn: 'মূল্য তালিকা',
    },
    {
      path: '/paint-calculator',
      icon: Calculator,
      labelEn: 'Paint Calculator',
      labelBn: 'ক্যালকুলেটর',
    },
    {
      path: '/stock-alert',
      icon: AlertTriangle,
      labelEn: 'Stock Alert',
      labelBn: 'সতর্কতা',
    },
    {
      path: '/sell-analyze',
      icon: TrendingUp,
      labelEn: 'Sell Analyze',
      labelBn: 'বিশ্লেষণ',
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
      labelBn: 'ইতিহাস',
    },
    {
      path: '/settings',
      icon: SettingsIcon,
      labelEn: 'Settings',
      labelBn: 'সেটিংস',
      adminOnly: true,
    },
  ].filter(item => !item.adminOnly || isAdmin);

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={`hidden md:flex flex-col bg-slate-900 border-r border-slate-800 text-slate-300 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} shrink-0 sticky top-0 h-screen`}>
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
            onClick={toggleCollapsed}
            className="absolute -right-3 top-5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full p-1 text-slate-400 hover:text-white transition-colors cursor-pointer z-10"
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Language Switcher */}
        <div className="p-3 border-b border-slate-800/60">
          <button
            onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
            className="w-full flex items-center justify-center bg-slate-955 hover:bg-slate-800 text-xs py-1.5 rounded-lg text-slate-300 hover:text-emerald-400 font-medium transition-colors border border-slate-800 cursor-pointer"
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
              <div className="text-xs text-slate-400 truncate font-mono bg-slate-950/60 p-2 rounded-lg border border-slate-800">
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

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 text-slate-350 h-16 flex justify-around items-center px-2 md:hidden shadow-lg">
        <Link 
          href="/dashboard" 
          className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors cursor-pointer ${
            pathname === '/dashboard' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">{t('Dashboard', 'ড্যাশবোর্ড')}</span>
        </Link>

        <Link 
          href="/inventory" 
          className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors cursor-pointer ${
            pathname === '/inventory' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Package className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">{t('Stock', 'স্টক')}</span>
        </Link>

        <Link 
          href="/stock-in" 
          className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors cursor-pointer ${
            pathname === '/stock-in' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <ArrowUpRight className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">{t('Stock In', 'স্টক ইন')}</span>
        </Link>

        <Link 
          href="/stock-out" 
          className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors cursor-pointer ${
            pathname === '/stock-out' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <ArrowDownLeft className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">{t('Stock Out', 'স্টক আউট')}</span>
        </Link>

        <button 
          onClick={() => setDrawerOpen(true)}
          className="flex flex-col items-center justify-center flex-1 py-1 text-center text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">{t('More', 'আরও')}</span>
        </button>
      </div>

      {/* Slide-up Drawer ("More Menu") */}
      {drawerOpen && (
        <>
          {/* Backdrop overlay */}
          <div 
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
          />
          
          {/* Drawer Container */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800 rounded-t-3xl max-h-[85vh] flex flex-col p-6 pb-8 transition-all duration-300 overflow-y-auto animate-slide-up text-slate-300">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2 font-bold text-white text-base">
                {settings?.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" className="w-5 h-5 object-contain rounded-md" />
                ) : (
                  <Paintbrush className="w-5 h-5 text-emerald-500" />
                )}
                <span>
                  {settings ? settings.shop_name : t('Shanto Paint', 'শান্তর পেইন্ট')}
                </span>
              </div>
              <button 
                onClick={() => setDrawerOpen(false)}
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Language Switcher */}
            <div className="py-4">
              <button
                onClick={() => {
                  setLanguage(language === 'en' ? 'bn' : 'en');
                }}
                className="w-full flex items-center justify-center bg-slate-950 hover:bg-slate-800 text-xs py-2 rounded-xl text-slate-300 hover:text-emerald-400 font-medium transition-colors border border-slate-800 cursor-pointer"
              >
                {language === 'en' ? 'Switch to Bangla' : 'ইংরেজিতে দেখুন'}
              </button>
            </div>

            {/* Grid Items */}
            <div className="grid grid-cols-3 gap-3 my-4">
              {drawerItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                      isActive 
                        ? 'bg-emerald-900/40 border-emerald-500/50 text-emerald-400' 
                        : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/50 text-slate-300'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-1.5 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span className="text-[10px] font-medium leading-tight truncate w-full">
                      {t(item.labelEn, item.labelBn)}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* User Info Block */}
            <div className="p-4 border-t border-slate-800/80 bg-slate-950/20 rounded-2xl mt-2 space-y-3">
              <div className="flex items-center gap-2">
                {user.role === 'admin' ? (
                  <ShieldAlert className="w-4.5 h-4.5 text-rose-400 shrink-0" />
                ) : (
                  <UserCheck className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                )}
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {user.role === 'admin' ? t('Admin Access', 'এডমিন অ্যাক্সেস') : t('Staff Access', 'স্টাফ অ্যাক্সেস')}
                </div>
              </div>
              <div className="text-xs text-slate-400 truncate font-mono bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                {user.email}
              </div>
              <button
                onClick={() => {
                  setDrawerOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 bg-rose-950/60 hover:bg-rose-900 border border-rose-900/60 hover:border-rose-800 text-rose-200 text-sm font-semibold py-2.5 rounded-xl transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('Log Out', 'লগ আউট')}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
