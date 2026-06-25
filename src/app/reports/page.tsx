'use client';

import React, { useState, useEffect } from 'react';
import LayoutWrapper from '@/components/layout-wrapper';
import { useApp } from '@/context/AppContext';
import { fetchReports, fetchInventory, recordAdjustment } from '@/lib/db';
import { StockTransaction, ItemSize, InventoryItem } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Calendar,
  AlertTriangle,
  Loader2,
  DollarSign,
  Package,
  ShoppingCart,
  RefreshCcw,
  Sliders,
  CheckCircle,
  AlertCircle,
  Info,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown
} from 'lucide-react';

const adjustSchema = z.object({
  itemId: z.string().min(1, 'Please select an item / একটি পেইন্ট পণ্য নির্বাচন করুন'),
  quantity: z.number().refine(val => val !== 0, 'Quantity cannot be zero / পরিমাণ শূন্য হতে পারবে না'),
  notes: z.string().min(1, 'Please state adjustment reason / সমন্বয়ের কারণ উল্লেখ করুন').max(200, 'Notes cannot exceed 200 characters / অতিরিক্ত নোট ২০০ অক্ষরের বেশি হতে পারবে না'),
});

type AdjustFormValues = z.infer<typeof adjustSchema>;

export default function ReportsPage() {
  const { t, language, user } = useApp();
  const formatSize = (size: string) => {
    if (size === 'Gallon') return t('Gallon', 'গ্যালন');
    if (size === '2 Pound (.91L)') return t('2 Pound (.91L)', '২ পাউন্ড (.৯১ লি.)');
    if (size === 'Half Liter (4.55)') return t('Half Liter (4.55)', 'হাফ লিটার (৪.৫৫)');
    if (size === 'Half Pound (200ML)') return t('Half Pound (200ML)', 'হাফ পাউন্ড (২০০ মিলি)');
    return size;
  };
  const isAdmin = user?.role === 'admin';

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
  const [summary, setSummary] = useState({
    salesCount: 0,
    salesValue: 0,
    stockInCount: 0,
    lowStockCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Adjustment form states
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustSuccess, setAdjustSuccess] = useState<string | null>(null);
  const [adjustError, setAdjustError] = useState<string | null>(null);

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
      setSummary(report.summary);
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

  // Load inventory items for adjustment dropdown
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

  // Adjustment Form Setup
  const {
    register: registerAdjust,
    handleSubmit: handleSubmitAdjust,
    reset: resetAdjust,
    formState: { errors: errorsAdjust }
  } = useForm<AdjustFormValues>({
    resolver: zodResolver(adjustSchema),
    defaultValues: {
      itemId: '',
      quantity: 0,
      notes: ''
    }
  });

  const onAdjustSubmit = async (data: AdjustFormValues) => {
    if (!user) return;
    setAdjustSubmitting(true);
    setAdjustError(null);
    setAdjustSuccess(null);
    try {
      await recordAdjustment(data.itemId, data.quantity, user.id, data.notes);
      setAdjustSuccess(t('Stock adjusted successfully.', 'পেইন্ট স্টক সফলভাবে সমন্বয় করা হয়েছে।'));
      resetAdjust({ itemId: '', quantity: 0, notes: '' });
      setRefreshTrigger(p => p + 1); // Reload report metrics and table list
      setTimeout(() => setAdjustSuccess(null), 5000);
    } catch (err: any) {
      console.error(err);
      setAdjustError(err.message || 'Failed to record adjustment.');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  // Calculate average sale/ticket value
  const avgOrderValue = summary.salesCount > 0 
    ? (summary.salesValue / summary.salesCount).toFixed(2)
    : '0.00';

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
              {t('Perform stock adjustments, review aggregate summary metrics, and examine detailed audit trails.', 'পেইন্ট স্টক সমন্বয় করুন, পরিমাপক হিসাব দেখুন এবং বিস্তারিত লেনদেন অডিট লগ অনুসন্ধান করুন।')}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Revenue Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('Counter Revenue', 'মোট বিক্রয় রাজস্ব')}</span>
              <DollarSign className="w-5 h-5 text-emerald-600 bg-emerald-50 p-1 rounded-lg border border-emerald-100" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mt-2 font-mono">
              ৳{loading ? '...' : summary.salesValue.toLocaleString()}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">{t('For selected reporting period', 'নির্দিষ্ট সময়কালের বিক্রয় মূল্য')}</p>
          </div>

          {/* Sales Count Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('Sales Count', 'মোট বিক্রয় রসিদ')}</span>
              <ShoppingCart className="w-5 h-5 text-blue-600 bg-blue-50 p-1 rounded-lg border border-blue-100" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mt-2 font-mono">
              {loading ? '...' : summary.salesCount}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">{t('Total sales transaction count', 'মোট বিক্রয় ভাউচারের সংখ্যা')}</p>
          </div>

          {/* Avg Sales Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('Avg Sales / Ticket', 'গড় বিক্রয় মূল্য')}</span>
              <RefreshCcw className="w-5 h-5 text-cyan-600 bg-cyan-50 p-1 rounded-lg border border-cyan-100" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mt-2 font-mono">
              ৳{loading ? '...' : parseFloat(avgOrderValue).toLocaleString()}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">{t('Revenue divided by invoices count', 'প্রতি বিলে গড় বিক্রয় রাজস্ব')}</p>
          </div>

          {/* Stock In Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('Stock In (Units)', 'স্টক ইন (ইউনিট)')}</span>
              <Package className="w-5 h-5 text-teal-600 bg-teal-50 p-1 rounded-lg border border-teal-100" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mt-2 font-mono">
              {loading ? '...' : summary.stockInCount}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">{t('Total quantity added to inventory', 'মোট আমদানিকৃত স্টক পরিমাণ')}</p>
          </div>
        </div>

        {/* Stock Adjustment Form (Admin only) */}
        {isAdmin && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="font-bold text-slate-800">{t('Log Stock Adjustment', 'স্টক সমন্বয় নিবন্ধন')}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{t('Correct stock level discrepancies or log physical paint container adjustments.', 'স্টক সংখ্যার অসঙ্গতি ঠিক করুন অথবা শারীরিক রঙ ভাঙা/নষ্ট বন্টন সমন্বয় করুন।')}</p>
              </div>
            </div>

            <div className="p-6">
              {adjustSuccess && (
                <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex items-center gap-2.5">
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>{adjustSuccess}</span>
                </div>
              )}

              {adjustError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  <span>{adjustError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitAdjust(onAdjustSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
                {/* Item Select */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    {t('Select Paint Item', 'পেইন্ট পণ্য')}
                  </label>
                  {loadingItems ? (
                    <div className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl flex items-center px-3">
                      <Loader2 className="w-4 h-4 text-slate-400 animate-spin mr-2" />
                      <span className="text-slate-400 text-xs">{t('Loading...', 'লোড হচ্ছে...')}</span>
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        {...registerAdjust('itemId')}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer appearance-none"
                      >
                        <option value="">-- {t('Choose Paint Item', 'পণ্য নির্বাচন')} --</option>
                        {items.map((item) => (
                          <option key={item.id} value={item.id}>
                            #{item.serial_no} {item.full_color_name} ({formatSize(item.size)}) - {t('Stock', 'স্টক')}: {item.current_stock}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  )}
                  {errorsAdjust.itemId && (
                    <span className="text-red-500 text-[10px] mt-1 block">{errorsAdjust.itemId.message}</span>
                  )}
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
                    <span>{t('Adjustment Count', 'সমন্বয়ের সংখ্যা')}</span>
                    <span className="text-[10px] text-slate-450 font-medium normal-case">
                      {t('(+ to add, - to subtract)', '(যোগ করতে +, কমাতে -)')}
                    </span>
                  </label>
                  <input
                    type="number"
                    {...registerAdjust('quantity', { valueAsNumber: true })}
                    placeholder={t('e.g. -2 or 5', 'যেমন: -২ অথবা ৫')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                  {errorsAdjust.quantity && (
                    <span className="text-red-500 text-[10px] mt-1 block">{errorsAdjust.quantity.message}</span>
                  )}
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    {t('Adjustment Reason', 'সমন্বয়ের কারণ')}
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      {...registerAdjust('notes')}
                      placeholder={t('e.g. Broken seal, Seeding error correction', 'যেমন: ক্যান নষ্ট ছিল, ভুল প্রারম্ভিক মজুদ ইত্যাদি')}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={adjustSubmitting}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow flex items-center justify-center gap-1 shrink-0 cursor-pointer disabled:opacity-55"
                    >
                      {adjustSubmitting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sliders className="w-3.5 h-3.5" />
                      )}
                      <span>{t('Apply', 'প্রয়োগ')}</span>
                    </button>
                  </div>
                  {errorsAdjust.notes && (
                    <span className="text-red-500 text-[10px] mt-1 block">{errorsAdjust.notes.message}</span>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

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
