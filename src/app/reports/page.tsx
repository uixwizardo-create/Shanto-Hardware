'use client';

import React, { useState, useEffect } from 'react';
import LayoutWrapper from '@/components/layout-wrapper';
import { useApp } from '@/context/AppContext';
import { fetchReports, fetchInventory } from '@/lib/db';
import { StockTransaction, InventoryItem } from '@/lib/types';
import {
  Calendar,
  AlertTriangle,
  Loader2,
  Package,
  ShoppingCart,
  RefreshCcw,
  Sliders,
  Info,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';

export default function ReportsPage() {
  const { t, language } = useApp();
  const formatSize = (size: string) => {
    if (size === 'Gallon') return t('Gallon', 'গ্যালন');
    if (size === '2 Pound (.91L)') return t('2 Pound (.91L)', '২ পাউন্ড (.৯১ লি.)');
    if (size === 'Half Liter (4.55)') return t('Half Liter (4.55)', 'হাফ লিটার (৪.৫৫)');
    if (size === 'Half Pound (200ML)') return t('Half Pound (200ML)', 'হাফ পাউন্ড (২০০ মিলি)');
    return size;
  };

  // Filters State (Default: Last 30 days)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Data State
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Inventory items state for calculations
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  const loadReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {
        startDate: startDate ? `${startDate}T00:00:00.000Z` : undefined,
        endDate: endDate ? `${endDate}T23:59:59.999Z` : undefined
      };
      
      const report = await fetchReports(filters);
      setTransactions(report.transactions);
    } catch (err: any) {
      console.error(err);
      setError(t('Failed to load reports and logs.', 'রিপোর্ট এবং লগ লোড করতে ব্যর্থ হয়েছে।'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [startDate, endDate, refreshTrigger]);

  // Load inventory items
  useEffect(() => {
    async function loadItems() {
      try {
        const data = await fetchInventory();
        data.sort((a, b) => a.color_name_en.localeCompare(b.color_name_en));
        setItems(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingItems(false);
      }
    }
    loadItems();
  }, [refreshTrigger]);

  // Calculate Reports and Category data
  // 1. Total unique products (items count)
  const totalProductsCount = items.length;

  // 2. Category aggregates
  const categoriesMap: {
    [id: string]: {
      id: string;
      name_en: string;
      name_bn: string;
      productsCount: number;
      totalStock: number;
      currentStock: number;
      salesCount: number;
    };
  } = {};

  // Initialize from items
  items.forEach((item) => {
    const catId = item.category_id || 'default';
    const catNameEn = item.category_name_en || 'Other';
    const catNameBn = item.category_name_bn || 'অন্যান্য';

    if (!categoriesMap[catId]) {
      categoriesMap[catId] = {
        id: catId,
        name_en: catNameEn,
        name_bn: catNameBn,
        productsCount: 0,
        totalStock: 0,
        currentStock: 0,
        salesCount: 0,
      };
    }

    categoriesMap[catId].productsCount += 1;
    categoriesMap[catId].totalStock += (item.initial_stock || 0) + (item.total_stock_in || 0);
    categoriesMap[catId].currentStock += item.current_stock || 0;
  });

  // Calculate top category, top color, and add sales to categories
  const categorySales: { [id: string]: { name_en: string; name_bn: string; quantity: number } } = {};
  const colorSales: { [name_en: string]: { name_bn: string; quantity: number } } = {};

  transactions.forEach((tx) => {
    if (tx.action_type === 'STOCK_OUT') {
      const item = items.find((i) => i.id === tx.inventory_item_id);
      if (item) {
        // Category sales
        const catId = item.category_id || 'default';
        const catNameEn = item.category_name_en || 'Other';
        const catNameBn = item.category_name_bn || 'অন্যান্য';
        if (!categorySales[catId]) {
          categorySales[catId] = { name_en: catNameEn, name_bn: catNameBn, quantity: 0 };
        }
        categorySales[catId].quantity += tx.quantity;

        // Populate sales count in table map
        if (categoriesMap[catId]) {
          categoriesMap[catId].salesCount += tx.quantity;
        } else {
          categoriesMap[catId] = {
            id: catId,
            name_en: catNameEn,
            name_bn: catNameBn,
            productsCount: 0,
            totalStock: 0,
            currentStock: 0,
            salesCount: tx.quantity,
          };
        }

        // Color sales
        const colorEn = item.color_name_en || 'Unknown';
        const colorBn = item.color_name_bn || 'অজানা';
        if (!colorSales[colorEn]) {
          colorSales[colorEn] = { name_bn: colorBn, quantity: 0 };
        }
        colorSales[colorEn].quantity += tx.quantity;
      }
    }
  });

  // Find Top Category
  let topCategory = { name_en: '-', name_bn: '-', quantity: 0 };
  Object.values(categorySales).forEach((cat) => {
    if (cat.quantity > topCategory.quantity) {
      topCategory = cat;
    }
  });

  // Find Top Color
  let topColor = { name_en: '-', name_bn: '-', quantity: 0 };
  Object.entries(colorSales).forEach(([colorEn, data]) => {
    if (data.quantity > topColor.quantity) {
      topColor = { name_en: colorEn, name_bn: data.name_bn, quantity: data.quantity };
    }
  });

  const categoryTableData = Object.values(categoriesMap);
  categoryTableData.sort((a, b) => b.salesCount - a.salesCount || a.name_en.localeCompare(b.name_en));

  return (
    <LayoutWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              {t('Reports & Log Manager', 'রিপোর্ট এবং লগ ম্যানেজার')}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {t('Review aggregate summary metrics and examine detailed transaction audit logs.', 'পরিমাপক হিসাব দেখুন এবং বিস্তারিত লেনদেন অডিট লগ অনুসন্ধান করুন।')}
            </p>
          </div>

          {/* Date Picker Controls */}
          <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 p-2.5 rounded-xl shadow-sm self-start">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>{t('Period', 'সময়কাল')}:</span>
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
              className="p-1.5 bg-slate-50 border border-slate-200 hover:border-slate-350 hover:bg-slate-100 rounded-lg text-slate-600 transition-all cursor-pointer"
              title={t('Refresh data', 'রিফ্রেশ করুন')}
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

        {/* Aggregate Performance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Products Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t('Total Products', 'মোট প্রোডাক্ট')}
              </span>
              <h3 className="text-2xl font-bold text-slate-900 mt-2 font-mono">
                {loadingItems ? '...' : totalProductsCount}
              </h3>
              <p className="text-[10px] text-slate-400 mt-1 font-medium truncate">
                {t('All unique product variations in stock', 'ইনভেন্টরিতে মোট পণ্যের সংখ্যা')}
              </p>
            </div>
            <Package className="w-9 h-9 text-emerald-600 bg-emerald-50 p-2 rounded-xl border border-emerald-100 shrink-0 ml-3" />
          </div>

          {/* Top Category Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t('Top Category', 'সেরা ক্যাটাগরি')}
              </span>
              <h3 className="text-lg md:text-xl font-bold text-slate-900 mt-2 truncate">
                {loading ? '...' : (topCategory.quantity > 0 ? (language === 'en' ? topCategory.name_en : topCategory.name_bn) : '-')}
              </h3>
              <p className="text-[10px] text-slate-400 mt-1 font-medium truncate">
                {loading ? '...' : (topCategory.quantity > 0 ? t(`${topCategory.quantity} units sold`, `${topCategory.quantity} টি বিক্রি হয়েছে`) : t('No sales recorded', 'কোন বিক্রি নেই'))}
              </p>
            </div>
            <ShoppingCart className="w-9 h-9 text-blue-600 bg-blue-50 p-2 rounded-xl border border-blue-100 shrink-0 ml-3" />
          </div>

          {/* Top Color Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t('Top Color', 'সেরা কালার')}
              </span>
              <h3 className="text-lg md:text-xl font-bold text-slate-900 mt-2 truncate">
                {loading ? '...' : (topColor.quantity > 0 ? (language === 'en' ? topColor.name_en : topColor.name_bn) : '-')}
              </h3>
              <p className="text-[10px] text-slate-400 mt-1 font-medium truncate">
                {loading ? '...' : (topColor.quantity > 0 ? t(`${topColor.quantity} units sold`, `${topColor.quantity} টি বিক্রি হয়েছে`) : t('No sales recorded', 'কোন বিক্রি নেই'))}
              </p>
            </div>
            <Sliders className="w-9 h-9 text-cyan-600 bg-cyan-50 p-2 rounded-xl border border-cyan-100 shrink-0 ml-3" />
          </div>
        </div>

        {/* Category Summary Table */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            <span>{t('Category Summary Table', 'ক্যাটাগরি ভিত্তিক সারাংশ')}</span>
          </h2>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {loadingItems ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                  <p className="text-slate-400 text-xs">{t('Loading category data...', 'ক্যাটাগরি ডাটা লোড হচ্ছে...')}</p>
                </div>
              ) : categoryTableData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-405">
                  <p className="font-semibold">{t('No categories found', 'কোন ক্যাটাগরি পাওয়া যায়নি')}</p>
                </div>
              ) : (
                <table className="w-full border-collapse text-left text-xs md:text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                      <th className="p-4 pl-6">{t('Category', 'ক্যাটাগরি')}</th>
                      <th className="p-4 text-right">{t('Products', 'প্রোডাক্টস')}</th>
                      <th className="p-4 text-right">{t('Stock', 'স্টক')}</th>
                      <th className="p-4 text-right">{t('Sales', 'বিক্রি')}</th>
                      <th className="p-4 text-right pr-6">{t('Current Stock', 'বর্তমান স্টক')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {categoryTableData.map((cat) => (
                      <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors whitespace-nowrap">
                        <td className="p-4 pl-6 font-semibold text-slate-800">
                          {language === 'en' ? cat.name_en : cat.name_bn}
                        </td>
                        <td className="p-4 text-right font-mono font-medium">
                          {cat.productsCount}
                        </td>
                        <td className="p-4 text-right font-mono font-medium">
                          {cat.totalStock}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-emerald-600">
                          {cat.salesCount}
                        </td>
                        <td className="p-4 text-right pr-6 font-mono font-bold text-slate-700">
                          {cat.currentStock}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Tabular Transaction Report Logs */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Info className="w-5 h-5 text-emerald-600" />
            <span>{t('Tabular Transaction Logs', 'লেনদেন লগ টেবিল')}</span>
          </h2>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                  <p className="text-slate-400 text-xs">{t('Loading transaction history logs...', 'লেনদেনের ইতিহাস লগ লোড হচ্ছে...')}</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                  <Info className="w-12 h-12 text-slate-300" />
                  <p className="font-semibold text-slate-700">{t('No transaction records found', 'কোন লেনদেনের তথ্য পাওয়া যায়নি')}</p>
                  <p className="text-xs text-slate-400">{t('Try adjusting the date range filters.', 'তারিখের ফিল্টার পরিবর্তন করে চেষ্টা করুন।')}</p>
                </div>
              ) : (
                <table className="w-full border-collapse text-left text-xs md:text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                      <th className="p-4 pl-6">{t('Date & Time', 'সময়')}</th>
                      <th className="p-4">{t('Action Type', 'ধরন')}</th>
                      <th className="p-4">{t('Color', 'রং')}</th>
                      <th className="p-4">{t('Size', 'সাইজ')}</th>
                      <th className="p-4 text-right">{t('Quantity', 'পরিমাণ')}</th>
                      <th className="p-4 text-right">{t('Previous Stock', 'পূর্বের স্টক')}</th>
                      <th className="p-4 text-right">{t('New Stock', 'নতুন স্টক')}</th>
                      <th className="p-4">{t('User', 'ব্যবহারকারী')}</th>
                      <th className="p-4 pr-6">{t('Notes', 'বিবরণ')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {transactions.map((tx) => {
                      let actionClass = '';
                      let actionLabel = '';
                      let Icon = ArrowUpRight;
                      
                      if (tx.action_type === 'STOCK_IN') {
                        actionClass = 'bg-emerald-55 border border-emerald-200 text-emerald-700';
                        actionLabel = t('Stock In', 'স্টক ইন');
                        Icon = ArrowUpRight;
                      } else if (tx.action_type === 'STOCK_OUT') {
                        actionClass = 'bg-rose-50 border border-rose-200 text-rose-700';
                        actionLabel = t('Sale', 'বিক্রয়');
                        Icon = ArrowDownLeft;
                      } else if (tx.action_type === 'ADJUSTMENT') {
                        actionClass = 'bg-amber-55 border border-amber-200 text-amber-700';
                        actionLabel = t('Adjustment', 'সমন্বয়');
                        Icon = Sliders;
                      }

                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors whitespace-nowrap">
                          {/* Timestamp */}
                          <td className="p-4 pl-6 text-xs text-slate-400 font-medium">
                            {new Date(tx.created_at).toLocaleString()}
                          </td>

                          {/* Action Badge */}
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${actionClass}`}>
                              <Icon className="w-3 h-3 shrink-0" />
                              {actionLabel}
                            </span>
                          </td>

                          {/* Paint Item Details */}
                          <td className="p-4 font-semibold text-slate-800">
                            {tx.item?.full_color_name}
                          </td>

                          {/* Size */}
                          <td className="p-4 text-slate-500">{formatSize(tx.item?.size || '')}</td>

                          {/* Quantity */}
                          <td className={`p-4 text-right font-bold font-mono ${
                            tx.action_type === 'STOCK_OUT' ? 'text-rose-600' : tx.action_type === 'STOCK_IN' ? 'text-emerald-600' : 'text-amber-600'
                          }`}>
                            {tx.action_type === 'STOCK_OUT' ? '-' : '+'}{tx.quantity}
                          </td>

                          {/* Previous Stock */}
                          <td className="p-4 text-right font-mono text-slate-400">
                            {tx.previous_stock !== null && tx.previous_stock !== undefined ? tx.previous_stock : '-'}
                          </td>

                          {/* New Stock */}
                          <td className="p-4 text-right font-mono font-semibold text-slate-700">
                            {tx.new_stock !== null && tx.new_stock !== undefined ? tx.new_stock : '-'}
                          </td>

                          {/* User Operator */}
                          <td className="p-4 text-xs text-slate-600 max-w-[120px] truncate font-mono" title={tx.profile?.name || tx.profile?.email}>
                            {tx.profile?.name || (tx.profile?.email ? tx.profile.email.split('@')[0] : 'N/A')}
                          </td>

                          {/* Notes */}
                          <td className="p-4 pr-6 text-xs text-slate-500 italic max-w-[180px] truncate" title={tx.notes || ''}>
                            {tx.notes || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
