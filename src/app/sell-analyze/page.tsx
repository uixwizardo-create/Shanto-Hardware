'use client';

import React, { useState, useEffect } from 'react';
import LayoutWrapper from '@/components/layout-wrapper';
import { useApp } from '@/context/AppContext';
import { fetchReports, fetchSizes, fetchInventory, fetchCategories } from '@/lib/db';
import { StockTransaction, Size, InventoryItem, Category } from '@/lib/types';
import {
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
  Package,
  RefreshCcw,
  AlertTriangle,
  PieChart as PieIcon,
  Award,
  ChevronDown
} from 'lucide-react';

export default function SellAnalyzePage() {
  const { t, language } = useApp();
  const [isMounted, setIsMounted] = useState(false);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Table Filters State
  const [tableSearch, setTableSearch] = useState('');
  const [tableCategory, setTableCategory] = useState('');
  const [tableSize, setTableSize] = useState('');
  const [tableSpeed, setTableSpeed] = useState('');

  // Table Pagination State
  const [tablePage, setTablePage] = useState(1);
  const tableItemsPerPage = 10;

  // Date Filters State (Default: Last 30 days)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

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

  const getCategoryPillClass = (catNameEn: string = '') => {
    const name = catNameEn.toLowerCase();
    if (name.includes('plastic')) return 'bg-blue-50 text-blue-700 border border-blue-200';
    if (name.includes('enamel')) return 'bg-teal-50 text-teal-700 border border-teal-200';
    if (name.includes('primer')) return 'bg-amber-50 text-amber-700 border border-amber-200';
    if (name.includes('putty')) return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
    if (name.includes('weather') || name.includes('exterior')) return 'bg-violet-50 text-violet-700 border border-violet-200';
    if (name.includes('distemper')) return 'bg-pink-50 text-pink-700 border border-pink-200';
    return 'bg-slate-50 text-slate-700 border border-slate-200';
  };

  const getSpeedTag = (qty: number) => {
    if (qty >= 15) {
      return {
        label: t('Fast mover', 'Fast mover'),
        classes: 'bg-emerald-50 text-emerald-700 border border-emerald-250'
      };
    } else if (qty >= 5) {
      return {
        label: t('Medium', 'Medium'),
        classes: 'bg-blue-50 text-blue-700 border border-blue-250'
      };
    } else {
      return {
        label: t('Slow mover', 'Slow mover'),
        classes: 'bg-slate-50 text-slate-600 border border-slate-250'
      };
    }
  };

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
    const loadCategories = async () => {
      try {
        const data = await fetchCategories();
        setCategories(data);
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    loadSizes();
    loadCategories();
  }, []);

  const loadAnalysisData = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {
        startDate: startDate ? `${startDate}T00:00:00.000Z` : undefined,
        endDate: endDate ? `${endDate}T23:59:59.999Z` : undefined
      };

      const [report, inventory] = await Promise.all([
        fetchReports(filters),
        fetchInventory()
      ]);

      setTransactions(report.transactions);
      setItems(inventory);
      setTablePage(1); // Reset page on data reload
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

  const salesTransactions = transactions.filter(t => t.action_type === 'STOCK_OUT');

  // Chart 1: Top Selling Paint Colors (By Quantity)
  const getTopColorsData = () => {
    const colorMap: { [color: string]: number } = {};
    
    salesTransactions.forEach(tx => {
      const itemObj = items.find(i => i.id === tx.inventory_item_id);
      if (itemObj) {
        const label = language === 'en' ? itemObj.color_name_en : itemObj.color_name_bn;
        colorMap[label] = (colorMap[label] || 0) + tx.quantity;
      } else if (tx.item) {
        const label = language === 'en' ? tx.item.color_name_en : tx.item.color_name_bn;
        colorMap[label] = (colorMap[label] || 0) + tx.quantity;
      }
    });

    const sortedData = Object.keys(colorMap).map(color => ({
      name: color,
      Quantity: colorMap[color]
    })).sort((a, b) => b.Quantity - a.Quantity);

    return sortedData.slice(0, 5); // top 5
  };

  // Chart 2: Category wise sales volume (Quantity sold)
  const getCategorySalesData = () => {
    const categoryMap: { [catName: string]: number } = {};

    salesTransactions.forEach(tx => {
      const itemObj = items.find(i => i.id === tx.inventory_item_id);
      if (itemObj) {
        const catName = language === 'en'
          ? (itemObj.category_name_en || 'Other')
          : (itemObj.category_name_bn || 'অন্যান্য');
        categoryMap[catName] = (categoryMap[catName] || 0) + tx.quantity;
      } else {
        const catName = language === 'en' ? 'Other' : 'অন্যান্য';
        categoryMap[catName] = (categoryMap[catName] || 0) + tx.quantity;
      }
    });

    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];
    return Object.keys(categoryMap).map((catName, idx) => ({
      name: catName,
      value: categoryMap[catName],
      color: colors[idx % colors.length]
    })).sort((a, b) => b.value - a.value);
  };

  // Bottom Table: Product ranking by sales volume
  const getProductRankings = () => {
    const productSales: { [itemId: string]: number } = {};

    salesTransactions.forEach(tx => {
      productSales[tx.inventory_item_id] = (productSales[tx.inventory_item_id] || 0) + tx.quantity;
    });

    const ranked = items.map(item => {
      const sold = productSales[item.id] || 0;
      return {
        ...item,
        soldQuantity: sold
      };
    });

    // 1. Sort by sold quantity desc, then by color name to establish absolute rankings
    ranked.sort((a, b) => {
      if (b.soldQuantity !== a.soldQuantity) {
        return b.soldQuantity - a.soldQuantity;
      }
      return a.color_name.localeCompare(b.color_name);
    });

    // 2. Map items to include their absolute rank (1-indexed)
    const withRank = ranked.map((item, idx) => ({
      ...item,
      absoluteRank: idx + 1
    }));

    // 3. Apply active filters
    let filtered = withRank;

    if (tableSearch) {
      const q = tableSearch.toLowerCase();
      filtered = filtered.filter(item => 
        item.serial_no.toString().includes(q) ||
        item.color_name_en?.toLowerCase().includes(q) ||
        item.color_name_bn?.toLowerCase().includes(q) ||
        item.full_color_name?.toLowerCase().includes(q) ||
        item.category_name_en?.toLowerCase().includes(q) ||
        item.category_name_bn?.toLowerCase().includes(q)
      );
    }

    if (tableCategory) {
      filtered = filtered.filter(item => item.category_id === tableCategory);
    }

    if (tableSize) {
      filtered = filtered.filter(item => item.size === tableSize);
    }

    if (tableSpeed) {
      filtered = filtered.filter(item => {
        const qty = item.soldQuantity;
        if (tableSpeed === 'fast') return qty >= 15;
        if (tableSpeed === 'medium') return qty >= 5 && qty < 15;
        if (tableSpeed === 'slow') return qty < 5;
        return true;
      });
    }

    return filtered;
  };

  const colorsData = getTopColorsData();
  const categoryData = getCategorySalesData();
  const filteredRankings = getProductRankings();

  // Pagination Calculations
  const totalRankedItems = filteredRankings.length;
  const totalPages = Math.ceil(totalRankedItems / tableItemsPerPage);
  const startIndex = (tablePage - 1) * tableItemsPerPage;
  const endIndex = startIndex + tableItemsPerPage;
  const paginatedRankings = filteredRankings.slice(startIndex, endIndex);

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
              {t('Analyze sales volume trends, category breakdown, and item quantity performance.', 'বিক্রয় পরিমাণ, ক্যাটগরি ভিত্তিক বিক্রয় এবং পণ্যের পরিমাণ বিশ্লেষণ করুন।')}
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
            
            <span className="text-slate-400 text-xs">{t('to', 'থেকে')}</span>
            
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

        {/* Charts Section */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3 bg-white border border-slate-200 rounded-2xl">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
            <p className="text-slate-400 text-sm">{t('Compiling charts and reports...', 'বিশ্লেষণাত্মক রিপোর্ট তৈরি হচ্ছে...')}</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Chart 1: Top Selling Colors (by Quantity) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  <span>{t('Top Selling Paint Colors (By Quantity)', 'সর্বোচ্চ বিক্রীত পেইন্ট রঙসমূহ (ক্যানের সংখ্যা)')}</span>
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
                            formatter={(value) => [`${value} ${t('units', 'টি')}`, t('Sales Quantity', 'বিক্রয় পরিমাণ')]}
                          />
                          <Bar dataKey="Quantity" fill="#10b981" radius={[4, 4, 0, 0]}>
                            {colorsData.map((entry, idx) => (
                              <Cell key={`cell-${idx}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][idx % 5]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )
                  )}
                </div>
              </div>

              {/* Chart 2: Category sales distribution */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <PieIcon className="w-4 h-4 text-emerald-600" />
                    <span>{t('Sales Distribution by Paint Category', 'ক্যাটাগরি ভিত্তিক পেইন্ট বিক্রয়ের বণ্টন')}</span>
                  </h3>
                </div>
                <div className="h-64 w-full flex items-center justify-center">
                  {isMounted && categoryData.length === 0 ? (
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
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={75}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {categoryData.map((entry, idx) => (
                                  <Cell key={`cell-${idx}`} fill={entry.color} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        
                        {/* Custom Legend */}
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                          {categoryData.map((entry) => (
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

            </div>

            {/* Product Rankings Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-600" />
                  <span>{t('Complete Product Sales Performance & Rankings', 'সম্পূর্ণ পণ্যের বিক্রয় কর্মক্ষমতা ও র‍্যাংকিং তালিকা')}</span>
                </h3>

                {/* Filter Toolbar */}
                <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
                  {/* Search Input */}
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => {
                      setTableSearch(e.target.value);
                      setTablePage(1);
                    }}
                    placeholder={t('Search color / serial...', 'রঙের নাম বা সিরিয়াল খুঁজুন...')}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500 text-slate-700 w-44 shadow-sm"
                  />

                  {/* Category Dropdown */}
                  <div className="relative">
                    <select
                      value={tableCategory}
                      onChange={(e) => {
                        setTableCategory(e.target.value);
                        setTablePage(1);
                      }}
                      className="bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-xs focus:outline-none focus:border-emerald-500 text-slate-700 appearance-none shadow-sm cursor-pointer"
                    >
                      <option value="">{t('All Categories', 'সকল ক্যাটাগরি')}</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {language === 'en' ? cat.name_en : cat.name_bn}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Size Dropdown */}
                  <div className="relative">
                    <select
                      value={tableSize}
                      onChange={(e) => {
                        setTableSize(e.target.value);
                        setTablePage(1);
                      }}
                      className="bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-xs focus:outline-none focus:border-emerald-500 text-slate-700 appearance-none shadow-sm cursor-pointer"
                    >
                      <option value="">{t('All Sizes', 'সকল সাইজ')}</option>
                      {sizes.map(sz => (
                        <option key={sz.name_en} value={sz.name_en}>
                          {t(sz.name_en, sz.name_bn)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Speed Dropdown */}
                  <div className="relative">
                    <select
                      value={tableSpeed}
                      onChange={(e) => {
                        setTableSpeed(e.target.value);
                        setTablePage(1);
                      }}
                      className="bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-xs focus:outline-none focus:border-emerald-500 text-slate-700 appearance-none shadow-sm cursor-pointer"
                    >
                      <option value="">{t('All Speeds', 'সকল গতি')}</option>
                      <option value="fast">{t('Fast mover', 'Fast mover')}</option>
                      <option value="medium">{t('Medium', 'Medium')}</option>
                      <option value="slow">{t('Slow mover', 'Slow mover')}</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-550">
                      <th className="p-4 pl-6 text-center w-16">#</th>
                      <th className="p-4">{t('Product', 'প্রোডাক্ট')}</th>
                      <th className="p-4">{t('Category', 'ক্যাটাগরি')}</th>
                      <th className="p-4 text-center">{t('Sales', 'বিক্রি')}</th>
                      <th className="p-4 text-center">{t('Current Stock', 'বর্তমান Stock')}</th>
                      <th className="p-4 pr-6 text-center w-36">{t('Speed', 'গতি (Speed)')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {paginatedRankings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-450 text-xs">
                          {t('No matching products found.', 'কোন মিল থাকা পণ্য পাওয়া যায়নি।')}
                        </td>
                      </tr>
                    ) : (
                      paginatedRankings.map((item) => {
                        const rankNumber = item.absoluteRank;
                        const catLabel = language === 'en' ? (item.category_name_en || 'Paint') : (item.category_name_bn || 'পেইন্ট');
                        const colorLabel = language === 'en' ? item.color_name_en : (item.color_name_bn || item.color_name_en);
                        
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                            {/* Rank Badge */}
                            <td className="p-4 pl-6 text-center">
                              {rankNumber === 1 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200" title="1st Place">
                                  1
                                </span>
                              ) : rankNumber === 2 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300" title="2nd Place">
                                  2
                                </span>
                              ) : rankNumber === 3 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-850 text-xs font-bold border border-orange-200" title="3rd Place">
                                  3
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold">
                                  {rankNumber}
                                </span>
                              )}
                            </td>

                            {/* Product Name (Bold Title & Subtitle) */}
                            <td className="p-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800 text-sm">
                                  {catLabel} - {colorLabel}
                                </span>
                                <span className="text-xs text-slate-400 font-medium">
                                  {colorLabel} · {formatSize(item.size)}
                                </span>
                              </div>
                            </td>

                            {/* Category Pill */}
                            <td className="p-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${getCategoryPillClass(item.category_name_en)}`}>
                                {language === 'en' ? item.category_name_en : item.category_name_bn}
                              </span>
                            </td>

                            {/* Units Sold */}
                            <td className="p-4 text-center font-bold text-slate-850 font-mono text-sm">
                              {item.soldQuantity}
                            </td>

                            {/* Current Stock */}
                            <td className="p-4 text-center font-bold text-slate-850 font-mono text-sm">
                              {item.current_stock}
                            </td>

                            {/* Speed Velocity Badge */}
                            <td className="p-4 pr-6 text-center">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${getSpeedTag(item.soldQuantity).classes}`}>
                                {getSpeedTag(item.soldQuantity).label}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalRankedItems > 0 && (
                <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/50">
                  <div className="text-slate-500 text-sm text-center sm:text-left">
                    {language === 'en' ? (
                      <>
                        Showing <span className="font-semibold text-slate-800">{startIndex + 1}</span> to{' '}
                        <span className="font-semibold text-slate-800">{Math.min(endIndex, totalRankedItems)}</span> of{' '}
                        <span className="font-semibold text-slate-800">{totalRankedItems}</span> items
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-slate-800">{totalRankedItems}</span> টি প্রোডাক্টের মধ্যে{' '}
                        <span className="font-semibold text-slate-800">{startIndex + 1}</span> থেকে{' '}
                        <span className="font-semibold text-slate-800">{Math.min(endIndex, totalRankedItems)}</span> দেখানো হচ্ছে
                      </>
                    )}
                  </div>
                  
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTablePage(prev => Math.max(prev - 1, 1))}
                        disabled={tablePage === 1}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer hover:shadow-md active:scale-95"
                      >
                        {t('Previous', 'পূর্ববর্তী')}
                      </button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
                          const isActive = pg === tablePage;
                          return (
                            <button
                              key={pg}
                              onClick={() => setTablePage(pg)}
                              className={`w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer hover:shadow-sm active:scale-95 ${
                                isActive
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'border border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                              }`}
                            >
                              {pg}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button
                        onClick={() => setTablePage(prev => Math.min(prev + 1, totalPages))}
                        disabled={tablePage === totalPages}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer hover:shadow-md active:scale-95"
                      >
                        {t('Next', 'পরবর্তী')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </LayoutWrapper>
  );
}
