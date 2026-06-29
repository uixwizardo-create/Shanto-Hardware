'use client';

import React, { useState, useEffect } from 'react';
import LayoutWrapper from '@/components/layout-wrapper';
import { useApp } from '@/context/AppContext';
import { fetchInventory, fetchSizes } from '@/lib/db';
import { InventoryItem, Size } from '@/lib/types';
import {
  Calculator,
  Info,
  Layers,
  Ruler,
  Paintbrush,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Settings,
  HelpCircle,
  Undo2,
  AlertTriangle,
  CheckCircle,
  Package,
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';

interface ProductInfo {
  id: string;
  nameEn: string;
  nameBn: string;
  coverage: number; // sq ft per Liter for 1 coat
}

export default function PaintCalculatorPage() {
  const { t, language } = useApp();

  // Shop sizes for conversion
  const [sizes, setSizes] = useState<Size[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stockSearch, setStockSearch] = useState('');
  const [loadingStock, setLoadingStock] = useState(false);

  // Load Sizes and Inventory
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const sizesData = await fetchSizes();
        setSizes(sizesData);
        const invData = await fetchInventory();
        setInventory(invData);
      } catch (err) {
        console.error('Failed to load sizes/inventory:', err);
      }
    };
    loadInitialData();
  }, []);

  // Predefined Paint Products
  const products: Record<string, ProductInfo[]> = {
    interior: [
      { id: 'ape_plastic', nameEn: 'APE Plastic Paint', nameBn: 'এপিই প্লাস্টিক পেইন্ট', coverage: 165 },
      { id: 'distemper', nameEn: 'Acroflat SPD (Distemper)', nameBn: 'অ্যাক্রোফ্ল্যাট এসপিডি (ডিস্টেম্পার)', coverage: 145 },
      { id: 'silk_emulsion', nameEn: 'Feather Silk Emulsion', nameBn: 'ফেদার সিল্ক ইমালশন', coverage: 175 }
    ],
    exterior: [
      { id: 'weather_care', nameEn: 'Weather Care Ext. Emulsion', nameBn: 'ওয়েদার কেয়ার এক্সটেরিয়র ইমালশন', coverage: 168 },
      { id: 'all_rounder', nameEn: 'All Rounder Ext. Emulsion', nameBn: 'অল রাউন্ডার এক্সটেরিয়র ইমালশন', coverage: 100 },
      { id: 'rockcem', nameEn: 'Rockcem Cement Paint', nameBn: 'রকসেম সিমেন্ট পেইন্ট', coverage: 95 }
    ],
    sealer: [
      { id: 'weather_sealer', nameEn: 'Weather Care Ext. Sealer', nameBn: 'ওয়েদার কেয়ার এক্সটেরিয়র সিলার', coverage: 165 },
      { id: 'water_sealer', nameEn: 'Water Base Int. Sealer', nameBn: 'ওয়াটার বেস ইন্টেরিয়র সিলার', coverage: 115 },
      { id: 'ext_primer', nameEn: 'All Rounder Exterior Primer', nameBn: 'অল রাউন্ডার এক্সটেরিয়র প্রাইমার', coverage: 65 }
    ]
  };

  // State Variables
  const [productType, setProductType] = useState<string>('interior');
  const [productId, setProductId] = useState<string>('ape_plastic');
  const [customCoverage, setCustomCoverage] = useState<number>(120);

  // Dimensions
  const [length, setLength] = useState<string>('');
  const [width, setWidth] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [addCeiling, setAddCeiling] = useState<boolean>(false);

  // Deductions (Doors & Windows)
  const [doorWidth, setDoorWidth] = useState<string>('3');
  const [doorHeight, setDoorHeight] = useState<string>('7');
  const [doorQty, setDoorQty] = useState<string>('0');

  const [windowWidth, setWindowWidth] = useState<string>('4');
  const [windowHeight, setWindowHeight] = useState<string>('4');
  const [windowQty, setWindowQty] = useState<string>('0');

  // Multipliers
  const [wallType, setWallType] = useState<'smooth' | 'rough'>('smooth');
  const [coats, setCoats] = useState<number>(2);

  // Flag to know if initial mount/hydration is complete
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('shanto_paint_calc_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.productType !== undefined) setProductType(parsed.productType);
        if (parsed.productId !== undefined) setProductId(parsed.productId);
        if (parsed.customCoverage !== undefined) setCustomCoverage(parsed.customCoverage);
        if (parsed.length !== undefined) setLength(parsed.length);
        if (parsed.width !== undefined) setWidth(parsed.width);
        if (parsed.height !== undefined) setHeight(parsed.height);
        if (parsed.addCeiling !== undefined) setAddCeiling(parsed.addCeiling);
        if (parsed.doorWidth !== undefined) setDoorWidth(parsed.doorWidth);
        if (parsed.doorHeight !== undefined) setDoorHeight(parsed.doorHeight);
        if (parsed.doorQty !== undefined) setDoorQty(parsed.doorQty);
        if (parsed.windowWidth !== undefined) setWindowWidth(parsed.windowWidth);
        if (parsed.windowHeight !== undefined) setWindowHeight(parsed.windowHeight);
        if (parsed.windowQty !== undefined) setWindowQty(parsed.windowQty);
        if (parsed.wallType !== undefined) setWallType(parsed.wallType);
        if (parsed.coats !== undefined) setCoats(parsed.coats);
      }
    } catch (e) {
      console.error('Failed to load paint calculator state:', e);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when state changes (after load is complete)
  useEffect(() => {
    if (!isLoaded) return;
    try {
      const isDefaultState = 
        length === '' &&
        width === '' &&
        height === '' &&
        addCeiling === false &&
        doorWidth === '3' &&
        doorHeight === '7' &&
        doorQty === '0' &&
        windowWidth === '4' &&
        windowHeight === '4' &&
        windowQty === '0' &&
        wallType === 'smooth' &&
        coats === 2 &&
        productType === 'interior' &&
        productId === 'ape_plastic' &&
        customCoverage === 120;

      if (isDefaultState) {
        localStorage.removeItem('shanto_paint_calc_state');
      } else {
        const stateObj = {
          productType,
          productId,
          customCoverage,
          length,
          width,
          height,
          addCeiling,
          doorWidth,
          doorHeight,
          doorQty,
          windowWidth,
          windowHeight,
          windowQty,
          wallType,
          coats
        };
        localStorage.setItem('shanto_paint_calc_state', JSON.stringify(stateObj));
      }
    } catch (e) {
      console.error('Failed to save paint calculator state:', e);
    }
  }, [
    isLoaded,
    productType,
    productId,
    customCoverage,
    length,
    width,
    height,
    addCeiling,
    doorWidth,
    doorHeight,
    doorQty,
    windowWidth,
    windowHeight,
    windowQty,
    wallType,
    coats
  ]);

  // Resolve Active Coverage Rate (sq. ft per Liter)
  let coverageRate = 150;
  if (productType === 'custom') {
    coverageRate = customCoverage || 1;
  } else {
    const list = products[productType] || [];
    const prod = list.find((p) => p.id === productId);
    coverageRate = prod ? prod.coverage : 150;
  }

  // Dimension values (fall back to 0 if empty/invalid)
  const dLength = parseFloat(length) || 0;
  const dWidth = parseFloat(width) || 0;
  const dHeight = parseFloat(height) || 0;

  const dDoorW = parseFloat(doorWidth) || 0;
  const dDoorH = parseFloat(doorHeight) || 0;
  const dDoorQty = parseFloat(doorQty) || 0;

  const dWinW = parseFloat(windowWidth) || 0;
  const dWinH = parseFloat(windowHeight) || 0;
  const dWinQty = parseFloat(windowQty) || 0;

  // Areas
  const wallArea = (dLength * dHeight * 2) + (dWidth * dHeight * 2);
  const ceilingArea = addCeiling ? (dLength * dWidth) : 0;
  const doorArea = dDoorW * dDoorH * dDoorQty;
  const windowArea = dWinW * dWinH * dWinQty;

  // Net Area
  const totalNetArea = Math.max(0, (wallArea + ceilingArea) - (doorArea + windowArea));

  // Paint calculation
  // coverageRate is for 1 coat. For N coats, coverage is coverageRate / N.
  // Rough wall type increases consumption by 20%
  const roughnessMultiplier = wallType === 'rough' ? 1.2 : 1.0;
  const wallCoverageOneCoat = wallArea / coverageRate;
  const ceilingCoverageOneCoat = ceilingArea / coverageRate;

  const wallPaintNeededLiters = (wallArea - (doorArea + windowArea)) > 0 
    ? ((wallArea - (doorArea + windowArea)) / (coverageRate / coats)) * roughnessMultiplier 
    : 0;
  const ceilingPaintNeededLiters = (ceilingArea / (coverageRate / coats)) * roughnessMultiplier;
  const totalPaintNeededLiters = (totalNetArea / (coverageRate / coats)) * roughnessMultiplier;

  // Conversions
  const neededGallons = totalPaintNeededLiters / 3.64;
  const needed2Pound = totalPaintNeededLiters / 0.91;
  const neededHalfLiter = totalPaintNeededLiters / 0.5;
  const neededHalfPound = totalPaintNeededLiters / 0.2;

  // Reset function
  const handleClear = () => {
    setLength('');
    setWidth('');
    setHeight('');
    setAddCeiling(false);
    setDoorWidth('3');
    setDoorHeight('7');
    setDoorQty('0');
    setWindowWidth('4');
    setWindowHeight('4');
    setWindowQty('0');
    setWallType('smooth');
    setCoats(2);
    setProductType('interior');
    setProductId('ape_plastic');
    setCustomCoverage(120);
    try {
      localStorage.removeItem('shanto_paint_calc_state');
    } catch (e) {
      console.error('Failed to clear paint calculator state:', e);
    }
  };

  // Helper to resolve product lists when productType changes
  useEffect(() => {
    if (!isLoaded) return;
    if (productType !== 'custom') {
      const list = products[productType] || [];
      if (list.length > 0) {
        setProductId(list[0].id);
      }
    }
  }, [productType, isLoaded]);

  // Match search query against local inventory
  const filteredStock = inventory.filter((item) => {
    if (!stockSearch) return false;
    const query = stockSearch.toLowerCase();
    return (
      item.color_name_en.toLowerCase().includes(query) ||
      item.color_name_bn.toLowerCase().includes(query) ||
      item.full_color_name.toLowerCase().includes(query) ||
      (item.category_name_en && item.category_name_en.toLowerCase().includes(query)) ||
      (item.category_name_bn && item.category_name_bn.toLowerCase().includes(query))
    );
  });

  return (
    <LayoutWrapper>
      <div className="space-y-6 max-w-7xl mx-auto px-4 py-4 sm:px-6">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 border border-emerald-250 rounded-xl text-emerald-600">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-wide">
                {t('Paint Estimate Calculator', 'পেইন্ট হিসাব ক্যালকুলেটর')}
              </h1>
              <p className="text-xs text-slate-500">
                {t('Calculate double-coat paint requirements, container sizes, and match stock.', 'ডাবল-কোট পেইন্টের প্রয়োজনীয়তা, কোটার সাইজ এবং শপ ইনভেন্টরি মিলিয়ে দেখুন।')}
              </p>
            </div>
          </div>
          <button
            onClick={handleClear}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-650 hover:text-slate-800 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>{t('Clear Calculator', 'ক্যালকুলেটর পরিষ্কার করুন')}</span>
          </button>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Steps & Controls Section */}
          <div className="lg:col-span-8 space-y-6">

            {/* Step 1: Select Paint */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 flex items-center gap-3">
                <span className="flex items-center justify-center w-6 h-6 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                  1
                </span>
                <h2 className="text-sm font-bold text-slate-800 tracking-wide">
                  {t('Step 1: Select Paint Product', 'ধাপ ১: পেইন্ট প্রোডাক্ট নির্বাচন করুন')}
                </h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t('Product Type', 'প্রোডাক্টের ধরণ')}
                  </label>
                  <div className="relative">
                    <select
                      value={productType}
                      onChange={(e) => setProductType(e.target.value)}
                      className="w-full bg-white border border-slate-200 focus:border-emerald-550 text-slate-800 text-sm pl-4 pr-10 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/10 appearance-none transition-all cursor-pointer"
                    >
                      <option value="interior">{t('Interior Paint / ঘরের ভেতরের রঙ', 'Interior Paint / ঘরের ভেতরের রঙ')}</option>
                      <option value="exterior">{t('Exterior Paint / ঘরের বাইরের রঙ', 'Exterior Paint / ঘরের বাইরের রঙ')}</option>
                      <option value="sealer">{t('Sealer / Primer / সিলার ও প্রাইমার', 'Sealer / Primer / সিলার ও প্রাইমার')}</option>
                      <option value="custom">{t('Custom Coverage / কাস্টম কভারেজ', 'Custom Coverage / কাস্টম কভারেজ')}</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {productType !== 'custom' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {t('Product Name', 'প্রোডাক্টের নাম')}
                    </label>
                    <div className="relative">
                      <select
                        value={productId}
                        onChange={(e) => setProductId(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-emerald-550 text-slate-800 text-sm pl-4 pr-10 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/10 appearance-none transition-all cursor-pointer"
                      >
                        {(products[productType] || []).map((p) => (
                          <option key={p.id} value={p.id}>
                            {language === 'en' ? `${p.nameEn} (Cov: ${p.coverage} sq.ft/L)` : `${p.nameBn} (কভারেজ: ${p.coverage} স্কয়ার ফুট/লি.)`}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {t('Custom Coverage Rate (sq. ft. / Litre for 1 coat)', 'কাস্টম কভারেজ রেট (১ কোট স্কয়ার ফুট / লিটার)')}
                    </label>
                    <input
                      type="number"
                      value={customCoverage === 0 ? '' : customCoverage}
                      onChange={(e) => setCustomCoverage(Math.max(1, parseFloat(e.target.value) || 0))}
                      placeholder="e.g. 120"
                      className="w-full bg-white border border-slate-200 focus:border-emerald-500 text-slate-800 text-sm px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Room Measurements */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 flex items-center gap-3">
                <span className="flex items-center justify-center w-6 h-6 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                  2
                </span>
                <h2 className="text-sm font-bold text-slate-800 tracking-wide">
                  {t('Step 2: Room Dimensions & Options', 'ধাপ ২: ঘরের পরিমাপ ও বিকল্পসমূহ')}
                </h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {t('Length / দৈর্ঘ্য (ft)', 'Length / দৈর্ঘ্য (ফিট)')}
                    </label>
                    <input
                      type="number"
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                      placeholder="e.g. 15"
                      className="w-full bg-white border border-slate-200 focus:border-emerald-500 text-slate-800 text-sm px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {t('Width / প্রস্থ (ft)', 'Width / প্রস্থ (ফিট)')}
                    </label>
                    <input
                      type="number"
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                      placeholder="e.g. 12"
                      className="w-full bg-white border border-slate-200 focus:border-emerald-500 text-slate-800 text-sm px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {t('Height / উচ্চতা (ft)', 'Height / উচ্চতা (ফিট)')}
                    </label>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="e.g. 10"
                      className="w-full bg-white border border-slate-200 focus:border-emerald-500 text-slate-800 text-sm px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="ceiling_toggle"
                      checked={addCeiling}
                      onChange={(e) => setAddCeiling(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 bg-white focus:ring-emerald-500/30 cursor-pointer"
                    />
                    <label htmlFor="ceiling_toggle" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                      {t('Calculate Ceiling Paint / সিলিং পেইন্ট অন্তর্ভুক্ত করুন', 'সিলিং পেইন্ট অন্তর্ভুক্ত করুন')}
                    </label>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-500 font-semibold">{t('Surface:', 'দেয়ালের ধরণ:')}</span>
                    <div className="flex gap-4">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          checked={wallType === 'smooth'}
                          onChange={() => setWallType('smooth')}
                          className="text-emerald-600 focus:ring-emerald-500/30 bg-white border-slate-300 w-4 h-4"
                        />
                        <span className="text-xs text-slate-700 font-medium">{t('Smooth Wall', 'মসৃণ দেয়াল')}</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          checked={wallType === 'rough'}
                          onChange={() => setWallType('rough')}
                          className="text-emerald-600 focus:ring-emerald-500/30 bg-white border-slate-300 w-4 h-4"
                        />
                        <span className="text-xs text-slate-700 font-medium">{t('Rough/Porous (+20%)', 'খসখসে/শোষক দেয়াল (+২০%)')}</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-semibold">{t('Number of Paint Coats:', 'পেইন্টের প্রলেপ (কোট) সংখ্যা:')}</span>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((c) => (
                      <button
                        key={c}
                        onClick={() => setCoats(c)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                          coats === c
                            ? 'bg-emerald-55 border-emerald-300 text-emerald-700 shadow-sm'
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700'
                        }`}
                      >
                        {c} {c === 1 ? t('Coat', 'কোট') : t('Coats', 'কোট')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Deductions (Doors & Windows) */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 flex items-center gap-3">
                <span className="flex items-center justify-center w-6 h-6 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                  3
                </span>
                <h2 className="text-sm font-bold text-slate-800 tracking-wide">
                  {t('Step 3: Deductions (Doors & Windows)', 'ধাপ ৩: বাদ দেওয়ার অংশসমূহ (দরজা ও জানালা)')}
                </h2>
              </div>
              <div className="p-6 space-y-5">
                
                {/* Doors input */}
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-800">{t('Doors / দরজা', 'দরজা')}</span>
                    <span className="text-[10px] text-slate-500 font-semibold">{t('Standard Size: 3 ft × 7 ft', 'স্ট্যান্ডার্ড সাইজ: ৩ ফুট × ৭ ফুট')}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">{t('Width (ft)', 'প্রস্থ (ফিট)')}</label>
                      <input
                        type="number"
                        value={doorWidth}
                        onChange={(e) => setDoorWidth(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-emerald-500 text-slate-800 text-xs px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">{t('Height (ft)', 'উচ্চতা (ফিট)')}</label>
                      <input
                        type="number"
                        value={doorHeight}
                        onChange={(e) => setDoorHeight(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-emerald-500 text-slate-800 text-xs px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">{t('Qty', 'সংখ্যা')}</label>
                      <input
                        type="number"
                        value={doorQty}
                        onChange={(e) => setDoorQty(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-emerald-500 text-slate-800 text-xs px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Windows input */}
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-800">{t('Windows / জানালা', 'জানালা')}</span>
                    <span className="text-[10px] text-slate-500 font-semibold">{t('Standard Size: 4 ft × 4 ft', 'স্ট্যান্ডার্ড সাইজ: ৪ ফুট × ৪ ফুট')}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">{t('Width (ft)', 'প্রস্থ (ফিট)')}</label>
                      <input
                        type="number"
                        value={windowWidth}
                        onChange={(e) => setWindowWidth(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-emerald-500 text-slate-800 text-xs px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">{t('Height (ft)', 'উচ্চতা (ফিট)')}</label>
                      <input
                        type="number"
                        value={windowHeight}
                        onChange={(e) => setWindowHeight(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-emerald-500 text-slate-800 text-xs px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">{t('Qty', 'সংখ্যা')}</label>
                      <input
                        type="number"
                        value={windowQty}
                        onChange={(e) => setWindowQty(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-emerald-500 text-slate-800 text-xs px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Step 4: Real-time Stock Matcher */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-6 h-6 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                    4
                  </span>
                  <h2 className="text-sm font-bold text-slate-800 tracking-wide">
                    {t('Step 4: Check Shop Stock for Color', 'ধাপ ৪: শপে কালার স্টক পরীক্ষা করুন')}
                  </h2>
                </div>
                <Package className="w-5 h-5 text-slate-400" />
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t('Search Color Name to Match Stock / স্টক মেলানোর জন্য কালার সার্চ করুন', 'স্টক মেলানোর জন্য কালার সার্চ করুন')}
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={stockSearch}
                      onChange={(e) => setStockSearch(e.target.value)}
                      placeholder={t('Enter color name (e.g. Red, Blue, লাল...)', 'কালার নাম লিখুন (যেমন: Red, Blue, লাল...)')}
                      className="w-full bg-white border border-slate-200 focus:border-emerald-550 text-slate-800 text-sm pl-10 pr-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                    />
                  </div>
                </div>

                {stockSearch && (
                  <div className="bg-slate-50/20 border border-slate-200 rounded-xl overflow-hidden animate-fade-in">
                    {filteredStock.length > 0 ? (
                      <div className="divide-y divide-slate-200 max-h-60 overflow-y-auto">
                        {filteredStock.map((item) => (
                          <div key={item.id} className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                            <div>
                              <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                                <span>{language === 'en' ? item.color_name_en : item.color_name_bn}</span>
                                <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono">({item.size})</span>
                              </div>
                              {item.category_name_en && (
                                <span className="text-[10px] text-slate-400 mt-0.5 block">
                                  {t(item.category_name_en, item.category_name_bn || '')}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-right">
                              <div>
                                <span className="text-[10px] text-slate-400 block">{t('In Stock', 'মজুদ আছে')}</span>
                                <span className={`text-xs font-bold ${
                                  item.current_stock <= 0
                                    ? 'text-rose-505'
                                    : item.current_stock <= item.minimum_stock
                                    ? 'text-amber-500'
                                    : 'text-emerald-600'
                                }`}>
                                  {item.current_stock}
                                </span>
                              </div>
                              <div className="flex gap-1.5">
                                <Link
                                  href={`/stock-in?color=${encodeURIComponent(item.color_name_en)}&size=${encodeURIComponent(item.size)}`}
                                  className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                                  title={t('Restock', 'স্টক ইন')}
                                >
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                </Link>
                                <Link
                                  href={`/stock-out?color=${encodeURIComponent(item.color_name_en)}&size=${encodeURIComponent(item.size)}`}
                                  className="p-1.5 bg-rose-55 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                                  title={t('Sell', 'স্টক আউট')}
                                >
                                  <ArrowDownLeft className="w-3.5 h-3.5" />
                                </Link>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-400">
                        {t('No matching paint items in stock.', 'স্টকে কোনো ম্যাচিং পেইন্ট প্রোডাক্ট পাওয়া যায়নি।')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Results Summary Sidebar (Sticky) */}
          <div className="lg:col-span-4 space-y-6">

            {/* Calculations Card */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden lg:sticky lg:top-4">
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 flex items-center gap-2.5">
                <Paintbrush className="w-5 h-5 text-emerald-650" />
                <h2 className="text-sm font-bold text-slate-800 tracking-wide">
                  {t('Estimate Summary', 'হিসাবের সারসংক্ষেপ')}
                </h2>
              </div>

              <div className="p-6 space-y-6">
                
                {/* BIG LITERS DISPLAY */}
                <div className="relative overflow-hidden bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl flex flex-col items-center text-center">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">
                    {t('Total Paint Required', 'সর্বমোট প্রয়োজনীয় পেইন্ট')}
                  </span>
                  <div className="flex items-baseline gap-1.5 justify-center">
                    <span className="text-4xl font-extrabold text-emerald-700 font-mono tracking-tight">
                      {totalPaintNeededLiters.toFixed(2)}
                    </span>
                    <span className="text-lg font-bold text-emerald-800 font-sans">
                      {t('Liters', 'লিটার')}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap justify-center gap-2 text-[10px] font-semibold text-slate-600">
                    <span className="bg-white/80 border border-slate-200/60 px-2 py-0.5 rounded-full">
                      {coats} {coats === 1 ? t('Coat', 'কোট') : t('Coats', 'কোট')}
                    </span>
                    <span className="bg-white/80 border border-slate-200/60 px-2 py-0.5 rounded-full">
                      {wallType === 'smooth' ? t('Smooth Wall', 'মসৃণ দেয়াল') : t('Rough Wall (+20%)', 'খসখসে দেয়াল (+২০%)')}
                    </span>
                  </div>
                </div>

                {/* Area breakdown */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    {t('Area Breakdown', 'ক্ষেত্রফলের বিবরণ')}
                  </span>
                  
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>{t('Wall Area:', 'দেয়ালের ক্ষেত্রফল:')}</span>
                      <span className="font-semibold text-slate-800 font-mono">{wallArea.toFixed(1)} sq.ft</span>
                    </div>

                    {addCeiling && (
                      <div className="flex justify-between items-center text-slate-600">
                        <span>{t('Ceiling Area:', 'সিলিংয়ের ক্ষেত্রফল:')}</span>
                        <span className="font-semibold text-slate-800 font-mono">+{ceilingArea.toFixed(1)} sq.ft</span>
                      </div>
                    )}

                    {(doorArea > 0 || windowArea > 0) && (
                      <div className="flex justify-between items-center text-slate-600">
                        <span>{t('Deductions (Doors & Windows):', 'বাদ দেওয়ার অংশসমূহ:')}</span>
                        <span className="font-semibold text-rose-600 font-mono">-{ (doorArea + windowArea).toFixed(1) } sq.ft</span>
                      </div>
                    )}

                    <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-slate-800 font-bold">
                      <span>{t('Net Paintable Area:', 'মোট পেইন্টযোগ্য ক্ষেত্রফল:')}</span>
                      <span className="font-mono text-slate-900">{totalNetArea.toFixed(1)} sq.ft</span>
                    </div>
                  </div>
                </div>

                {/* Size Conversions Table */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-emerald-650" />
                    {t('Container Size Estimations', 'কৌটার আকার অনুযায়ী হিসাব')}
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Gallons */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm">
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">
                        {t('Gallons (3.64L)', 'গ্যালন (৩.৬৪ লি.)')}
                      </span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-sm font-bold text-slate-800 font-mono">
                          ~{neededGallons.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-slate-500 font-sans">{t('Pcs', 'পিস')}</span>
                      </div>
                    </div>

                    {/* 2 Pound */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm">
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">
                        {t('2 Pound (.91L)', '২ পাউন্ড (.৯১ লি.)')}
                      </span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-sm font-bold text-slate-800 font-mono">
                          ~{needed2Pound.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-slate-500 font-sans">{t('Pcs', 'পিস')}</span>
                      </div>
                    </div>

                    {/* Half Liter */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm">
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">
                        {t('Half Liter (0.5L)', 'হাফ লিটার (০.৫ লি.)')}
                      </span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-sm font-bold text-slate-800 font-mono">
                          ~{neededHalfLiter.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-slate-500 font-sans">{t('Pcs', 'পিস')}</span>
                      </div>
                    </div>

                    {/* Half Pound */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm">
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">
                        {t('Half Pound (200ML)', 'হাফ পাউন্ড (২০০মি.)')}
                      </span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-sm font-bold text-slate-800 font-mono">
                          ~{neededHalfPound.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-slate-500 font-sans">{t('Pcs', 'পিস')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Important notice / tips */}
                <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200/60 text-[10px] text-amber-900 space-y-1.5 shadow-sm">
                  <div className="flex gap-1.5">
                    <span className="text-amber-600 font-bold shrink-0">⚠️</span>
                    <p className="leading-relaxed">
                      {t('Calculations assume double coat painting by default.', 'ক্যালকুলেশনগুলো ডিফল্ট ডাবল কোট হিসেবে করা হয়েছে।')}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="text-amber-600 font-bold shrink-0">💡</span>
                    <p className="leading-relaxed">
                      {t('Porous or unpainted walls may require up to 20% more paint.', 'খসখসে বা পূর্বে পেইন্ট না করা দেয়ালে ২০% পর্যন্ত অতিরিক্ত পেইন্ট লাগতে পারে।')}
                    </p>
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>

      </div>
    </LayoutWrapper>
  );
}
