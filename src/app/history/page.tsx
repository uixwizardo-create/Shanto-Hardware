'use client';

import React, { useState, useEffect } from 'react';
import LayoutWrapper from '@/components/layout-wrapper';
import { useApp } from '@/context/AppContext';
import { fetchTransactionLogs, fetchSizes } from '@/lib/db';
import { StockTransaction, ItemSize, Size } from '@/lib/types';
import { 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Info,
  Loader2,
  RefreshCcw,
  Sliders,
  ChevronDown
} from 'lucide-react';

export default function HistoryPage() {
  const { t } = useApp();
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

  // State Management
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [colorSearch, setColorSearch] = useState('');
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch transaction logs based on filter selections
  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {
        colorName: colorSearch || undefined,
        size: sizeFilter !== 'all' ? (sizeFilter as ItemSize) : undefined,
        actionType: actionFilter !== 'all' ? (actionFilter as any) : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };
      const data = await fetchTransactionLogs(filters);
      setTransactions(data);
    } catch (err: any) {
      console.error(err);
      setError(t('Failed to load transaction history logs.', 'লেনদেন ইতিহাস লগ লোড করতে ব্যর্থ হয়েছে।'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [colorSearch, sizeFilter, actionFilter, startDate, endDate]);

  useEffect(() => {
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

  // Clean filters
  const resetFilters = () => {
    setColorSearch('');
    setSizeFilter('all');
    setActionFilter('all');
    setStartDate('');
    setEndDate('');
  };

  // Export visible transactions to CSV
  const handleExportCSV = () => {
    if (transactions.length === 0) return;

    // Headers
    const headers = [
      t('Date & Time', 'তারিখ ও সময়'),
      t('Action Type', 'লেনদেনের ধরন'),
      t('Color', 'রং'),
      t('Size', 'সাইজ'),
      t('Quantity', 'পরিমাণ'),
      t('Previous Stock', 'পূর্বের স্টক'),
      t('New Stock', 'নতুন স্টক'),
      t('User', 'ব্যবহারকারী'),
      t('Notes', 'নোট/বিবরণ')
    ];

    const csvRows = [headers.join(',')];

    transactions.forEach(tx => {
      const date = new Date(tx.created_at).toLocaleString().replace(/,/g, '');
      const type = tx.action_type;
      const color = tx.item?.full_color_name || '';
      const size = tx.item?.size || '';
      const qty = tx.quantity;
      const prevStock = tx.previous_stock !== null && tx.previous_stock !== undefined ? tx.previous_stock : '';
      const newStock = tx.new_stock !== null && tx.new_stock !== undefined ? tx.new_stock : '';
      const user = tx.profile?.name || tx.profile?.email || '';
      const notes = (tx.notes || '').replace(/,/g, ';').replace(/\n/g, ' ');

      csvRows.push([date, type, color, size, qty, prevStock, newStock, user, notes].join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `shanto_hardware_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <LayoutWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              {t('Transaction History Logs', 'লেনদেন ইতিহাস লগ')}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {t('Search audit trails of all Stock In, Stock Out, and Adjustment entries.', 'ইনভেন্টরিতে স্টক ইন, স্টক আউট এবং সমন্বয় লেনদেনের সম্পূর্ণ রেকর্ড অনুসন্ধান করুন।')}
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start">
            <button
              onClick={handleExportCSV}
              disabled={transactions.length === 0}
              className="flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4.5 h-4.5" />
              <span>{t('Export to CSV', 'CSV এক্সপোর্ট')}</span>
            </button>

            <button
              onClick={loadLogs}
              className="p-2.5 bg-white border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-700 rounded-xl transition-all shadow-sm cursor-pointer"
              title={t('Refresh logs', 'রিফ্রেশ করুন')}
            >
              <RefreshCcw className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Filter controls panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Filter className="w-4.5 h-4.5 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800">{t('Filter Parameters', 'ফিল্টার প্যারামিটার')}</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Color name */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                {t('Color Search', 'রং অনুসন্ধান')}
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={t('e.g. Blue', 'যেমন: নীল')}
                  value={colorSearch}
                  onChange={(e) => setColorSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Size */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                {t('Size Filter', 'সাইজ ফিল্টার')}
              </label>
              <div className="relative">
                <select
                  value={sizeFilter}
                  onChange={(e) => setSizeFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2 text-xs text-slate-600 focus:outline-none focus:border-emerald-500 cursor-pointer appearance-none"
                >
                  <option value="all">{t('All Sizes', 'সকল সাইজ')}</option>
                  {sizes.map((sz) => (
                    <option key={sz.id} value={sz.name_en}>
                      {t(sz.name_en, sz.name_bn)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Action type */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                {t('Action Type', 'লেনদেনের ধরন')}
              </label>
              <div className="relative">
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2 text-xs text-slate-600 focus:outline-none focus:border-emerald-500 cursor-pointer appearance-none"
                >
                  <option value="all">{t('All Transactions', 'সকল লেনদেন')}</option>
                  <option value="STOCK_IN">{t('Stock In', 'স্টক ইন')}</option>
                  <option value="STOCK_OUT">{t('Sale', 'বিক্রয়')}</option>
                  <option value="ADJUSTMENT">{t('Adjustment', 'সমন্বয়')}</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{t('Start Date', 'শুরুর তারিখ')}</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{t('End Date', 'শেষের তারিখ')}</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={resetFilters}
              className="text-xs text-slate-400 hover:text-slate-700 font-semibold cursor-pointer underline underline-offset-4"
            >
              {t('Clear All Filters', 'সকল ফিল্টার মুছুন')}
            </button>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                <p className="text-slate-400 text-sm">{t('Loading transaction history logs...', 'ইতিহাস লগ লোড হচ্ছে...')}</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                <Info className="w-12 h-12 text-slate-350" />
                <p className="font-semibold text-slate-650">{t('No transaction records found', 'কোন লেনদেনের তথ্য পাওয়া যায়নি')}</p>
                <p className="text-xs text-slate-400">{t('Try clearing some filters or adding transactions.', 'অন্য কোন ফিল্টার নির্বাচন করে চেষ্টা করুন।')}</p>
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
                      actionClass = 'bg-emerald-50 border border-emerald-200 text-emerald-700';
                      actionLabel = t('Stock In', 'স্টক ইন');
                      Icon = ArrowUpRight;
                    } else if (tx.action_type === 'STOCK_OUT') {
                      actionClass = 'bg-rose-50 border border-rose-200 text-rose-700';
                      actionLabel = t('Sale', 'বিক্রয়');
                      Icon = ArrowDownLeft;
                    } else if (tx.action_type === 'ADJUSTMENT') {
                      actionClass = 'bg-amber-50 border border-amber-200 text-amber-700';
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
    </LayoutWrapper>
  );
}
