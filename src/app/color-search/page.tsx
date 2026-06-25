'use client';

import React, { useState, useEffect } from 'react';
import LayoutWrapper from '@/components/layout-wrapper';
import { useApp } from '@/context/AppContext';
import { fetchInventory, fetchSizes } from '@/lib/db';
import { InventoryItem, Size } from '@/lib/types';
import { Search, Loader2, Info, Paintbrush, DollarSign, Box } from 'lucide-react';

export default function ColorSearchPage() {
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
  const [allItems, setAllItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Load all inventory items on mount
  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchInventory();
        setAllItems(data);
        const sizeData = await fetchSizes();
        setSizes(sizeData);
      } catch (err) {
        console.error('Failed to load items for color search', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Group items by English color name
  const getGroupedColors = () => {
    const map: { [colorNameEn: string]: InventoryItem[] } = {};
    
    // Group
    allItems.forEach(item => {
      const key = item.color_name_en;
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(item);
    });

    // Filter keys by search query (checks English, Bengali, and Full Color Name)
    const filteredKeys = Object.keys(map).filter(colorEn => {
      const item = map[colorEn][0];
      const query = searchQuery.toLowerCase();
      return (
        colorEn.toLowerCase().includes(query) ||
        item.color_name_bn.toLowerCase().includes(query) ||
        item.full_color_name.toLowerCase().includes(query)
      );
    });

    // Sort color names alphabetically
    filteredKeys.sort((a, b) => a.localeCompare(b));

    return filteredKeys.map(color => ({
      colorNameEn: color,
      colorNameBn: map[color][0].color_name_bn,
      sizes: map[color]
    }));
  };

  const groupedColors = getGroupedColors();
  const sizesOrder = sizes.map(s => s.name_en);

  return (
    <LayoutWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            {t('Consolidated Color Search', 'রং ও সাইজ ভিত্তিক সমন্বিত স্টক')}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {t('Search a paint color to view consolidated stock metrics across all 4 container sizes.', 'একটি রঙের নাম অনুসন্ধান করুন এবং একই সাথে ৪টি কন্টেইনার সাইজে তার স্টক ও মূল্য দেখে নিন।')}
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-xl">
          <Search className="w-5 h-5 text-slate-400 absolute left-4.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('Enter color name... (e.g. Signal Red, Royal Blue)', 'রঙের নাম লিখুন... (যেমন: Signal Red, Royal Blue)')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm transition-all"
          />
        </div>

        {/* Search Results */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
            <p className="text-slate-400 text-sm">{t('Loading paint database...', 'পেইন্ট ডাটাবেস লোড হচ্ছে...')}</p>
          </div>
        ) : searchQuery.trim() === '' ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 max-w-xl mx-auto shadow-sm">
            <Paintbrush className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-slate-655">{t('Awaiting Search Input', 'অনুসন্ধানের জন্য অপেক্ষা করা হচ্ছে')}</p>
            <p className="text-xs text-slate-400 mt-1">{t('Type a color name above to check available stock options.', 'উপরে রঙের নাম লিখে অনুসন্ধান শুরু করুন।')}</p>
          </div>
        ) : groupedColors.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 max-w-xl mx-auto shadow-sm">
            <Info className="w-12 h-12 mx-auto text-slate-350 mb-3" />
            <p className="font-semibold text-slate-655">{t('No Paint Colors Match', 'কোন মিল খুঁজে পাওয়া যায়নি')}</p>
            <p className="text-xs text-slate-400 mt-1">{t('Check your spelling or try another name.', 'অন্য কোনো নাম লিখে পুনরায় চেষ্টা করুন।')}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedColors.map(({ colorNameEn, colorNameBn, sizes }) => {
              // Calculate aggregated totals for this color
              const totalStock = sizes.reduce((sum, item) => sum + item.current_stock, 0);
              const totalValue = sizes.reduce((sum, item) => sum + (item.current_stock * item.price), 0);

              return (
                <div key={colorNameEn} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-fade-in hover:border-slate-300 transition-all">
                  {/* Color Banner Header */}
                  <div className="bg-slate-50 border-b border-slate-100 px-6 py-4.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Color indicator circle */}
                      <span 
                        className="w-5 h-5 rounded-full border border-slate-355 shadow-inner block"
                        style={{ 
                          backgroundColor: colorNameEn.toLowerCase().includes('blue') ? '#3b82f6' 
                            : colorNameEn.toLowerCase().includes('red') ? '#ef4444' 
                            : colorNameEn.toLowerCase().includes('green') ? '#10b981' 
                            : colorNameEn.toLowerCase().includes('yellow') ? '#f59e0b' 
                            : colorNameEn.toLowerCase().includes('black') ? '#000000' 
                            : colorNameEn.toLowerCase().includes('white') ? '#ffffff' 
                            : '#cbd5e1' 
                        }}
                      />
                      <h3 className="text-lg font-bold text-slate-900">{colorNameEn} <span className="text-sm font-medium text-slate-500">({colorNameBn})</span></h3>
                    </div>

                    {/* Quick aggregates */}
                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Box className="w-4 h-4 text-slate-400" />
                        <span>{t('Total Units', 'মোট স্টক')}: <strong className="text-slate-800 font-mono">{totalStock}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-slate-400" />
                        <span>{t('Est. Value', 'মোট মূল্য')}: <strong className="text-slate-800 font-mono">৳{totalValue.toLocaleString()}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Size Breakdown Grid */}
                  <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {sizesOrder.map(sizeName => {
                      const item = sizes.find(s => s.size === sizeName);

                      if (!item) {
                        return (
                          <div key={sizeName} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between min-h-[140px] opacity-60">
                            <div>
                              <p className="text-xs font-bold text-slate-500 uppercase">{formatSize(sizeName)}</p>
                              <p className="text-slate-400 text-xs mt-4">{t('Not Configured', 'যুক্ত করা হয়নি')}</p>
                            </div>
                          </div>
                        );
                      }

                      // Status Class calculations
                      let badgeClass = '';
                      let label = '';
                      let borderClass = 'border-slate-100';

                      if (item.status === 'Out of Stock') {
                        badgeClass = 'bg-red-50 text-red-700 border border-red-200';
                        label = t('Out of Stock', 'স্টক ফুরিয়েছে');
                        borderClass = 'border-red-100 bg-red-50/10';
                      } else if (item.status === 'Reorder') {
                        badgeClass = 'bg-yellow-50 text-yellow-700 border border-yellow-200';
                        label = t('Low Stock', 'রি-অর্ডার করুন');
                        borderClass = 'border-yellow-100 bg-yellow-50/10';
                      } else {
                        badgeClass = 'bg-emerald-50 text-emerald-700 border border-emerald-250';
                        label = t('Available', 'পর্যাপ্ত আছে');
                        borderClass = 'border-emerald-100';
                      }

                      return (
                        <div key={sizeName} className={`p-4 bg-white rounded-xl border ${borderClass} flex flex-col justify-between min-h-[150px] shadow-sm hover:shadow transition-all`}>
                          <div>
                            <p className="text-xs font-bold text-slate-800 uppercase tracking-wide truncate">
                              {formatSize(sizeName)}
                            </p>
                            
                            <div className="mt-3 flex items-baseline gap-1">
                              <span className="text-2xl font-bold font-mono text-slate-900">{item.current_stock}</span>
                              <span className="text-xs text-slate-400">{t('units', 'টি')}</span>
                            </div>
                            
                            <div className="text-[10px] text-slate-400 mt-1 font-medium">
                              {t('Safety margin', 'নূন্যতম স্টক')}: <span className="font-mono">{item.minimum_stock}</span>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                            <span className="text-xs font-bold font-mono text-slate-700">৳{item.price.toFixed(2)}</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${badgeClass}`}>
                              {label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </LayoutWrapper>
  );
}
