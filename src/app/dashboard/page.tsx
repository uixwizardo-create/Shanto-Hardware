'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import LayoutWrapper from '@/components/layout-wrapper';
import { useApp } from '@/context/AppContext';
import { 
  getDashboardSummaryMetrics, 
  fetchTransactionLogs, 
  fetchInventory 
} from '@/lib/db';
import { DashboardSummary, StockTransaction, InventoryItem } from '@/lib/types';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Package, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertTriangle, 
  DollarSign, 
  Activity, 
  RefreshCcw,
  Sliders,
  ChevronDown
} from 'lucide-react';

export default function DashboardPage() {
  const { t, language } = useApp();
  const formatSize = (size: string) => {
    if (size === 'Gallon') return t('Gallon', 'গ্যালন');
    if (size === '2 Pound (.91L)') return t('2 Pound (.91L)', '২ পাউন্ড (.৯১ লি.)');
    if (size === 'Half Liter (4.55)') return t('Half Liter (4.55)', 'হাফ লিটার (৪.৫৫)');
    if (size === 'Half Pound (200ML)') return t('Half Pound (200ML)', 'হাফ পাউন্ড (২০০ মিলি)');
    return size;
  };
  const [metrics, setMetrics] = useState<DashboardSummary | null>(null);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<StockTransaction[]>([]);
  const [salesPeriod, setSalesPeriod] = useState<'today' | 'month' | 'year'>('today');
  const [chartScale, setChartScale] = useState<'day' | 'month' | 'year'>('day');
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [outOfStockCount, setOutOfStockCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [allItems, setAllItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      setError(null);
      try {
        const [summaryMetrics, recentTxs, itemsList] = await Promise.all([
          getDashboardSummaryMetrics(),
          fetchTransactionLogs(), 
          fetchInventory()
        ]);
        
        setMetrics(summaryMetrics);
        setAllTransactions(recentTxs);
        setTransactions(recentTxs.slice(0, 5));
        setAllItems(itemsList);
        
        // Filter low stock and out of stock items
        const low = itemsList.filter(item => item.current_stock < item.min_stock);
        const oos = itemsList.filter(item => item.current_stock === 0);
        
        setLowStockItems(low);
        setOutOfStockCount(oos.length);
      } catch (err: any) {
        console.error(err);
        setError(t('Failed to load dashboard statistics.', 'ড্যাশবোর্ড পরিসংখ্যান লোড করতে ব্যর্থ হয়েছে।'));
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [refreshTrigger, t]);

  // Generate chart data for dynamic sales trend (Day / Month / Year)
  const getSalesTrendData = () => {
    const dataMap: { [key: string]: number } = {};
    const today = new Date();

    if (chartScale === 'day') {
      // Initialize last 7 days with 0
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toLocaleDateString(language === 'en' ? 'en-US' : 'bn-BD', { month: 'short', day: 'numeric' });
        dataMap[dateStr] = 0;
      }

      // Populate with actual sales quantity using allTransactions
      allTransactions.forEach(tx => {
        if (tx.action_type === 'STOCK_OUT') {
          const txDate = new Date(tx.created_at);
          const dateStr = txDate.toLocaleDateString(language === 'en' ? 'en-US' : 'bn-BD', { month: 'short', day: 'numeric' });
          if (dateStr in dataMap) {
            dataMap[dateStr] += tx.quantity;
          }
        }
      });
    } else if (chartScale === 'month') {
      // Initialize last 6 months with 0
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const dateStr = d.toLocaleDateString(language === 'en' ? 'en-US' : 'bn-BD', { month: 'short', year: 'numeric' });
        dataMap[dateStr] = 0;
      }

      // Populate with actual sales quantity using allTransactions
      allTransactions.forEach(tx => {
        if (tx.action_type === 'STOCK_OUT') {
          const txDate = new Date(tx.created_at);
          const dateStr = txDate.toLocaleDateString(language === 'en' ? 'en-US' : 'bn-BD', { month: 'short', year: 'numeric' });
          if (dateStr in dataMap) {
            dataMap[dateStr] += tx.quantity;
          }
        }
      });
    } else {
      // Initialize last 5 years with 0
      for (let i = 4; i >= 0; i--) {
        const year = today.getFullYear() - i;
        const dateStr = language === 'en' ? `${year}` : year.toLocaleString('bn-BD', { useGrouping: false });
        dataMap[dateStr] = 0;
      }

      // Populate with actual sales quantity using allTransactions
      allTransactions.forEach(tx => {
        if (tx.action_type === 'STOCK_OUT') {
          const txDate = new Date(tx.created_at);
          const year = txDate.getFullYear();
          const dateStr = language === 'en' ? `${year}` : year.toLocaleString('bn-BD', { useGrouping: false });
          if (dateStr in dataMap) {
            dataMap[dateStr] += tx.quantity;
          }
        }
      });
    }

    return Object.keys(dataMap).map(key => ({
      date: key,
      sales: parseFloat(dataMap[key].toFixed(2))
    }));
  };

  const getFilteredSalesMetrics = () => {
    const today = new Date();
    const salesTxs = allTransactions.filter(t => t.action_type === 'STOCK_OUT');

    let filteredTxs = [];
    if (salesPeriod === 'today') {
      filteredTxs = salesTxs.filter(t => {
        const tDate = new Date(t.created_at);
        return tDate.getFullYear() === today.getFullYear() &&
               tDate.getMonth() === today.getMonth() &&
               tDate.getDate() === today.getDate();
      });
    } else if (salesPeriod === 'month') {
      filteredTxs = salesTxs.filter(t => {
        const tDate = new Date(t.created_at);
        return tDate.getFullYear() === today.getFullYear() &&
               tDate.getMonth() === today.getMonth();
      });
    } else { // 'year'
      filteredTxs = salesTxs.filter(t => {
        const tDate = new Date(t.created_at);
        return tDate.getFullYear() === today.getFullYear();
      });
    }

    const units = filteredTxs.reduce((sum, t) => sum + t.quantity, 0);
    const txCount = filteredTxs.length;

    return { units, txCount };
  };

  const { units: salesUnits, txCount: salesTxCount } = getFilteredSalesMetrics();

  const sizeChartData = [
    { name: t('Gallon', 'গ্যালন'), stock: allItems.filter(i => i.size === 'Gallon').reduce((acc, i) => acc + i.current_stock, 0) },
    { name: t('2 Pound', '২ পাউন্ড'), stock: allItems.filter(i => i.size === '2 Pound (.91L)').reduce((acc, i) => acc + i.current_stock, 0) },
    { name: t('Half Liter', 'হাফ লিটার'), stock: allItems.filter(i => i.size === 'Half Liter (4.55)').reduce((acc, i) => acc + i.current_stock, 0) },
    { name: t('Half Pound', 'হাফ পাউন্ড'), stock: allItems.filter(i => i.size === 'Half Pound (200ML)').reduce((acc, i) => acc + i.current_stock, 0) },
  ];

  const salesTrendData = getSalesTrendData();

  return (
    <LayoutWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              {t('Dashboard Overview', 'ড্যাশবোর্ড ওভারভিউ')}
            </h1>
            <p className="text-slate-550 text-sm mt-1">
              {t('Real-time paint stock tracking, sales performance, and logistics indicators.', 'রিয়েল-টাইম পেইন্ট স্টক ট্র্যাকিং, বিক্রয় কর্মক্ষমতা এবং লজিস্টিক নির্দেশক।')}
            </p>
          </div>
          <button
            onClick={() => setRefreshTrigger(p => p + 1)}
            className="flex items-center justify-center gap-2 self-start bg-white border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{t('Refresh Data', 'রিফ্রেশ করুন')}</span>
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Total Stock */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {t('Total Paint Stock', 'মোট পেইন্ট স্টক')}
                </p>
                <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mt-2">
                  {loading ? '...' : (metrics?.totalStock || 0)}
                </h3>
              </div>
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100 flex items-center gap-1">
              <span className="font-semibold text-slate-800">{allItems.length}</span>
              <span>{t('Unique combinations', 'অনন্য কালার-সাইজ কম্বিনেশন')}</span>
            </div>
            <Link
              href="/inventory"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-0.5 absolute bottom-5 right-5 cursor-pointer z-10"
            >
              <span>{t('View', 'দেখুন')}</span>
              <span>&rarr;</span>
            </Link>
          </div>

          {/* Card 2: Sales overview with Dropdown */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {t('Products Sold', 'বিক্রয় পরিমাণ')}
                </p>
                <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mt-2">
                  {loading ? '...' : salesUnits.toLocaleString()}
                </h3>
              </div>
              <div className="shrink-0 relative">
                <select
                  value={salesPeriod}
                  onChange={(e) => setSalesPeriod(e.target.value as any)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-1 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer appearance-none"
                >
                  <option value="today">{t("Today's Sales", 'আজকের বিক্রি')}</option>
                  <option value="month">{t("This Month's Sales", 'এই মাসের বিক্রি')}</option>
                  <option value="year">{t("This Year's Sales", 'এই বছরের বিক্রি')}</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100 flex items-center gap-1">
              <span className="font-semibold text-emerald-600">{salesTxCount}</span>
              <span>{t('sales transactions', 'টি বিক্রয় সম্পন্ন')}</span>
            </div>
          </div>

          {/* Card 3: Stock Alert with redirect link */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {t('Low Stock Alerts', 'কম স্টক সতর্কতা')}
                </p>
                <h3 className="text-2xl md:text-3xl font-bold text-rose-600 mt-2">
                  {loading ? '...' : (metrics?.lowStockCount || 0)}
                </h3>
              </div>
              <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100 flex items-center gap-1">
              <span className="font-semibold text-rose-600">{outOfStockCount}</span>
              <span>{t('items out of stock', 'টি পণ্য বর্তমানে স্টক বিহীন')}</span>
            </div>
            <Link
              href="/stock-alert"
              className="text-xs font-semibold text-emerald-605 hover:text-emerald-700 hover:underline flex items-center gap-0.5 absolute bottom-5 right-5 cursor-pointer z-10 animate-pulse"
            >
              <span>{t('View', 'দেখুন')}</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales Trend Chart */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base font-semibold text-slate-900">
                  {t('Sales Quantity Trend', 'বিক্রয় প্রবণতা')}
                </h3>
              </div>
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  onClick={() => setChartScale('day')}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                    chartScale === 'day' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {t('Day', 'দিন')}
                </button>
                <button
                  onClick={() => setChartScale('month')}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                    chartScale === 'month' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {t('Month', 'মাস')}
                </button>
                <button
                  onClick={() => setChartScale('year')}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                    chartScale === 'year' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {t('Year', 'বছর')}
                </button>
              </div>
            </div>
            <div className="h-64 md:h-80 w-full">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none' }}
                      labelStyle={{ color: '#f8fafc', fontWeight: '600', fontSize: '12px' }}
                      itemStyle={{ color: '#34d399' }}
                      formatter={(value) => [`${value} ${t('units', 'টি')}`, t('Products Sold', 'বিক্রয়কৃত পণ্য')]}
                    />
                    <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Size-wise Distribution */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-emerald-500" />
              <h3 className="text-base font-semibold text-slate-900">
                {t('Stock Distribution by Size', 'সাইজ অনুযায়ী স্টক বন্টন')}
              </h3>
            </div>
            <div className="h-64 md:h-80 w-full">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sizeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none' }}
                      labelStyle={{ color: '#f8fafc', fontWeight: '600', fontSize: '12px' }}
                      itemStyle={{ color: '#38bdf8' }}
                      formatter={(value) => [value, t('Units', 'ইউনিট')]}
                    />
                    <Bar dataKey="stock" radius={[6, 6, 0, 0]}>
                      {sizeChartData.map((entry, index) => {
                        const colors = ['#10b981', '#06b6d4', '#3b82f6', '#6366f1'];
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Lower Grid: Recent Activity & Low Stock Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base font-semibold text-slate-900">
                  {t('Recent Transactions', 'সাম্প্রতিক লেনদেন')}
                </h3>
              </div>
              <Link
                href="/history"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>{t('View', 'দেখুন')}</span>
                <span>&rarr;</span>
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3 py-4">
                <div className="h-10 bg-slate-100 rounded-lg animate-pulse"></div>
                <div className="h-10 bg-slate-100 rounded-lg animate-pulse"></div>
                <div className="h-10 bg-slate-100 rounded-lg animate-pulse"></div>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                {t('No transactions recorded yet.', 'কোন লেনদেনের তথ্য পাওয়া যায়নি।')}
              </div>
            ) : (
              <div className="space-y-3.5">
                {transactions.map((tx) => {
                  let actionClass = '';
                  let actionLabel = '';
                  let Icon = Activity;

                  if (tx.action_type === 'STOCK_IN') {
                    actionClass = 'bg-emerald-105 text-emerald-700 bg-emerald-100';
                    actionLabel = t('Stock In', 'স্টক ইন');
                    Icon = ArrowUpRight;
                  } else if (tx.action_type === 'STOCK_OUT') {
                    actionClass = 'bg-rose-105 text-rose-700 bg-rose-100';
                    actionLabel = t('Sale', 'বিক্রয়');
                    Icon = ArrowDownLeft;
                  } else if (tx.action_type === 'ADJUSTMENT') {
                    actionClass = 'bg-amber-105 text-amber-700 bg-amber-100';
                    actionLabel = t('Adjustment', 'সমন্বয়');
                    Icon = Sliders;
                  }

                  return (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${actionClass}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">
                            {tx.item?.color_name_en} ({formatSize(tx.item?.size || '')})
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {new Date(tx.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-bold ${
                          tx.action_type === 'STOCK_IN' ? 'text-emerald-600' : tx.action_type === 'STOCK_OUT' ? 'text-rose-600' : 'text-amber-600'
                        }`}>
                          {tx.action_type === 'STOCK_OUT' ? '-' : '+'}{tx.quantity}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                          {tx.profile?.name || tx.profile?.email.split('@')[0]}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Low Stock Warning Panel */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-semibold text-slate-900">
                  {t('Low Stock Alerts', 'কম স্টক সতর্কতা')}
                </h3>
              </div>
              <Link
                href="/stock-alert"
                className="text-xs font-semibold text-rose-605 hover:text-rose-800 hover:underline flex items-center gap-0.5 cursor-pointer animate-pulse"
              >
                <span>{t('View', 'দেখুন')}</span>
                <span>&rarr;</span>
              </Link>
            </div>
            <p className="text-slate-500 text-xs mb-4">
              {t('These paint items are at or below minimum reorder level.', 'এই পেইন্ট পণ্যগুলো নূন্যতম স্টক সীমার নিচে রয়েছে।')}
            </p>

            {loading ? (
              <div className="space-y-3 py-4">
                <div className="h-10 bg-slate-100 rounded-lg animate-pulse"></div>
                <div className="h-10 bg-slate-100 rounded-lg animate-pulse"></div>
              </div>
            ) : lowStockItems.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                <p className="text-emerald-700 font-medium">✓ {t('All items are sufficiently stocked.', 'সকল পণ্যের পর্যাপ্ত স্টক রয়েছে।')}</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {lowStockItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-rose-50/40 border border-rose-100 rounded-xl">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{item.color_name_en}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {t('Size', 'সাইজ')}: {formatSize(item.size)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        item.current_stock === 0 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.current_stock === 0 ? t('Out of Stock', 'স্টক নেই') : `${item.current_stock} / ${item.minimum_stock}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
