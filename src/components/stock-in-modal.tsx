'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useApp } from '@/context/AppContext';
import {
  fetchInventory,
  fetchSizes,
  addStock
} from '@/lib/db';
import { InventoryItem, Size, ItemSize } from '@/lib/types';
import { PlusCircle, X, ChevronDown, Loader2, Info } from 'lucide-react';

interface StockInModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedItemId?: string;
  onSuccess?: () => void;
}

interface StockInFormValues {
  itemId: string;
  quantity: number;
  notes: string;
}

export default function StockInModal({ isOpen, onClose, preselectedItemId, onSuccess }: StockInModalProps) {
  const { user, t, language } = useApp();
  const [sizes, setSizes] = useState<Size[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Searchable dropdown states
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<StockInFormValues>({
    defaultValues: {
      itemId: '',
      quantity: 1,
      notes: ''
    }
  });

  const selectedItemId = watch('itemId');
  const selectedItemDetails = items.find(i => i.id === selectedItemId);

  // Format size helper
  const formatSize = (sizeStr: string) => {
    const sizeObj = sizes.find(s => s.name_en === sizeStr || s.name_bn === sizeStr);
    if (!sizeObj) return sizeStr;
    return language === 'en' ? sizeObj.name_en : (sizeObj.name_bn || sizeObj.name_en);
  };

  // Filter items based on dropdown search input
  const filteredItems = items.filter(item => 
    item.serial_no.toString().includes(dropdownSearch) ||
    item.full_color_name.toLowerCase().includes(dropdownSearch.toLowerCase()) ||
    item.size.toLowerCase().includes(dropdownSearch.toLowerCase())
  );

  // Load inventory items and sizes
  useEffect(() => {
    if (!isOpen) return;

    async function loadData() {
      setLoadingItems(true);
      try {
        const [invData, sizesData] = await Promise.all([fetchInventory(), fetchSizes()]);
        // Sort items by color_name
        invData.sort((a, b) => a.color_name.localeCompare(b.color_name));
        setItems(invData);
        setSizes(sizesData);

        // Handle preselection
        if (preselectedItemId) {
          setValue('itemId', preselectedItemId, { shouldValidate: true });
        } else {
          setValue('itemId', '');
        }
      } catch (err) {
        console.error('Failed to load data for StockInModal', err);
      } finally {
        setLoadingItems(false);
      }
    }
    
    loadData();
    reset({
      itemId: preselectedItemId || '',
      quantity: 1,
      notes: ''
    });
    setErrorMessage(null);
    setDropdownOpen(false);
    setDropdownSearch('');
  }, [isOpen, preselectedItemId, setValue, reset]);

  const onSubmit = async (data: StockInFormValues) => {
    if (!user) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await addStock(data.itemId, data.quantity, user.id, data.notes);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record stock entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-fade-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-emerald-650" />
            <h3 className="font-bold text-slate-800 text-lg">{t('Stock Entry Form', 'স্টক ইন এন্ট্রি ফর্ম')}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-650 rounded-lg hover:bg-slate-100 p-1 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 bg-red-50 border border-red-200 text-red-750 text-xs rounded-xl flex items-start gap-2">
            <span className="font-semibold">{t('Error:', 'ত্রুটি:')}</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Paint Item Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-550 mb-1.5">
              {t('Select Paint Item', 'পেইন্ট পণ্য নির্বাচন করুন')}
            </label>
            {loadingItems ? (
              <div className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl flex items-center px-4">
                <Loader2 className="w-4 h-4 text-slate-400 animate-spin mr-2" />
                <span className="text-slate-400 text-xs">{t('Loading available items...', 'পেইন্ট তালিকা লোড হচ্ছে...')}</span>
              </div>
            ) : (
              <div className="relative">
                {/* Dropdown Toggle Button */}
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-left focus:outline-none focus:border-emerald-500 transition-all flex items-center justify-between cursor-pointer"
                >
                  <span className={selectedItemDetails ? "text-slate-800 font-medium" : "text-slate-400"}>
                    {selectedItemDetails 
                      ? `#${selectedItemDetails.serial_no} ${selectedItemDetails.full_color_name} (${formatSize(selectedItemDetails.size)}) - ${t('Current Stock', 'বর্তমান স্টক')}: ${selectedItemDetails.current_stock}`
                      : `-- ${t('Choose Paint Item', 'পেইন্ট পণ্য নির্বাচন করুন')} --`}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                </button>

                {/* Dropdown List */}
                {dropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40 bg-transparent" 
                      onClick={() => {
                        setDropdownOpen(false);
                        setDropdownSearch('');
                      }}
                    />
                    <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-fade-in max-h-64 flex flex-col">
                      <div className="p-2 border-b border-slate-100 bg-slate-50">
                        <input
                          type="text"
                          value={dropdownSearch}
                          onChange={(e) => setDropdownSearch(e.target.value)}
                          placeholder={t('Type to search color...', 'খুঁজতে টাইপ করুন...')}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                          autoFocus
                        />
                      </div>

                      <div className="overflow-y-auto flex-1 divide-y divide-slate-50 max-h-48">
                        {filteredItems.length === 0 ? (
                          <div className="p-3 text-xs text-slate-400 text-center">
                            {t('No matching items found', 'কোন ম্যাচিং পণ্য পাওয়া যায়নি')}
                          </div>
                        ) : (
                          filteredItems.map((item) => {
                            const isSelected = item.id === selectedItemId;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  setValue('itemId', item.id, { shouldValidate: true });
                                  setDropdownOpen(false);
                                  setDropdownSearch('');
                                }}
                                className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                                  isSelected 
                                    ? 'bg-emerald-50 text-emerald-800 font-semibold' 
                                    : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <span>
                                  #{item.serial_no} {item.full_color_name} ({formatSize(item.size)})
                                </span>
                                <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                                  item.current_stock > item.minimum_stock 
                                    ? 'bg-emerald-100 text-emerald-850' 
                                    : item.current_stock <= 0 
                                      ? 'bg-red-100 text-red-850' 
                                      : 'bg-yellow-100 text-yellow-850'
                                }`}>
                                  {t('Stock', 'মজুদ')}: {item.current_stock}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            <input type="hidden" {...register('itemId', { required: t('Select a paint item', 'একটি পেইন্ট পণ্য নির্বাচন করুন') })} />
            {errors.itemId && (
              <span className="text-red-500 text-xs mt-1 block">{errors.itemId.message}</span>
            )}
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-550 mb-1.5">
              {t('Quantity to Add', 'যোগ করার পরিমাণ')}
            </label>
            <input
              type="number"
              {...register('quantity', {
                required: t('Enter quantity', 'পরিমাণ লিখুন'),
                min: { value: 1, message: t('Quantity must be at least 1', 'পরিমাণ কমপক্ষে ১ হতে হবে') },
                valueAsNumber: true
              })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all font-mono"
            />
            {errors.quantity && (
              <span className="text-red-500 text-xs mt-1 block">{errors.quantity.message}</span>
            )}
          </div>

          {/* Vendor / Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-550 mb-1.5">
              {t('Vendor & Purchase Notes', 'ভেন্ডর ও ক্রয়ের বিবরণ')}
            </label>
            <textarea
              {...register('notes')}
              placeholder={t('e.g. Vendor: Berger Paints, Invoice #1234, Batch Code...', 'যেমন: ভেন্ডর - বার্জার পেইন্টস, ইনভয়েস #১২৩৪, ব্যাচ কোড ইত্যাদি')}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all h-20 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-650 text-sm font-semibold py-3 rounded-full transition-all cursor-pointer text-center disabled:opacity-50"
            >
              {t('Cancel', 'বাতিল')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-emerald-600 hover:bg-emerald-505 text-white text-sm font-semibold py-3 rounded-full transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PlusCircle className="w-4 h-4" />
              )}
              <span>{t('Confirm Stock In', 'স্টক ইন নিশ্চিত করুন')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
