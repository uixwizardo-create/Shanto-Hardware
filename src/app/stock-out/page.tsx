'use client';

import React, { useState, useEffect } from 'react';
import LayoutWrapper from '@/components/layout-wrapper';
import StockOutModal from '@/components/stock-out-modal';
import { useApp } from '@/context/AppContext';
import { fetchInventory, fetchSizes, fetchTransactionLogs, deleteStockTransaction, updateStockTransaction } from '@/lib/db';
import { InventoryItem, Size, StockTransaction } from '@/lib/types';
import { 
  ShoppingCart, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Info, 
  FileText, 
  ChevronDown, 
  Plus, 
  X, 
  ArrowDownLeft, 
  Calendar,
  History,
  Edit2,
  Trash2
} from 'lucide-react';

export default function StockOutPage() {
  const { t, user, language } = useApp();
  const [sizes, setSizes] = useState<Size[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Transaction list & modal states
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [preselectedItemId, setPreselectedItemId] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const isAdmin = user?.role === 'admin';
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<StockTransaction | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>('');

  const handleOpenEditModal = (tx: StockTransaction) => {
    setSelectedTransaction(tx);
    setEditQuantity(tx.quantity);
    setEditNotes(tx.notes || '');
    setIsEditModalOpen(true);
  };

  const handleOpenDeleteModal = (tx: StockTransaction) => {
    setSelectedTransaction(tx);
    setIsDeleteModalOpen(true);
  };

  const onEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransaction) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await updateStockTransaction(selectedTransaction.id, editQuantity, editNotes);
      setSuccessMessage(t('Transaction updated successfully.', 'লেনদেন সফলভাবে আপডেট করা হয়েছে।'));
      setIsEditModalOpen(false);
      await loadTransactions();
      await loadItems();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDeleteConfirm = async () => {
    if (!selectedTransaction) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await deleteStockTransaction(selectedTransaction.id);
      setSuccessMessage(t('Transaction deleted successfully.', 'লেনদেন সফলভাবে মুছে ফেলা হয়েছে।'));
      setIsDeleteModalOpen(false);
      await loadTransactions();
      await loadItems();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  // Pre-fill item selection from search parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const queryItemId = searchParams.get('itemId');
      if (queryItemId) {
        setPreselectedItemId(queryItemId);
        setIsModalOpen(true);
      }
    }
  }, []);

  const loadTransactions = async () => {
    setLoadingTransactions(true);
    try {
      const data = await fetchTransactionLogs({ actionType: 'STOCK_OUT' });
      setTransactions(data);
    } catch (err) {
      console.error('Failed to load stock-out transactions', err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const loadItems = async () => {
    try {
      const data = await fetchInventory();
      // Sort items by color_name
      data.sort((a, b) => a.color_name.localeCompare(b.color_name));
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingItems(false);
    }
  };

  // Load inventory items and stock-out transactions
  useEffect(() => {
    loadItems();
    loadTransactions();
  }, []);

  useEffect(() => {
    async function loadSizesData() {
      try {
        const data = await fetchSizes();
        setSizes(data);
      } catch (err) {
        console.error('Failed to load sizes', err);
      }
    }
    loadSizesData();
  }, []);

  const handleSuccess = async () => {
    setSuccessMessage(t('Sale recorded successfully.', 'বিক্রয় সফলভাবে নথিভুক্ত করা হয়েছে।'));
    await loadItems();
    await loadTransactions();
    setCurrentPage(1);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  // Pagination Calculations
  const totalItems = transactions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = transactions.slice(startIndex, endIndex);

  return (
    <LayoutWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <ShoppingCart className="w-8 h-8 text-emerald-650" />
              <span>{t('Sales Registry', 'বিক্রয় রেজিস্ট্রি')}</span>
            </h1>
            <p className="text-slate-550 text-sm mt-1">
              {t('View audit trails of paint sales transactions. Record outbound sales via the top-right form.', 'স্টক আউট বা বিক্রয়ের সম্পূর্ণ রেকর্ড তালিকা দেখুন। নতুন বিক্রয় নথিভুক্ত করতে ওপরের বাটনটি ব্যবহার করুন।')}
            </p>
          </div>
          <button
            onClick={() => {
              setPreselectedItemId(undefined);
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer self-start md:self-auto hover:shadow-lg active:scale-95 animate-fade-in"
          >
            <Plus className="w-5 h-5" />
            <span>{t('Record Paint Sale', 'বিক্রয় এন্ট্রি করুন')}</span>
          </button>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex items-center gap-2.5 animate-fade-in">
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />
            <div>
              <p className="font-semibold">{t('Transaction Completed', 'লেনদেন সম্পন্ন হয়েছে')}</p>
              <p className="text-xs text-emerald-650 mt-0.5">{successMessage}</p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2.5 animate-fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            <div>
              <p className="font-semibold">{t('Transaction Failed', 'লেনদেন ব্যর্থ হয়েছে')}</p>
              <p className="text-xs text-red-650 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Outbound Transactions Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            {loadingTransactions ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                <p className="text-slate-400 text-sm">{t('Loading transaction history...', 'ইতিহাস লোড হচ্ছে...')}</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                <Info className="w-12 h-12 text-slate-350" />
                <p className="font-semibold text-slate-650">{t('No stock-out records found', 'কোন বিক্রয় রেকর্ড পাওয়া যায়নি')}</p>
                <p className="text-xs text-slate-400">{t('Click "Record Paint Sale" to add sales entries.', 'বিক্রয় এন্ট্রি করতে ওপরের বাটনে ক্লিক করুন।')}</p>
              </div>
            ) : (
              <table className="w-full border-collapse text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="p-4 pl-6">{t('Date & Time', 'সময়')}</th>
                    <th className="p-4">{t('Color / Paint', 'রঙের নাম')}</th>
                    <th className="p-4">{t('Size', 'সাইজ')}</th>
                    <th className="p-4 text-right">{t('Quantity Sold', 'বিক্রয়ের পরিমাণ')}</th>
                    <th className="p-4 text-right">{t('Previous Stock', 'পূর্বের স্টক')}</th>
                    <th className="p-4 text-right">{t('New Stock', 'নতুন স্টক')}</th>
                    <th className="p-4">{t('User', 'অপারেটর')}</th>
                    <th className="p-4">{t('Customer & Notes', 'ক্রেতার নাম ও বিবরণ')}</th>
                    {isAdmin && <th className="p-4 pr-6 text-center w-24">{t('Actions', 'অপশন')}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Timestamp */}
                      <td className="p-4 pl-6 text-xs text-slate-400 font-medium">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>

                      {/* Paint Item Details */}
                      <td className="p-4 font-semibold text-slate-800">
                        {tx.item?.full_color_name}
                      </td>

                      {/* Size */}
                      <td className="p-4 text-slate-500">
                        {formatSize(tx.item?.size || '')}
                      </td>

                      {/* Quantity */}
                      <td className="p-4 text-right font-bold font-mono text-rose-600">
                        -{tx.quantity}
                      </td>

                      {/* Previous Stock */}
                      <td className="p-4 text-right font-mono text-slate-400 font-medium">
                        {tx.previous_stock !== null && tx.previous_stock !== undefined ? tx.previous_stock : '-'}
                      </td>

                      {/* New Stock */}
                      <td className="p-4 text-right font-mono font-semibold text-slate-700">
                        {tx.new_stock !== null && tx.new_stock !== undefined ? tx.new_stock : '-'}
                      </td>

                      {/* User Operator */}
                      <td className="p-4 text-xs text-slate-650 font-mono" title={tx.profile?.name || tx.profile?.email || ''}>
                        {tx.profile?.name || (tx.profile?.email ? tx.profile.email.split('@')[0] : 'N/A')}
                      </td>

                      {/* Notes */}
                      <td className="p-4 text-xs text-slate-500 italic max-w-[200px] truncate" title={tx.notes || ''}>
                        {tx.notes || '-'}
                      </td>
                      {isAdmin && (
                        <td className="p-4 pr-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenEditModal(tx)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                              title={t('Edit Log', 'সম্পাদনা')}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenDeleteModal(tx)}
                              className="p-1.5 text-rose-400 hover:text-rose-700 bg-rose-55/60 hover:bg-rose-100 border border-rose-100 rounded-lg transition-colors cursor-pointer"
                              title={t('Delete Log', 'মুছে ফেলুন')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Controls */}
          {totalItems > 0 && (
            <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/50">
              <div className="text-slate-505 text-sm text-center sm:text-left">
                {language === 'en' ? (
                  <>
                    Showing <span className="font-semibold text-slate-800">{startIndex + 1}</span> to{' '}
                    <span className="font-semibold text-slate-800">{Math.min(endIndex, totalItems)}</span> of{' '}
                    <span className="font-semibold text-slate-800">{totalItems}</span> records
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-slate-800">{totalItems}</span> টি রেকর্ডের মধ্যে{' '}
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

        {/* Modal: Edit Transaction */}
        {isEditModalOpen && selectedTransaction && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-250 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-fade-in">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-800">{t('Edit Transaction', 'লেনদেন সংশোধন')}</h3>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-slate-400 hover:text-slate-650 rounded-lg hover:bg-slate-100 p-1 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={onEditSubmit} className="p-6 space-y-5">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500">
                  <p className="font-semibold text-slate-700 mb-1">
                    {t('Paint Item Details', 'পেইন্ট পণ্যের বিবরণ')}
                  </p>
                  <p className="font-medium text-slate-800">
                    {selectedTransaction.item?.full_color_name} ({formatSize(selectedTransaction.item?.size || '')})
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-550 mb-1.5">
                    {t('Quantity', 'পরিমাণ')}
                  </label>
                  <input
                    type="number"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(parseInt(e.target.value) || 0)}
                    placeholder="e.g. 20"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                    required
                    min={1}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-550 mb-1.5">
                    {t('Notes', 'বিবরণ')}
                  </label>
                  <textarea
                    rows={3}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder={t('e.g. Edited quantity due to entry mistake', 'যেমন: টাইপিং ভুলের কারণে পরিমাণ সংশোধন করা হলো')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>

                <div className="pt-4 border-t border-slate-105 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all cursor-pointer"
                  >
                    {t('Cancel', 'বাতিল')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-55"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('Updating...', 'আপডেট হচ্ছে...')}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        {t('Save Changes', 'পরিবর্তন সংরক্ষণ করুন')}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Delete Confirmation */}
        {isDeleteModalOpen && selectedTransaction && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-250 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-fade-in">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-rose-650" />
                  <h3 className="font-bold text-slate-800">{t('Delete Transaction', 'লেনদেন মুছে ফেলুন')}</h3>
                </div>
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="text-slate-400 hover:text-slate-650 rounded-lg hover:bg-slate-100 p-1 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                  <div>
                    <p className="font-semibold">{t('Warning: Critical Operation', 'সতর্কতা: জটিল অপারেশন')}</p>
                    <p className="mt-1">
                      {t('Deleting this transaction will reverse the stock adjustment. Please verify that this action does not result in negative stock.', 'এই লেনদেনটি মুছে ফেললে তা স্টক সমন্বয়কে উল্টে দেবে। অনুগ্রহ করে যাচাই করুন যে এই পদক্ষেপের ফলে বর্তমান মজুদ শূন্যের নিচে নেমে যাবে না।')}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-105 rounded-xl text-xs text-slate-500 space-y-1">
                  <p className="font-semibold text-slate-700 mb-1">{t('Transaction Details', 'লেনদেনের বিবরণ')}</p>
                  <p>
                    {t('Paint Item', 'পেইন্ট পণ্য')}: <span className="text-slate-800 font-semibold">{selectedTransaction.item?.full_color_name} ({formatSize(selectedTransaction.item?.size || '')})</span>
                  </p>
                  <p>
                    {t('Quantity', 'পরিমাণ')}: <span className="text-slate-800 font-semibold">-{selectedTransaction.quantity}</span>
                  </p>
                  <p>
                    {t('Date', 'তারিখ')}: <span className="text-slate-600 font-mono">{new Date(selectedTransaction.created_at).toLocaleString()}</span>
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all cursor-pointer"
                  >
                    {t('Cancel', 'বাতিল')}
                  </button>
                  <button
                    onClick={onDeleteConfirm}
                    disabled={isSubmitting}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-55"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('Deleting...', 'মুছে ফেলা হচ্ছে...')}
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        {t('Delete Permanently', 'স্থায়ীভাবে মুছে ফেলুন')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <StockOutModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setPreselectedItemId(undefined);
        }}
        preselectedItemId={preselectedItemId}
        onSuccess={handleSuccess}
      />
    </LayoutWrapper>
  );
}
