'use client';

import React, { useState, useEffect } from 'react';
import LayoutWrapper from '@/components/layout-wrapper';
import { useApp } from '@/context/AppContext';
import { fetchInventory, recordSale, fetchSizes, fetchTransactionLogs, deleteStockTransaction, updateStockTransaction } from '@/lib/db';
import { InventoryItem, Size, StockTransaction } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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

const stockOutSchema = z.object({
  itemId: z.string().min(1, 'Please select an item / একটি পেইন্ট পণ্য নির্বাচন করুন'),
  quantity: z.number()
    .int('Quantity must be a whole number / পরিমাণ অবশ্যই পূর্ণসংখ্যা হতে হবে')
    .positive('Quantity must be greater than zero / পরিমাণ অবশ্যই ০ এর বেশি হতে হবে'),
  customerName: z.string().min(1, 'Customer name is required / ক্রেতার নাম প্রয়োজন'),
  notes: z.string().max(200, 'Notes cannot exceed 200 characters / অতিরিক্ত নোট ২০০ অক্ষরের বেশি হতে পারবে না').optional(),
});

type StockOutFormValues = z.infer<typeof stockOutSchema>;

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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Custom searchable dropdown states
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');

  // Filter items based on dropdown search input
  const filteredItems = items.filter(item => 
    item.serial_no.toString().includes(dropdownSearch) ||
    item.full_color_name.toLowerCase().includes(dropdownSearch.toLowerCase()) ||
    item.size.toLowerCase().includes(dropdownSearch.toLowerCase())
  );

  const isAdmin = user?.role === 'admin';
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<StockTransaction | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(0);
  const [editCustomerName, setEditCustomerName] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');

  const handleOpenEditModal = (tx: StockTransaction) => {
    setSelectedTransaction(tx);
    setEditQuantity(tx.quantity);
    
    // Parse notes if possible
    const notesStr = tx.notes || '';
    if (notesStr.startsWith('Customer:')) {
      const parts = notesStr.split(' | Notes: ');
      const custName = parts[0].replace('Customer: ', '');
      const noteVal = parts[1] || '';
      setEditCustomerName(custName);
      setEditNotes(noteVal);
    } else {
      setEditCustomerName('');
      setEditNotes(notesStr);
    }
    
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
      let finalNotes = editNotes;
      if (editCustomerName) {
        finalNotes = `Customer: ${editCustomerName}${editNotes ? ` | Notes: ${editNotes}` : ''}`;
      }
      await updateStockTransaction(selectedTransaction.id, editQuantity, finalNotes);
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

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    setValue,
    formState: { errors }
  } = useForm<StockOutFormValues>({
    resolver: zodResolver(stockOutSchema),
    defaultValues: {
      itemId: '',
      quantity: 1,
      customerName: '',
      notes: ''
    }
  });

  const selectedItemId = watch('itemId');
  const saleQuantity = watch('quantity') || 0;
  
  const selectedItemDetails = items.find(i => i.id === selectedItemId);
  const currentStockLimit = selectedItemDetails ? selectedItemDetails.current_stock : 0;
  
  // Calculate total price preview
  const totalPrice = selectedItemDetails ? selectedItemDetails.price * saleQuantity : 0;

  // Pre-fill item selection from search parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const queryItemId = searchParams.get('itemId');
      if (queryItemId && items.length > 0) {
        setValue('itemId', queryItemId);
        setIsModalOpen(true); // Open modal automatically if query param is set
      }
    }
  }, [items, setValue]);

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

  // Load items and transactions on mount
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

  const onSubmit = async (data: StockOutFormValues) => {
    if (!user) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    // 1. Double check client-side stock availability
    if (selectedItemDetails && selectedItemDetails.current_stock < data.quantity) {
      setError('quantity', {
        type: 'manual',
        message: t(
          `Insufficient stock! Max available is ${selectedItemDetails.current_stock}.`,
          `পর্যাপ্ত স্টক নেই! সর্বোচ্চ মজুদ আছে ${selectedItemDetails.current_stock} টি।`
        )
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Package customerName and notes together in the transaction notes column
      const transactionNotes = `Customer: ${data.customerName}${data.notes ? ` | Notes: ${data.notes}` : ''}`;
      
      await recordSale(data.itemId, data.quantity, user.id, transactionNotes);
      
      const itemText = selectedItemDetails 
        ? `${selectedItemDetails.full_color_name} (${selectedItemDetails.size})`
        : '';

      setSuccessMessage(
        t(
          `Successfully sold ${data.quantity} units of "${itemText}" to ${data.customerName}.`,
          `সফলভাবে "${itemText}" এর ${data.quantity} টি ইউনিট ${data.customerName} এর নিকট বিক্রয় করা হয়েছে।`
        )
      );

      reset({ itemId: '', quantity: 1, customerName: '', notes: '' });
      setIsModalOpen(false);

      // Reload items and transaction logs
      await loadItems();
      await loadTransactions();
      setCurrentPage(1);

      // Clear alert after 5s
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to complete sales transaction.');
    } finally {
      setIsSubmitting(false);
    }
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
              <History className="w-8 h-8 text-rose-600" />
              <span>{t('Sales / Stock Out Registry', 'বিক্রয় ও স্টক আউট রেজিস্ট্রি')}</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {t('View audit trails of paint sales and outbound stock. Record a sale via the top-right form.', 'স্টক আউট ও বিক্রয় লেনদেনের সম্পূর্ণ রেকর্ড তালিকা দেখুন। নতুন বিক্রয় নথিভুক্ত করতে মোডাল ফর্ম ব্যবহার করুন।')}
            </p>
          </div>
          <button
            onClick={() => {
              reset({ itemId: '', quantity: 1, customerName: '', notes: '' });
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-rose-650 hover:bg-rose-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer self-start md:self-auto hover:shadow-lg active:scale-95 bg-emerald-600 hover:bg-emerald-500"
          >
            <Plus className="w-5 h-5" />
            <span>{t('Record Sale / Stock Out', 'বিক্রি করুন')}</span>
          </button>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex items-center gap-2.5 animate-fade-in">
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />
            <div>
              <p className="font-semibold">{t('Sale Recorded', 'বিক্রয় নিবন্ধিত হয়েছে')}</p>
              <p className="text-xs text-emerald-600 mt-0.5">{successMessage}</p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2.5 animate-fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            <div>
              <p className="font-semibold">{t('Transaction Failed', 'লেনদেন ব্যর্থ হয়েছে')}</p>
              <p className="text-xs text-red-600 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Outbound Transactions Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {loadingTransactions ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                <p className="text-slate-400 text-sm">{t('Loading sales logs...', 'বিক্রয় ইতিহাস লোড হচ্ছে...')}</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                <Info className="w-12 h-12 text-slate-350" />
                <p className="font-semibold text-slate-650">{t('No sales records found', 'কোন বিক্রয় রেকর্ড পাওয়া যায়নি')}</p>
                <p className="text-xs text-slate-400">{t('Click "Record Sale / Stock Out" to log sales transactions.', 'বিক্রি নিবন্ধন করতে ওপরের বাটনে ক্লিক করুন।')}</p>
              </div>
            ) : (
              <table className="w-full border-collapse text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-550">
                    <th className="p-4 pl-6">{t('Date & Time', 'সময়')}</th>
                    <th className="p-4">{t('Color / Paint', 'রঙের নাম')}</th>
                    <th className="p-4">{t('Size', 'সাইজ')}</th>
                    <th className="p-4 text-right">{t('Quantity Sold', 'বিক্রয় পরিমাণ')}</th>
                    <th className="p-4 text-right">{t('Previous Stock', 'পূর্বের স্টক')}</th>
                    <th className="p-4 text-right">{t('New Stock', 'নতুন স্টক')}</th>
                    <th className="p-4">{t('User', 'অপারেটর')}</th>
                    <th className="p-4">{t('Notes / Customer', 'ক্রেতা ও বিবরণ')}</th>
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
                      <td className="p-4 text-xs text-slate-600 font-mono" title={tx.profile?.name || tx.profile?.email || ''}>
                        {tx.profile?.name || (tx.profile?.email ? tx.profile.email.split('@')[0] : 'N/A')}
                      </td>

                      {/* Notes */}
                      <td className={`p-4 text-xs text-slate-500 italic max-w-[220px] truncate ${!isAdmin ? 'pr-6' : ''}`} title={tx.notes || ''}>
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
                              className="p-1.5 text-rose-400 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
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
              <div className="text-slate-500 text-sm text-center sm:text-left">
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

        {/* Modal: Stock Out Form */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-250 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-fade-in">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-rose-500" />
                  <h3 className="font-bold text-slate-800">{t('Sales Entry Form', 'বিক্রয় এন্ট্রি ফর্ম')}</h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 p-1 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
                {/* Customer Name */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-550 mb-1.5">
                    {t('Customer Name', 'ক্রেতার নাম')}
                  </label>
                  <input
                    type="text"
                    {...register('customerName')}
                    placeholder={t('e.g. John Doe', 'যেমন: আব্দুল করিম')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                  {errors.customerName && (
                    <span className="text-red-500 text-xs mt-1 block">{errors.customerName.message}</span>
                  )}
                </div>

                {/* Paint Item Selection */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-550 mb-1.5">
                    {t('Select Paint Item', 'পেইন্ট পণ্য নির্বাচন করুন')}
                  </label>
                  {loadingItems ? (
                    <div className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl flex items-center px-4">
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

                      {/* Dropdown Menu Overlay & List */}
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
                            {/* Search Input Box */}
                            <div className="p-2 border-b border-slate-100 bg-slate-50">
                              <input
                                type="text"
                                value={dropdownSearch}
                                onChange={(e) => setDropdownSearch(e.target.value)}
                                placeholder={t('Type to search color... (e.g. Red)', 'খুঁজতে টাইপ করুন... (যেমন: লাল)')}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                                autoFocus
                              />
                            </div>

                            {/* Dropdown Items List */}
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
                                          ? 'bg-emerald-100 text-emerald-800' 
                                          : item.current_stock <= 0 
                                            ? 'bg-red-100 text-red-800' 
                                            : 'bg-yellow-100 text-yellow-800'
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
                  {errors.itemId && (
                    <span className="text-red-500 text-xs mt-1 block">{errors.itemId.message}</span>
                  )}
                </div>

                {/* Selected Item Stock Context Box */}
                {selectedItemDetails && (
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-2.5 text-xs text-slate-500 animate-fade-in">
                    <Info className="w-4.5 h-4.5 text-slate-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-700">
                        {t('Current Specifications', 'বর্তমান পণ্যের স্পেসিফিকেশন')}
                      </p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 font-medium mt-1">
                        <div>{t('Color', 'রং')}: <span className="text-slate-800">{selectedItemDetails.full_color_name}</span></div>
                        <div>{t('Size', 'সাইজ')}: <span className="text-slate-800">{formatSize(selectedItemDetails.size)}</span></div>
                        <div>{t('Unit Price', 'ইউনিট মূল্য')}: <span className="text-slate-800">৳{selectedItemDetails.price?.toFixed(2) || '0.00'}</span></div>
                        <div>{t('Available Stock', 'মজুদ পরিমাণ')}: <span className={`font-semibold ${selectedItemDetails.current_stock > selectedItemDetails.minimum_stock ? 'text-emerald-600' : 'text-rose-600'}`}>{selectedItemDetails.current_stock}</span></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quantity Input */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-550 mb-1.5">
                    {t('Quantity to Sell', 'বিক্রয়ের পরিমাণ')}
                  </label>
                  <input
                    type="number"
                    {...register('quantity', { valueAsNumber: true })}
                    placeholder="e.g. 5"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                  />
                  {errors.quantity && (
                    <span className="text-red-500 text-xs mt-1 block">{errors.quantity.message}</span>
                  )}
                </div>

                {/* Sales Invoice Note */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-550 mb-1.5">
                    {t('Additional Notes', 'অতিরিক্ত নোট')}
                  </label>
                  <textarea
                    rows={2}
                    {...register('notes')}
                    placeholder={t('e.g. Project site: Mirpur 12, Phone: 01700000000', 'যেমন: মিরপুর ডিওএইচএস ডেলিভারি, ফোন নম্বর ইত্যাদি')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                  {errors.notes && (
                    <span className="text-red-500 text-xs mt-1 block">{errors.notes.message}</span>
                  )}
                </div>

                {/* Selected Item Stock & Price Preview */}
                {selectedItemDetails && saleQuantity > 0 && (
                  <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center justify-between text-sm animate-fade-in">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4.5 h-4.5 text-emerald-600" />
                      <span className="font-semibold text-slate-700">{t('Total Price Preview', 'মোট আনুমানিক মূল্য')}</span>
                    </div>
                    <span className="font-bold text-emerald-700 font-mono text-base">
                      ৳{totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all cursor-pointer"
                  >
                    {t('Cancel', 'বাতিল')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-55 bg-emerald-600 hover:bg-emerald-500"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('Processing...', 'প্রক্রিয়া হচ্ছে...')}
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4" />
                        {t('Submit Sale', 'বিক্রি নিশ্চিত করুন')}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
                  className="text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 p-1 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={onEditSubmit} className="p-6 space-y-5">
                {/* Paint Item info (read-only) */}
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500">
                  <p className="font-semibold text-slate-700 mb-1">
                    {t('Paint Item Details', 'পেইন্ট পণ্যের বিবরণ')}
                  </p>
                  <p className="font-medium text-slate-800">
                    {selectedTransaction.item?.full_color_name} ({formatSize(selectedTransaction.item?.size || '')})
                  </p>
                </div>

                {/* Customer Name */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-550 mb-1.5">
                    {t('Customer Name', 'ক্রেতার নাম')}
                  </label>
                  <input
                    type="text"
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    placeholder={t('e.g. John Doe', 'যেমন: আব্দুল করিম')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    required
                  />
                </div>

                {/* Quantity Input */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-550 mb-1.5">
                    {t('Quantity', 'পরিমাণ')}
                  </label>
                  <input
                    type="number"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(parseInt(e.target.value) || 0)}
                    placeholder="e.g. 5"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                    required
                    min={1}
                  />
                </div>

                {/* Notes Field */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-550 mb-1.5">
                    {t('Additional Notes', 'অতিরিক্ত নোট')}
                  </label>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder={t('e.g. Project site: Mirpur 12', 'যেমন: মিরপুর ডিওএইচএস ডেলিভারি ইত্যাদি')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
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
                  className="text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 p-1 transition-all cursor-pointer"
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

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500 space-y-1">
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
    </LayoutWrapper>
  );
}

// Helper to keep file imports valid
import { Calculator } from 'lucide-react';
