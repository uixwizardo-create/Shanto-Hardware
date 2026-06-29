'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import LayoutWrapper from '@/components/layout-wrapper';
import { useApp } from '@/context/AppContext';
import { fetchInventory, fetchSizes } from '@/lib/db';
import { InventoryItem, ItemSize, Size } from '@/lib/types';
import {
  Search,
  AlertTriangle,
  ArrowUpRight,
  Loader2,
  RefreshCcw,
  Package,
  PackageX,
  AlertOctagon,
  ChevronDown
} from 'lucide-react';

export default function StockAlertPage() {
  const { t, language } = useApp();

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
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [sizeFilter, setSizeFilter] = useState('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load Inventory data and filter low stock
  const loadAlertData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all items
      const data = await fetchInventory();
      
      // Filter items strictly below safety stock level: current_stock < minimum_stock
      let lowStockItems = data.filter(item => item.current_stock < item.minimum_stock);

      // Apply Search Query locally
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        lowStockItems = lowStockItems.filter(item =>
          item.color_name_en.toLowerCase().includes(query) ||
          item.color_name_bn.toLowerCase().includes(query) ||
          item.full_color_name.toLowerCase().includes(query)
        );
      }

      // Apply Size Filter locally
      if (sizeFilter !== 'all') {
        lowStockItems = lowStockItems.filter(item => item.size === sizeFilter);
      }

      // Sort by serial_no or status severity (Out of Stock first, then Reorder)
      lowStockItems.sort((a, b) => {
        if (a.current_stock <= 0 && b.current_stock > 0) return -1;
        if (a.current_stock > 0 && b.current_stock <= 0) return 1;
        return a.serial_no - b.serial_no;
      });

      setItems(lowStockItems);
    } catch (err: any) {
      console.error(err);
      setError(t('Failed to load stock alert data.', 'স্টক সতর্কতা তথ্য লোড করতে ব্যর্থ হয়েছে।'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlertData();
  }, [searchQuery, sizeFilter, refreshTrigger]);

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

  // Compute metrics based on currently fetched alert items
  const outOfStockCount = items.filter(item => item.current_stock <= 0).length;
  const reorderCount = items.filter(item => item.current_stock > 0 && item.current_stock < item.minimum_stock).length;

  return (
    <LayoutWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-7 h-7 text-amber-500 shrink-0" />
              <span>{t('Stock Alert', 'স্টক সতর্কতা')}</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {t('Monitor paint items that are out of stock or have fallen below the set minimum safety stock limit.', 'মজুদ শেষ হওয়া বা নূন্যতম নিরাপদ স্টক সীমার নিচে নেমে যাওয়া রঙের তালিকা দেখুন।')}
            </p>
          </div>

          <button
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-slate-300 rounded-xl text-slate-700 text-xs font-semibold transition-all cursor-pointer self-start md:self-auto"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span>{t('Refresh', 'রিফ্রেশ')}</span>
          </button>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Statistics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Out of Stock Metric Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t('Out of Stock Items', 'মজুদবিহীন পেইন্ট পণ্য')}
              </span>
              <h3 className="text-3xl font-black text-rose-600 font-mono">
                {loading ? '...' : outOfStockCount}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                {t('Items with zero or negative inventory', 'বর্তমানে শূন্য বা তার কম মজুদের পণ্য')}
              </p>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 shrink-0">
              <PackageX className="w-7 h-7 text-rose-600" />
            </div>
          </div>

          {/* Reorder Warning Metric Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t('Reorder Items', 'পুনঃক্রয় যোগ্য পণ্য')}
              </span>
              <h3 className="text-3xl font-black text-amber-600 font-mono">
                {loading ? '...' : reorderCount}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                {t('Items below safety threshold but in stock', 'নিরাপদ সীমার নিচে কিন্তু মজুদ রয়েছে')}
              </p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 shrink-0">
              <Package className="w-7 h-7 text-amber-600" />
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('Search by color name...', 'রঙের নাম দিয়ে খুঁজুন...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto self-start sm:self-auto justify-end">
            <label className="text-xs font-semibold text-slate-500 shrink-0">
              {t('Size', 'সাইজ')}:
            </label>
            <div className="relative">
              <select
                value={sizeFilter}
                onChange={(e) => setSizeFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer appearance-none"
              >
                <option value="all">{t('All Sizes', 'সব সাইজ')}</option>
                {sizes.map((sz) => (
                  <option key={sz.id} value={sz.name_en}>
                    {t(sz.name_en, sz.name_bn)}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Low Stock Items Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              <p className="text-slate-400 text-xs">{t('Checking warehouse alerts...', 'স্টক সতর্কতা খোঁজা হচ্ছে...')}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 border border-emerald-100 mb-3">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">{t('All stock levels are safe', 'সব স্টক নিরাপদ সীমায় আছে')}</h3>
              <p className="text-slate-400 text-xs mt-1 max-w-sm">
                {t('No paint items are currently at or below their minimum safety stock level.', 'বর্তমানে কোন রঙ বা পণ্য নূন্যতম রিঅর্ডার সীমার নিচে নেই।')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                    <th className="py-4.5 px-5 w-16 text-center">{t('SL', 'ক্রমিক')}</th>
                    <th className="py-4.5 px-4">{t('Color Name (EN/BN)', 'রঙের নাম (ইংরেজি/বাংলা)')}</th>
                    <th className="py-4.5 px-4">{t('Packaging Size', 'প্যাকেজিং সাইজ')}</th>
                    <th className="py-4.5 px-4 text-center">{t('Current Stock', 'বর্তমান মজুদ')}</th>
                    <th className="py-4.5 px-4 text-center">{t('Min Stock', 'নূন্যতম মজুদ')}</th>
                    <th className="py-4.5 px-4 text-center">{t('Status', 'অবস্থা')}</th>
                    <th className="py-4.5 px-4">{t('Notes', 'মন্তব্য')}</th>
                    <th className="py-4.5 px-5 text-right">{t('Action', 'অ্যাকশন')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {items.map((item) => {
                    const isOutOfStock = item.current_stock <= 0;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors whitespace-nowrap">
                        <td className="py-4 px-5 text-center font-mono text-slate-400 font-semibold">
                          {item.serial_no}
                        </td>
                        <td className="py-4 px-4 font-semibold text-slate-800">
                          <div>{item.color_name_en}</div>
                          {item.color_name_bn && (
                            <div className="text-[10px] text-slate-400 font-normal mt-0.5">{item.color_name_bn}</div>
                          )}
                        </td>
                        <td className="py-4 px-4 font-medium text-slate-600">
                          {formatSize(item.size)}
                        </td>
                        <td className="py-4 px-4 text-center font-mono font-bold text-sm">
                          <span className={isOutOfStock ? 'text-rose-600' : 'text-amber-600'}>
                            {item.current_stock}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center font-mono text-slate-500">
                          {item.minimum_stock}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {isOutOfStock ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
                              {t('Out of Stock', 'স্টক শেষ')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                              {t('Reorder', 'পুনঃক্রয়')}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 max-w-xs truncate text-slate-400 italic">
                          {item.notes || '—'}
                        </td>
                        <td className="py-4 px-5 text-right">
                          <Link
                            href={`/stock-in?itemId=${item.id}`}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border shadow-sm cursor-pointer ${
                              isOutOfStock
                                ? 'bg-rose-600 hover:bg-rose-500 border-rose-600 text-white hover:border-rose-500'
                                : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-600 text-white hover:border-emerald-500'
                            }`}
                          >
                            <span>{t('Restock', 'স্টক ইন')}</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </LayoutWrapper>
  );
}
