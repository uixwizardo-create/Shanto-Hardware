'use client';

import React, { useState, useEffect } from 'react';
import LayoutWrapper from '@/components/layout-wrapper';
import { useApp } from '@/context/AppContext';
import { fetchReports, fetchSizes } from '@/lib/db';
import { StockTransaction, Size } from '@/lib/types';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Loader2,
  DollarSign,
  Package,
  ShoppingCart,
  RefreshCcw,
  AlertTriangle,
  PieChart as PieIcon,
  Percent
} from 'lucide-react';

export default function SellAnalyzePage() {
  const { t, language } = useApp();
  const [isMounted, setIsMounted] = useState(false);
  const [sizes, setSizes] = useState<Size[]>([]);

  const formatSize = (sizeName: string) => {
    const sizeObj = sizes.find(s => s.name_en === sizeName);
    if (sizeObj) {
      return t(sizeObj.name_en, sizeObj.name_bn);
    }
    if (sizeName === 'Gallon') return t('Gallon', 'গ্যালন');
    if (sizeName === '2 Pound (.91L)') return t('2 Pound (.91L)', '২ পাউন্ড (.৯১ লি.)');
    if (sizeName === 'Half Liter (4.55)') return t('Half Liter (4.55)', 'হাফ লিটার (৪.৫৫)');
    if (sizeName === 'Half Pound (200ML)') return t('Half Pound (200ML)', 'হাফ পাউন্ড (২০০ মিলি)');
    return sizeName;
  };

  // Date Filters State (Default: Last 30 days)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Data States
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [salesSummary, setSalesSummary] = useState({
    salesCount: 0,
    salesValue: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    setIsMounted(true);
    const loadSizes = async () => {
      try {
        const data = await fetchSizes();
        setSizes(data);
      } catch (err) {
        console.error('Failed to load sizes', err);
      }
    };
    loadSizes();
  }, []);

  const loadAnalysisData = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {
        startDate: startDate ? `${startDate}T00:00:00.000Z` : undefined,
        endDate: endDate ? `${endDate}T23:59:59.999Z` : undefined
      };

      const report = await fetchReports(filters);
      setTransactions(report.transactions);
      setSalesSummary({
        salesCount: report.summary.salesCount,
        salesValue: report.summary.salesValue
      });
    } catch (err: any) {
      console.error(err);
      setError(t('Failed to load sales analytics data.', 'বিক্রয় বিশ্লেষণ তথ্য লোড করতে ব্যর্থ হয়েছে।'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalysisData();
  }, [startDate, endDate, refreshTrigger]);

  // Calculations
  const salesTransactions = transactions.filter(t => t.action_type === 'STOCK_OUT');
  const totalItemsSold = salesTransactions.reduce((sum, t) => sum + t.quantity, 0);
  const averageSaleValue = salesSummary.salesCount > 0 
    ? (salesSummary.salesValue / salesSummary.salesCount).toFixed(2)
    : '0.00';

  // Chart 1: Sales Trend (Revenue over time)
  const getSalesTrendData = () => {
    const dailyMap: { [date: string]: number } = {};
    
    // Sort transactions oldest to newest for chronological flow
    const sorted = [...salesTransactions].reverse();
    
    sorted.forEach(tx => {
      if (tx.item) {
        const dateStr = new Date(tx.created_at).toLocaleDateString(language === 'en' ? 'en-US' : 'bn-BD', { month: 'short', day: 'numeric' });
        dailyMap[dateStr] = (dailyMap[dateStr] || 0) + (tx.quantity * tx.item.price);
      }
    });

    return Object.keys(dailyMap).map(date => ({
      date,
      Revenue: parseFloat(dailyMap[date].toFixed(2))
    }));
  };

  // Chart 2: Size-wise sales breakdown (Volume by packaging size)
  const getSizeDistributionData = () => {
    const sizeMap: { [size: string]: number } = {
      'Gallon': 0,
      '2 Pound (.91L)': 0,
      'Half Liter (4.55)': 0,
      'Half Pound (200ML)': 0
    };

    salesTransactions.forEach(tx => {
      if (tx.item) {
        sizeMap[tx.item.size] = (sizeMap[tx.item.size] || 0) + tx.quantity;
      }
    });

    // Slate-Emerald Palette colors
    const colors = ['#10b981', '#059669', '#34d399', '#047857', '#64748b'];
    return Object.keys(sizeMap).map((size, idx) => ({
      name: formatSize(size),
      value: sizeMap[size],
      color: colors[idx % colors.length]
    })).filter(item => item.value > 0);
  };

  // Chart 3: Top Selling Paint Colors (By Revenue)
  const getTopColorsData = () => {
    const colorMap: { [color: string]: number } = {};
    
    salesTransactions.forEach(tx => {
      if (tx.item) {
        const label = language === 'en' ? tx.item.color_name_en : tx.item.color_name_bn;
        colorMap[label] = (colorMap[label] || 0) + (tx.quantity * tx.item.price);
      }
    });

    const sortedData = Object.keys(colorMap).map(color => ({
      name: color,
      Value: parseFloat(colorMap[color].toFixed(2))
    })).sort((a, b) => b.Value - a.Value);

    return sortedData.slice(0, 5); // top 5
  };

  const trendData = getSalesTrendData();
  const sizeData = getSizeDistributionData();
  const colorsData = getTopColorsData();

  return (
    <LayoutWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-7 h-7 text-emerald-600 shrink-0" />
              <span>{t('Sell Analyze', 'বিক্রয় বিশ্লেষণ')}</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {t('Gain insights into sales trends, product size performance, and identify your top-selling paint colors.', 'বিক্রয় গতিধারা, প্যাকেট সাইজ অনুযায়ী বণ্টন এবং শীর্ষ বিক্রীত পেইন্ট রঙের ডেটা বিশ্লেষণ করুন।')}
            </p>
          </div>

          {/* Date Range Picker */}
          <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 p-2.5 rounded-xl shadow-sm self-start">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>{t('Date Range', 'তারিখ সীমা')}:</span>
            </div>
            
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500 text-slate-700 font-mono"
            />
            
            <span className="text-slate-400 text-xs">to</span>
            
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500 text-slate-700 font-mono"
            />

            <button
              onClick={() => setRefreshTrigger(p => p + 1)}
              className="p-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 hover:bg-slate-100 rounded-lg text-slate-600 transition-all cursor-pointer"
              title={t('Refresh analytics', 'রিফ্রেশ করুন')}
            >
              <RefreshCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Analytics Widgets (4 cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Sales Value */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('Total Revenue', 'মোট বিক্রয় রাজস্ব')}</span>
              <DollarSign className="w-5 h-5 text-emerald-600 bg-emerald-50 p-1 rounded-lg border border-emerald-100" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mt-2 font-mono">
              ৳{loading ? '...' : salesSummary.salesValue.toLocaleString()}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">{t('Revenue for the selected period', 'নির্দিষ্ট মেয়াদে অর্জিত বিক্রয় মূল্য')}</p>
          </div>

          {/* Card 2: Total Items Sold */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('Total Items Sold', 'মোট বিক্রীত ক্যান')}</span>
              <Package className="w-5 h-5 text-teal-600 bg-teal-50 p-1 rounded-lg border border-teal-100" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mt-2 font-mono">
              {loading ? '...' : totalItemsSold.toLocaleString()} {t('units', 'টি')}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">{t('Volume of paint cans sold', 'মোট বিক্রীত পেইন্ট ক্যানের সংখ্যা')}</p>
          </div>

          {/* Card 3: Average Sale Value */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('Average Sale Value', 'গড় বিক্রয় বিল')}</span>
              <Percent className="w-5 h-5 text-cyan-600 bg-cyan-50 p-1 rounded-lg border border-cyan-100" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mt-2 font-mono">
              ৳{loading ? '...' : parseFloat(averageSaleValue).toLocaleString()}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">{t('Average value per sale invoice', 'প্রতিটি বিক্রয় চালানের গড় মূল্য')}</p>
          </div>

          {/* Card 4: Total Sales Transactions */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('Sales Transactions', 'মোট বিক্রয় লেনদেন')}</span>
              <ShoppingCart className="w-5 h-5 text-blue-600 bg-blue-50 p-1 rounded-lg border border-blue-100" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mt-2 font-mono">
              {loading ? '...' : salesSummary.salesCount}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">{t('Total sales records logged', 'মোট সম্পন্নকৃত ক্যাশ ইনভয়েস')}</p>
          </div>
        </div>

        {/* Charts Section */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3 bg-white border border-slate-200 rounded-2xl">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
            <p className="text-slate-400 text-sm">{t('Compiling charts and reports...', 'বিশ্লেষণাত্মক রিপোর্ট তৈরি হচ্ছে...')}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Sales Trend Chart (Full Width Area Chart) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>{t('Sales Revenue Trend Over Time', 'বিক্রয় রাজস্বের দৈনিক গতিধারা')}</span>
              </h3>
              <div className="h-72 w-full">
                {isMounted && trendData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    {t('No sales transactions recorded in this period.', 'এই সময়সীমায় কোন বিক্রয়ের তথ্য নেই।')}
                  </div>
                ) : (
                  isMounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorSalesTrend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                        <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#f8fafc' }}
                          formatter={(value) => [`৳${value}`, t('Revenue', 'রাজস্ব')]}
                        />
                        <Area type="monotone" dataKey="Revenue" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSalesTrend)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Size-wise distribution (Pie Chart) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <PieIcon className="w-4 h-4 text-emerald-600" />
                    <span>{t('Sales Volume by Packaging Size', 'প্যাকেজিং সাইজ অনুযায়ী বিক্রির পরিমাণ')}</span>
                  </h3>
                </div>
                <div className="h-64 w-full flex items-center justify-center">
                  {isMounted && sizeData.length === 0 ? (
                    <div className="text-slate-400 text-xs">
                      {t('No sales transactions recorded in this period.', 'এই সময়সীমায় কোন বিক্রয়ের তথ্য নেই।')}
                    </div>
                  ) : (
                    isMounted && (
                      <div className="flex flex-col sm:flex-row items-center gap-6 w-full justify-around">
                        <div className="w-44 h-44 shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#f8fafc' }}
                                formatter={(value) => [`${value} ${t('units', 'টি')}`, t('Sales Volume', 'বিক্রির পরিমাণ')]}
                              />
                              <Pie
                                data={sizeData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={75}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {sizeData.map((entry, idx) => (
                                  <Cell key={`cell-${idx}`} fill={entry.color} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        
                        {/* Custom Legend */}
                        <div className="space-y-2">
                          {sizeData.map((entry) => (
                            <div key={entry.name} className="flex items-center gap-2.5">
                              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                              <span className="text-xs font-semibold text-slate-700">{entry.name}</span>
                              <span className="text-xs font-mono text-slate-400">({entry.value} {t('units', 'টি')})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Top Selling colors (Bar Chart) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  <span>{t('Top Selling Paint Colors', 'শীর্ষ বিক্রীত পেইন্ট রঙসমূহ')}</span>
                </h3>
                <div className="h-64 w-full">
                  {isMounted && colorsData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                      {t('No sales transactions recorded in this period.', 'এই সময়সীমায় কোন বিক্রয়ের তথ্য নেই।')}
                    </div>
                  ) : (
                    isMounted && (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={colorsData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                          <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#f8fafc' }}
                            formatter={(value) => [`৳${value}`, t('Revenue', 'বিক্রয় মূল্য')]}
                          />
                          <Bar dataKey="Value" fill="#10b981" radius={[4, 4, 0, 0]}>
                            {colorsData.map((entry, idx) => (
                              <Cell key={`cell-${idx}`} fill={['#10b981', '#059669', '#34d399', '#047857', '#64748b'][idx % 5]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </LayoutWrapper>
  );
}
