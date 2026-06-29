'use client';

import React, { useState, useEffect } from 'react';
import LayoutWrapper from '@/components/layout-wrapper';
import { useApp } from '@/context/AppContext';
import { 
  fetchInventory, 
  addInventoryItem, 
  updateInventoryItem, 
  deleteInventoryItem,
  fetchCategories,
  fetchSizes
} from '@/lib/db';
import { InventoryItem, ItemSize, Category, Size } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  AlertTriangle, 
  Info,
  CheckCircle,
  Paintbrush,
  Loader2,
  ChevronDown
} from 'lucide-react';

interface ItemFormValues {
  colorNameEn: string;
  colorNameBn?: string;
  size: string;
  minimumStock: number;
  categoryId: string;
  initialStock?: number;
}

// Form validation schema
const itemSchema = z.object({
  colorNameEn: z.string().min(1, 'English color name is required / ইংরেজি রঙের নাম প্রয়োজন'),
  colorNameBn: z.string().optional(),
  size: z.string().min(1, 'Select size / সাইজ নির্বাচন করুন'),
  minimumStock: z.number().min(0, 'Minimum stock must be positive / নূন্যতম স্টক অবশ্যই ০ বা তার বেশি হতে হবে'),
  categoryId: z.string().min(1, 'Select category / ক্যাটাগরি নির্বাচন করুন'),
  initialStock: z.coerce.number().min(0, 'Initial stock must be positive / প্রারম্ভিক স্টক অবশ্যই ০ বা তার বেশি হতে হবে').optional(),
});

export default function InventoryPage() {
  const { t, user, language } = useApp();
  const isAdmin = user?.role === 'admin';
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Inventory Data
  const loadInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {
        search: searchQuery || undefined,
        size: sizeFilter !== 'all' ? (sizeFilter as ItemSize) : undefined,
        status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
        categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
      };
      const data = await fetchInventory(filters);
      setItems(data);
    } catch (err: any) {
      console.error(err);
      setError(t('Failed to load inventory data.', 'ইনভেন্টরি তথ্য লোড করতে ব্যর্থ হয়েছে।'));
    } finally {
      setLoading(false);
    }
  };

  // Load Categories Data
  const loadCategories = async () => {
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  // Load Sizes Data
  const loadSizes = async () => {
    try {
      const data = await fetchSizes();
      setSizes(data);
    } catch (err) {
      console.error('Failed to load sizes', err);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    loadInventory();
  }, [searchQuery, sizeFilter, statusFilter, categoryFilter]);

  useEffect(() => {
    loadCategories();
    loadSizes();
  }, []);

  // Form setups
  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    reset: resetAdd,
    formState: { errors: errorsAdd }
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema as any) as any,
    defaultValues: {
      colorNameEn: '',
      colorNameBn: '',
      size: '',
      minimumStock: 5,
      categoryId: '',
      initialStock: 0,
    }
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    setValue: setValueEdit,
    formState: { errors: errorsEdit }
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema as any) as any,
  });

  // Handle Add Item Submit
  const onAddItemSubmit = async (data: ItemFormValues) => {
    if (!isAdmin) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const combinedColorName = data.colorNameBn
        ? `${data.colorNameEn} (${data.colorNameBn})`
        : data.colorNameEn;
      await addInventoryItem(
        combinedColorName, 
        data.size, 
        data.minimumStock, 
        0, 
        data.categoryId,
        data.initialStock || 0,
        user?.id
      );
      setSuccessMsg(t('Item added successfully.', 'নতুন পেইন্ট আইটেম সফলভাবে যোগ করা হয়েছে।'));
      setIsAddModalOpen(false);
      resetAdd();
      loadInventory();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to add item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: InventoryItem) => {
    if (!isAdmin) return;
    setSelectedItem(item);
    setValueEdit('colorNameEn', item.color_name_en || '');
    setValueEdit('colorNameBn', item.color_name_bn || '');
    setValueEdit('size', item.size);
    setValueEdit('minimumStock', item.minimum_stock);
    setValueEdit('categoryId', item.category_id || '');
    setIsEditModalOpen(true);
  };

  // Handle Edit Item Submit
  const onEditItemSubmit = async (data: ItemFormValues) => {
    if (!isAdmin || !selectedItem) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const combinedColorName = data.colorNameBn
        ? `${data.colorNameEn} (${data.colorNameBn})`
        : data.colorNameEn;
      await updateInventoryItem(selectedItem.id, combinedColorName, data.size, data.minimumStock, 0, data.categoryId);
      setSuccessMsg(t('Item updated successfully.', 'পেইন্ট আইটেম সফলভাবে আপডেট করা হয়েছে।'));
      setIsEditModalOpen(false);
      setSelectedItem(null);
      resetEdit();
      loadInventory();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Delete Confirm Modal
  const handleOpenDeleteModal = (item: InventoryItem) => {
    if (!isAdmin) return;
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
  };

  // Handle Delete Confirm Action
  const onDeleteConfirm = async () => {
    if (!isAdmin || !selectedItem) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await deleteInventoryItem(selectedItem.id);
      setSuccessMsg(t('Item deleted successfully.', 'পেইন্ট আইটেম সফলভাবে মুছে ফেলা হয়েছে।'));
      setIsDeleteModalOpen(false);
      setSelectedItem(null);
      loadInventory();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pagination Calculations
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = items.slice(startIndex, endIndex);

  return (
    <LayoutWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              {t('Inventory Items Directory', 'ইনভেন্টরি পণ্যের তালিকা')}
            </h1>
            <p className="text-slate-505 text-sm mt-1">
              {t('Manage all colors and sizes. Configure safety reorder margins and initial stock levels.', 'সকল রং ও আকারের পেইন্ট স্টক পরিচালনা করুন। রিমাইন্ডার মার্জিন এবং প্রারম্ভিক স্টক সেট করুন।')}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => {
                resetAdd();
                setIsAddModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 self-start bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>{t('Add Paint Item', 'নতুন পেইন্ট যোগ')}</span>
            </button>
          )}
        </div>

        {/* Banner Alert Messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex items-center gap-2">
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="w-full md:w-auto flex-1 flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md w-full">
              <Search className="w-4.5 h-4.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('Search by color name... (e.g. Red)', 'রঙের নাম দিয়ে অনুসন্ধান... (যেমন: লাল)')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Size Filter */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="relative w-full md:w-auto flex-1">
                <select
                  value={sizeFilter}
                  onChange={(e) => setSizeFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2 text-sm text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer appearance-none"
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

            {/* Category Filter */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-auto flex-1">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2 text-sm text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer appearance-none"
                >
                  <option value="all">{t('All Categories', 'সকল ক্যাটাগরি')}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {t(cat.name_en, cat.name_bn)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-auto flex-1">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2 text-sm text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer appearance-none"
                >
                  <option value="all">{t('All Statuses', 'সকল অবস্থা')}</option>
                  <option value="Available">{t('Available (Normal)', 'পর্যাপ্ত আছে')}</option>
                  <option value="Reorder">{t('Reorder (Low Stock)', 'কম স্টক')}</option>
                  <option value="Out of Stock">{t('Out of Stock', 'স্টক শেষ')}</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Directory Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                <p className="text-slate-400 text-sm">{t('Loading inventory directory...', 'ইনভেন্টরি লোড হচ্ছে...')}</p>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                <Info className="w-12 h-12 text-slate-350" />
                <p className="font-semibold text-slate-600">{t('No paint items found', 'কোন পেইন্ট পণ্য পাওয়া যায়নি')}</p>
                <p className="text-xs text-slate-400">{t('Try adjusting your search query or filters.', 'আপনার অনুসন্ধান পরিবর্তন করুন।')}</p>
              </div>
            ) : (
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                    <th className="p-4 pl-6 w-16 text-center">{t('#', 'ক্রমিক নং')}</th>
                    <th className="p-4">{t('Color / রং', 'রঙের নাম')}</th>
                    <th className="p-4">{t('Category', 'ক্যাটাগরি')}</th>
                    <th className="p-4 text-right">{t('Selling Price', 'বিক্রয় মূল্য')}</th>
                    <th className="p-4 text-right">{t('Initial Stock', 'শুরুর স্টক')}</th>
                    <th className="p-4 text-right">{t('Current Stock', 'বর্তমান স্টক')}</th>
                    <th className="p-4 text-right">{t('Min Stock', 'নূন্যতম স্টক')}</th>
                    <th className="p-4 text-center">{t('Status', 'অবস্থা')}</th>
                    {isAdmin && <th className="p-4 pr-6 text-center w-24">{t('Actions', 'অপশন')}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {paginatedItems.map((item) => {
                    // Status Badge Mapping
                    let badgeClass = '';
                    let statusLabel = '';
                    if (item.status === 'Out of Stock') {
                      badgeClass = 'bg-red-50 border border-red-200 text-red-750';
                      statusLabel = t('Out of Stock', 'স্টক নেই');
                    } else if (item.status === 'Reorder') {
                      badgeClass = 'bg-yellow-50 border border-yellow-200 text-yellow-750';
                      statusLabel = t('Reorder Needed', 'স্টক কম');
                    } else {
                      badgeClass = 'bg-emerald-50 border border-emerald-200 text-emerald-750';
                      statusLabel = t('Available', 'পর্যাপ্ত আছে');
                    }

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors whitespace-nowrap">
                        <td className="p-4 pl-6 text-center text-slate-400 font-mono">{item.serial_no}</td>
                        <td className="p-4 text-slate-900">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 font-semibold">
                              <span className="w-2.5 h-2.5 rounded-full border border-slate-350 shrink-0" style={{ backgroundColor: item.color_name_en.toLowerCase().includes('blue') ? '#3b82f6' : item.color_name_en.toLowerCase().includes('red') ? '#ef4444' : item.color_name_en.toLowerCase().includes('green') ? '#10b981' : item.color_name_en.toLowerCase().includes('yellow') ? '#f59e0b' : item.color_name_en.toLowerCase().includes('black') ? '#000000' : item.color_name_en.toLowerCase().includes('white') ? '#ffffff' : '#cbd5e1' }} />
                              <span>{item.color_name_bn ? `${item.color_name_en} (${item.color_name_bn})` : item.color_name_en}</span>
                            </div>
                            <div className="pl-[18px]">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 border border-slate-200 text-slate-600">
                                {formatSize(item.size)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-slate-500">
                          {language === 'en' ? item.category_name_en || '-' : item.category_name_bn || '-'}
                        </td>
                        <td className="p-4 text-right font-mono font-semibold text-slate-800">৳{(item.price ?? 0).toFixed(2)}</td>
                        <td className="p-4 text-right font-mono text-slate-500">{item.initial_stock}</td>
                        <td className="p-4 text-right font-semibold font-mono text-slate-800">{item.current_stock}</td>
                        <td className="p-4 text-right font-mono text-slate-500">{item.minimum_stock}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeClass}`}>
                            {statusLabel}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="p-4 pr-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleOpenEditModal(item)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                title={t('Edit Item', 'সম্পাদনা করুন')}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenDeleteModal(item)}
                                className="p-1.5 text-rose-400 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                                title={t('Delete Item', 'মুছে ফেলুন')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          {/* Pagination Controls */}
          {totalItems > 0 && (
            <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/50">
              <div className="text-slate-500 text-sm text-center sm:text-left">
                {language === 'en' ? (
                  <>
                    Showing <span className="font-semibold text-slate-800">{startIndex + 1}</span> to{' '}
                    <span className="font-semibold text-slate-800">{Math.min(endIndex, totalItems)}</span> of{' '}
                    <span className="font-semibold text-slate-800">{totalItems}</span> items
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-slate-800">{totalItems}</span> টি আইটেমের মধ্যে{' '}
                    <span className="font-semibold text-slate-800">{startIndex + 1}</span> থেকে{' '}
                    <span className="font-semibold text-slate-800">{Math.min(endIndex, totalItems)}</span> দেখানো হচ্ছে
                  </>
                )}
              </div>
              
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer hover:shadow-md active:scale-95"
                  >
                    {t('Previous', 'পূর্ববর্তী')}
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
                      const isActive = pg === currentPage;
                      return (
                        <button
                          key={pg}
                          onClick={() => setCurrentPage(pg)}
                          className={`w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer hover:shadow-sm active:scale-95 ${
                            isActive
                              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                              : 'border border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                          }`}
                        >
                          {pg}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer hover:shadow-md active:scale-95"
                  >
                    {t('Next', 'পরবর্তী')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal: ADD Paint Item */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-250 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-fade-in">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2">
                  <Paintbrush className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-slate-800">{t('Add Paint Item', 'নতুন পেইন্ট যোগ করুন')}</h3>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 p-1 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitAdd(onAddItemSubmit)} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    {t('Color Name (EN)', 'রঙের নাম (ইংরেজি)')}
                  </label>
                  <input
                    type="text"
                    {...registerAdd('colorNameEn')}
                    placeholder="e.g. Signal Red"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                  {errorsAdd.colorNameEn && (
                    <span className="text-red-500 text-xs mt-1 block">{errorsAdd.colorNameEn.message}</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    {t('Color Name (BN) (Optional)', 'রঙের নাম (বাংলা) (ঐচ্ছিক)')}
                  </label>
                  <input
                    type="text"
                    {...registerAdd('colorNameBn')}
                    placeholder="যেমন: সিগন্যাল রেড"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                  {errorsAdd.colorNameBn && (
                    <span className="text-red-500 text-xs mt-1 block">{errorsAdd.colorNameBn.message}</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    {t('Category', 'ক্যাটাগরি')}
                  </label>
                  <div className="relative">
                    <select
                      {...registerAdd('categoryId')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-all cursor-pointer appearance-none"
                    >
                      <option value="">{t('Select Category', 'ক্যাটাগরি নির্বাচন করুন')}</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {t(cat.name_en, cat.name_bn)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {errorsAdd.categoryId && (
                    <span className="text-red-500 text-xs mt-1 block">{errorsAdd.categoryId.message}</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    {t('Size', 'সাইজ')}
                  </label>
                  <div className="relative">
                    <select
                      {...registerAdd('size')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-all cursor-pointer appearance-none"
                    >
                      <option value="">{t('Select Size', 'সাইজ নির্বাচন করুন')}</option>
                      {sizes.map((sz) => (
                        <option key={sz.id} value={sz.name_en}>
                          {t(sz.name_en, sz.name_bn)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {errorsAdd.size && (
                    <span className="text-red-500 text-xs mt-1 block">{errorsAdd.size.message}</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    {t('Initial Stock', 'প্রারম্ভিক স্টক (পরিমাণ)')}
                  </label>
                  <input
                    type="number"
                    {...registerAdd('initialStock', { valueAsNumber: true })}
                    placeholder="e.g. 10"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                  {errorsAdd.initialStock && (
                    <span className="text-red-500 text-xs mt-1 block">{errorsAdd.initialStock.message}</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    {t('Minimum Stock Margin', 'নূন্যতম স্টক সীমা')}
                  </label>
                  <input
                    type="number"
                    {...registerAdd('minimumStock', { valueAsNumber: true })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                  {errorsAdd.minimumStock && (
                    <span className="text-red-500 text-xs mt-1 block">{errorsAdd.minimumStock.message}</span>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-all cursor-pointer"
                  >
                    {t('Cancel', 'বাতিল')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-55"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {t('Add Item', 'পণ্যটি যোগ করুন')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: EDIT Paint Item */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-250 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-fade-in">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-slate-800">{t('Edit Paint Item', 'পেইন্ট পণ্য সম্পাদন')}</h3>
                </div>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedItem(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 p-1 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitEdit(onEditItemSubmit)} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    {t('Color Name (EN)', 'রঙের নাম (ইংরেজি)')}
                  </label>
                  <input
                    type="text"
                    {...registerEdit('colorNameEn')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                  {errorsEdit.colorNameEn && (
                    <span className="text-red-500 text-xs mt-1 block">{errorsEdit.colorNameEn.message}</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    {t('Color Name (BN) (Optional)', 'রঙের নাম (বাংলা) (ঐচ্ছিক)')}
                  </label>
                  <input
                    type="text"
                    {...registerEdit('colorNameBn')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                  {errorsEdit.colorNameBn && (
                    <span className="text-red-500 text-xs mt-1 block">{errorsEdit.colorNameBn.message}</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    {t('Category', 'ক্যাটাগরি')}
                  </label>
                  <div className="relative">
                    <select
                      {...registerEdit('categoryId')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-all cursor-pointer appearance-none"
                    >
                      <option value="">{t('Select Category', 'ক্যাটাগরি নির্বাচন করুন')}</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {t(cat.name_en, cat.name_bn)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {errorsEdit.categoryId && (
                    <span className="text-red-500 text-xs mt-1 block">{errorsEdit.categoryId.message}</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    {t('Size', 'সাইজ')}
                  </label>
                  <div className="relative">
                    <select
                      {...registerEdit('size')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-all cursor-pointer appearance-none"
                    >
                      <option value="">{t('Select Size', 'সাইজ নির্বাচন করুন')}</option>
                      {sizes.map((sz) => (
                        <option key={sz.id} value={sz.name_en}>
                          {t(sz.name_en, sz.name_bn)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {errorsEdit.size && (
                    <span className="text-red-500 text-xs mt-1 block">{errorsEdit.size.message}</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    {t('Minimum Stock Margin', 'নূন্যতম স্টক সীমা')}
                  </label>
                  <input
                    type="number"
                    {...registerEdit('minimumStock', { valueAsNumber: true })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                  {errorsEdit.minimumStock && (
                    <span className="text-red-500 text-xs mt-1 block">{errorsEdit.minimumStock.message}</span>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setSelectedItem(null);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-all cursor-pointer"
                  >
                    {t('Cancel', 'বাতিল')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-55"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {t('Save Changes', 'পরিবর্তন সংরক্ষণ')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: DELETE Paint Item */}
        {isDeleteModalOpen && selectedItem && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-250 w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-fade-in">
              <div className="flex items-center gap-3 px-6 py-5 bg-rose-50 border-b border-rose-100">
                <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{t('Delete Paint Item', 'আইটেম মুছে ফেলুন')}</h3>
                  <p className="text-[11px] text-rose-700/80 font-medium mt-0.5">{t('Warning: Action is irreversible', 'সতর্কতা: এটি বাতিল করা যাবে না')}</p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-slate-600 text-sm leading-relaxed">
                  {t(
                    `Are you sure you want to delete the paint color "${selectedItem.color_name_en}" in size "${selectedItem.size}"? This will also purge all related transaction logs.`,
                    `আপনি কি নিশ্চিত যে আপনি রঙের নাম "${selectedItem.color_name_bn || selectedItem.color_name_en}" এবং সাইজ "${formatSize(selectedItem.size)}" এর এই পেইন্ট পণ্যটি মুছে ফেলতে চান? এর ফলে সংশ্লিষ্ট সকল লেনদেন লগও বাতিল হয়ে যাবে।`
                  )}
                </p>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                      setSelectedItem(null);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-all cursor-pointer"
                  >
                    {t('No, Keep it', 'না, রাখুন')}
                  </button>
                  <button
                    onClick={onDeleteConfirm}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-55"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {t('Yes, Delete', 'হ্যাঁ, মুছুন')}
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