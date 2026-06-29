'use client';

import React, { useState, useEffect } from 'react';
import LayoutWrapper from '@/components/layout-wrapper';
import { useApp } from '@/context/AppContext';
import { fetchPrices, addPrice, updatePrice, deletePrice, fetchCategories, fetchSizes } from '@/lib/db';
import { Pricing, Category, Size } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Coins,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  CheckCircle,
  Loader2,
  X,
  Info,
  ChevronDown,
  Search,
  Eye,
  EyeOff
} from 'lucide-react';

const pricingSchema = z.object({
  categoryId: z.string().min(1, 'Category is required / ক্যাটাগরি প্রয়োজন'),
  sizeId: z.string().min(1, 'Size is required / সাইজ প্রয়োজন'),
  buyingPrice: z.number().min(0, 'Buying price must be at least 0 / ক্রয় মূল্য অবশ্যই ০ বা তার বেশি হতে হবে'),
  sellingPrice: z.number().min(0, 'Selling price must be at least 0 / বিক্রয় মূল্য অবশ্যই ০ বা তার বেশি হতে হবে'),
});

const editPricingSchema = z.object({
  buyingPrice: z.number().min(0, 'Buying price must be at least 0 / ক্রয় মূল্য অবশ্যই ০ বা তার বেশি হতে হবে'),
  sellingPrice: z.number().min(0, 'Selling price must be at least 0 / বিক্রয় মূল্য অবশ্যই ০ বা তার বেশি হতে হবে'),
});

type PricingFormValues = z.infer<typeof pricingSchema>;
type EditPricingFormValues = z.infer<typeof editPricingSchema>;

export default function PricingPage() {
  const { t, user, language } = useApp();
  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff';

  const [prices, setPrices] = useState<Pricing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sizeFilter, setSizeFilter] = useState('all');

  // Price visibility masking state
  const [visiblePrices, setVisiblePrices] = useState<Set<string>>(new Set());

  const togglePriceVisibility = (id: string) => {
    setVisiblePrices(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Generate Cartesian Product of all Categories & Sizes, resolving database prices where exists
  const combinedPrices = React.useMemo(() => {
    if (categories.length === 0 || sizes.length === 0) return [];
    
    const list: Pricing[] = [];
    categories.forEach(cat => {
      sizes.forEach(sz => {
        const existing = prices.find(p => p.category_id === cat.id && p.size_id === sz.id);
        if (existing) {
          list.push(existing);
        } else {
          list.push({
            id: `placeholder-${cat.id}-${sz.id}`,
            category_id: cat.id,
            size_id: sz.id,
            buying_price: 0,
            prev_buying_price: 0,
            selling_price: 0,
            category_name_en: cat.name_en,
            category_name_bn: cat.name_bn,
            size_name_en: sz.name_en,
            size_name_bn: sz.name_bn,
            created_at: new Date().toISOString()
          });
        }
      });
    });
    return list;
  }, [categories, sizes, prices]);

  // Dynamic filtered prices based on combined list
  const filteredPrices = combinedPrices.filter(p => {
    // 1. Search Query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchCatEn = p.category_name_en?.toLowerCase().includes(q) || false;
      const matchCatBn = p.category_name_bn?.toLowerCase().includes(q) || false;
      const matchSizeEn = p.size_name_en?.toLowerCase().includes(q) || false;
      const matchSizeBn = p.size_name_bn?.toLowerCase().includes(q) || false;
      if (!matchCatEn && !matchCatBn && !matchSizeEn && !matchSizeBn) {
        return false;
      }
    }
    
    // 2. Category Filter
    if (categoryFilter !== 'all' && p.category_id !== categoryFilter) {
      return false;
    }
    
    // 3. Size Filter
    if (sizeFilter !== 'all' && p.size_id !== sizeFilter) {
      return false;
    }
    
    return true;
  });

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [priceToEdit, setPriceToEdit] = useState<Pricing | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [priceToDelete, setPriceToDelete] = useState<Pricing | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load pricing and supporting lists
  const loadPricesList = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPrices();
      setPrices(data);
    } catch (err: any) {
      console.error(err);
      setError(t('Failed to load prices.', 'মূল্য তালিকা লোড করতে ব্যর্থ হয়েছে।'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadSupportData = async () => {
      try {
        const [cats, szs] = await Promise.all([fetchCategories(), fetchSizes()]);
        setCategories(cats);
        setSizes(szs);
      } catch (err) {
        console.error('Failed to load support lists:', err);
      }
    };
    loadPricesList();
    loadSupportData();
  }, []);

  // React Hook Form for Adding Prices
  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    reset: resetAdd,
    formState: { errors: errorsAdd }
  } = useForm<PricingFormValues>({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      categoryId: '',
      sizeId: '',
      buyingPrice: 0,
      sellingPrice: 0
    }
  });

  // React Hook Form for Editing Prices
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    setValue: setValueEdit,
    formState: { errors: errorsEdit }
  } = useForm<EditPricingFormValues>({
    resolver: zodResolver(editPricingSchema),
    defaultValues: {
      buyingPrice: 0,
      sellingPrice: 0
    }
  });

  // Modal handlers
  const handleOpenAddModal = () => {
    if (!isAdmin) return;
    resetAdd();
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (p: Pricing) => {
    if (!isAdmin) return;
    setPriceToEdit(p);
    setValueEdit('buyingPrice', p.buying_price);
    setValueEdit('sellingPrice', p.selling_price);
    setIsEditModalOpen(true);
  };

  const handleOpenDeleteModal = (p: Pricing) => {
    if (!isAdmin) return;
    setPriceToDelete(p);
    setDeleteModalOpen(true);
  };

  // Submit operations
  const onAddPriceSubmit = async (data: PricingFormValues) => {
    if (!isAdmin) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const duplicate = prices.some(p => p.category_id === data.categoryId && p.size_id === data.sizeId);
      if (duplicate) {
        setError(t('A pricing record for this category and size already exists.', 'এই ক্যাটাগরি এবং সাইজের মূল্য তালিকা রেকর্ড ইতোমধ্যেই বিদ্যমান।'));
        setIsSubmitting(false);
        return;
      }

      await addPrice(data.categoryId, data.sizeId, data.buyingPrice, data.sellingPrice);
      setSuccessMsg(t('Pricing record added successfully.', 'মূল্য তালিকা রেকর্ড সফলভাবে যোগ করা হয়েছে।'));
      resetAdd();
      setIsAddModalOpen(false);
      loadPricesList();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to add pricing record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onEditPriceSubmit = async (data: EditPricingFormValues) => {
    if (!isAdmin || !priceToEdit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      if (priceToEdit.id.startsWith('placeholder-')) {
        await addPrice(priceToEdit.category_id, priceToEdit.size_id, data.buyingPrice, data.sellingPrice);
        setSuccessMsg(t('Pricing record added successfully.', 'মূল্য তালিকা রেকর্ড সফলভাবে যোগ করা হয়েছে।'));
      } else {
        await updatePrice(priceToEdit.id, data.buyingPrice, data.sellingPrice);
        setSuccessMsg(t('Pricing record updated successfully.', 'মূল্য তালিকা রেকর্ড সফলভাবে আপডেট করা হয়েছে।'));
      }
      resetEdit();
      setIsEditModalOpen(false);
      setPriceToEdit(null);
      loadPricesList();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update pricing record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDeleteConfirm = async () => {
    if (!isAdmin || !priceToDelete) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await deletePrice(priceToDelete.id);
      setSuccessMsg(t('Pricing record deleted successfully.', 'মূল্য তালিকা রেকর্ড সফলভাবে মুছে ফেলা হয়েছে।'));
      setDeleteModalOpen(false);
      setPriceToDelete(null);
      loadPricesList();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete pricing record.');
      setDeleteModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LayoutWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Coins className="w-8 h-8 text-emerald-600" />
              <span>{t('Pricing List', 'মূল্য তালিকা')}</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {t('Manage buying and selling prices for paint categories and container sizes.', 'পেইন্ট ক্যাটাগরি এবং কৌটার সাইজের সমন্বয়ে ক্রয় ও বিক্রয় মূল্য তালিকা পরিচালনা করুন।')}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={handleOpenAddModal}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer self-start md:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>{t('Add Price', 'মূল্য যুক্ত করুন')}</span>
            </button>
          )}
        </div>

        {/* Warning Banner for Staff */}
        {isStaff && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-850 text-sm flex items-center gap-2 animate-fade-in">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
            <span className="font-medium">{t('Staff Read-Only Access', 'স্টাফ রিড-অনলি অ্যাক্সেস')}</span>
          </div>
        )}

        {/* Success/Error Alerts */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2 animate-fade-in">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex items-center gap-2 animate-fade-in">
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Filters Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center w-full">
          {/* Left Side: Search */}
          <div className="relative w-full md:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('Search by category or size...', 'ক্যাটাগরি বা সাইজ দিয়ে খুঁজুন...')}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm pl-10 pr-10 py-2.5 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Right Side: Category and Size Selects */}
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Category Select */}
            <div className="relative w-full sm:w-48">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 text-slate-800 text-sm pl-4 pr-10 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/10 appearance-none transition-all cursor-pointer"
              >
                <option value="all">{t('All Categories', 'সব ক্যাটাগরি')}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {language === 'en' ? cat.name_en : (cat.name_bn || cat.name_en)}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>

            {/* Size Select */}
            <div className="relative w-full sm:w-48">
              <select
                value={sizeFilter}
                onChange={(e) => setSizeFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 text-slate-800 text-sm pl-4 pr-10 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/10 appearance-none transition-all cursor-pointer"
              >
                <option value="all">{t('All Sizes', 'সব সাইজ')}</option>
                {sizes.map((sz) => (
                  <option key={sz.id} value={sz.id}>
                    {language === 'en' ? sz.name_en : (sz.name_bn || sz.name_en)}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Pricing List Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden w-full">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                <p className="text-slate-400 text-sm">{t('Loading pricing records...', 'মূল্য তালিকা লোড হচ্ছে...')}</p>
              </div>
            ) : filteredPrices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                <Info className="w-12 h-12 text-slate-300" />
                <p className="font-semibold text-slate-650">
                  {prices.length === 0 
                    ? t('No pricing records found', 'কোনো মূল্য তালিকা রেকর্ড পাওয়া যায়নি')
                    : t('No pricing records found matching your filters', 'আপনার ফিল্টার অনুযায়ী কোনো মূল্য তালিকা রেকর্ড পাওয়া যায়নি')}
                </p>
              </div>
            ) : (
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                    <th className="p-4 pl-6 w-20 text-center">{t('#', 'ক্রমিক নং')}</th>
                    <th className="p-4">{t('Category', 'ক্যাটাগরি')}</th>
                    <th className="p-4">{t('Size', 'সাইজ')}</th>
                    <th className="p-4">{t('Previous Buying Price', 'আগের ক্রয় মূল্য')}</th>
                    <th className="p-4">{t('Current Buying Price', 'বর্তমান ক্রয় মূল্য')}</th>
                    <th className="p-4">{t('Selling Price (BDT)', 'বিক্রয় মূল্য (টাকা)')}</th>
                    {isAdmin && <th className="p-4 pr-6 text-center w-32">{t('Actions', 'অপশন')}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {filteredPrices.map((p, index) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors whitespace-nowrap">
                      <td className="p-4 pl-6 text-center text-slate-400 font-mono">{index + 1}</td>
                      <td className="p-4 font-semibold text-slate-900">
                        {language === 'en' ? p.category_name_en : (p.category_name_bn || p.category_name_en)}
                      </td>
                      <td className="p-4 font-mono text-slate-600">
                        {language === 'en' ? p.size_name_en : (p.size_name_bn || p.size_name_en)}
                      </td>
                      <td className="p-4 font-bold text-slate-800 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span>
                            {visiblePrices.has(p.id) 
                              ? `৳${(p.prev_buying_price ?? 0).toFixed(2)}` 
                              : '••••••'}
                          </span>
                          <button
                            onClick={() => togglePriceVisibility(p.id)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                            title={visiblePrices.has(p.id) ? t('Hide Price', 'মূল্য লুকান') : t('Show Price', 'মূল্য দেখান')}
                          >
                            {visiblePrices.has(p.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-slate-800 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span>
                            {visiblePrices.has(p.id) 
                              ? `৳${(p.buying_price ?? 0).toFixed(2)}` 
                              : '••••••'}
                          </span>
                          <button
                            onClick={() => togglePriceVisibility(p.id)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                            title={visiblePrices.has(p.id) ? t('Hide Price', 'মূল্য লুকান') : t('Show Price', 'মূল্য দেখান')}
                          >
                            {visiblePrices.has(p.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-emerald-600 font-mono">৳{(p.selling_price ?? 0).toFixed(2)}</td>
                      {isAdmin && (
                        <td className="p-4 pr-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenEditModal(p)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                              title={t('Edit Price', 'মূল্য সম্পাদনা')}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {!p.id.startsWith('placeholder-') ? (
                              <button
                                onClick={() => handleOpenDeleteModal(p)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                                title={t('Delete Price', 'মূল্য মুছুন')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                disabled
                                className="p-1.5 text-slate-300 bg-slate-50 border border-slate-100 rounded-lg cursor-not-allowed opacity-60"
                                title={t('No price configured to delete', 'মুছার মতো কোনো মূল্য সেট করা নেই')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Modal: ADD Price */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-slate-800 text-lg">
                    {t('Add New Pricing Record', 'নতুন মূল্য তালিকা রেকর্ড যোগ করুন')}
                  </h3>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 p-1 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitAdd(onAddPriceSubmit)} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    {t('Category', 'ক্যাটাগরি')}
                  </label>
                  <div className="relative">
                    <select
                      {...registerAdd('categoryId')}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 text-slate-800 text-sm pl-4 pr-10 py-3 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/10 appearance-none transition-all cursor-pointer"
                    >
                      <option value="">{t('Select Category', 'ক্যাটাগরি নির্বাচন করুন')}</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {language === 'en' ? cat.name_en : (cat.name_bn || cat.name_en)}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                  {errorsAdd.categoryId && (
                    <span className="text-red-500 text-xs mt-1 block">{errorsAdd.categoryId.message}</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    {t('Size', 'সাইজ')}
                  </label>
                  <div className="relative">
                    <select
                      {...registerAdd('sizeId')}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 text-slate-800 text-sm pl-4 pr-10 py-3 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/10 appearance-none transition-all cursor-pointer"
                    >
                      <option value="">{t('Select Size', 'সাইজ নির্বাচন করুন')}</option>
                      {sizes.map((sz) => (
                        <option key={sz.id} value={sz.id}>
                          {language === 'en' ? sz.name_en : (sz.name_bn || sz.name_en)}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                  {errorsAdd.sizeId && (
                    <span className="text-red-500 text-xs mt-1 block">{errorsAdd.sizeId.message}</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    {t('Buying Price (BDT)', 'ক্রয় মূল্য (টাকা)')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...registerAdd('buyingPrice', { valueAsNumber: true })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all font-mono"
                  />
                  {errorsAdd.buyingPrice && (
                    <span className="text-red-500 text-xs mt-1 block">{errorsAdd.buyingPrice.message}</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    {t('Selling Price (BDT)', 'বিক্রয় মূল্য (টাকা)')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...registerAdd('sellingPrice', { valueAsNumber: true })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all font-mono"
                  />
                  {errorsAdd.sellingPrice && (
                    <span className="text-red-500 text-xs mt-1 block">{errorsAdd.sellingPrice.message}</span>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold py-3 rounded-full transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    <span>{t('Add Price', 'মূল্য রেকর্ড করুন')}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: EDIT Price */}
        {isEditModalOpen && priceToEdit && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-slate-800 text-lg">
                    {t('Edit Pricing Record', 'মূল্য তালিকা রেকর্ড সম্পাদনা করুন')}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setPriceToEdit(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 p-1 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitEdit(onEditPriceSubmit)} className="p-6 space-y-5">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                  <div>
                    <span className="font-semibold text-slate-800">{t('Category: ', 'ক্যাটাগরি: ')}</span>
                    {language === 'en' ? priceToEdit.category_name_en : (priceToEdit.category_name_bn || priceToEdit.category_name_en)}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800">{t('Size: ', 'সাইজ: ')}</span>
                    {language === 'en' ? priceToEdit.size_name_en : (priceToEdit.size_name_bn || priceToEdit.size_name_en)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    {t('Buying Price (BDT)', 'ক্রয় মূল্য (টাকা)')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...registerEdit('buyingPrice', { valueAsNumber: true })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all font-mono"
                  />
                  {errorsEdit.buyingPrice && (
                    <span className="text-red-500 text-xs mt-1 block">{errorsEdit.buyingPrice.message}</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    {t('Selling Price (BDT)', 'বিক্রয় মূল্য (টাকা)')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...registerEdit('sellingPrice', { valueAsNumber: true })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all font-mono"
                  />
                  {errorsEdit.sellingPrice && (
                    <span className="text-red-500 text-xs mt-1 block">{errorsEdit.sellingPrice.message}</span>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold py-3 rounded-full transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    <span>{t('Save Changes', 'পরিবর্তن সংরক্ষণ করুন')}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: CONFIRM Delete */}
        {deleteModalOpen && priceToDelete && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-rose-50 border border-rose-200 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">
                    {t('Delete Pricing Record', 'মূল্য তালিকা রেকর্ড মুছুন')}
                  </h3>
                  <p className="text-slate-500 text-xs mt-1">
                    {t('Are you sure you want to delete this pricing record? This action cannot be undone.', 'আপনি কি নিশ্চিত যে আপনি এই মূল্য তালিকা রেকর্ডটি মুছে ফেলতে চান? এটি আর ফেরত আনা সম্ভব নয়।')}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[10px] text-slate-500 font-mono">
                  {language === 'en' ? priceToDelete.category_name_en : (priceToDelete.category_name_bn || priceToDelete.category_name_en)} ({language === 'en' ? priceToDelete.size_name_en : (priceToDelete.size_name_bn || priceToDelete.size_name_en)})
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setDeleteModalOpen(false);
                      setPriceToDelete(null);
                    }}
                    className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-semibold py-2.5 rounded-full transition-colors cursor-pointer"
                  >
                    {t('Cancel', 'বাতিল')}
                  </button>
                  <button
                    onClick={onDeleteConfirm}
                    disabled={isSubmitting}
                    className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold py-2.5 rounded-full transition-colors cursor-pointer disabled:opacity-55"
                  >
                    {isSubmitting ? t('Deleting...', 'মুছে ফেলা হচ্ছে...') : t('Delete', 'মুছে ফেলুন')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </LayoutWrapper>
  );
}
