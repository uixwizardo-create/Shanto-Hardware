'use client';

import React, { useState, useEffect } from 'react';
import LayoutWrapper from '@/components/layout-wrapper';
import { useApp } from '@/context/AppContext';
import { fetchCategories, addCategory, deleteCategory, updateCategory } from '@/lib/db';
import { Category } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Tags,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  CheckCircle,
  Loader2,
  X,
  Info
} from 'lucide-react';

const categorySchema = z.object({
  nameEn: z.string().min(1, 'Category name (English) is required / ক্যাটাগরি নাম (ইংরেজি) প্রয়োজন'),
  nameBn: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export default function CategoryPage() {
  const { t, user, language } = useApp();
  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff';

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load categories
  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (err: any) {
      console.error(err);
      setError(t('Failed to load categories.', 'ক্যাটাগরি লোড করতে ব্যর্থ হয়েছে।'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // React Hook Form for Adding Categories
  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    reset: resetAdd,
    formState: { errors: errorsAdd }
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      nameEn: '',
      nameBn: ''
    }
  });

  // React Hook Form for Editing Categories
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    setValue: setValueEdit,
    formState: { errors: errorsEdit }
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      nameEn: '',
      nameBn: ''
    }
  });

  // Modal open handlers
  const handleOpenAddModal = () => {
    if (!isAdmin) return;
    resetAdd();
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (cat: Category) => {
    if (!isAdmin) return;
    setCategoryToEdit(cat);
    setValueEdit('nameEn', cat.name_en);
    setValueEdit('nameBn', cat.name_bn === cat.name_en ? '' : cat.name_bn);
    setIsEditModalOpen(true);
  };

  const handleOpenDeleteModal = (cat: Category) => {
    if (!isAdmin) return;
    setCategoryToDelete(cat);
    setDeleteModalOpen(true);
  };

  // Submit handlers
  const onAddCategorySubmit = async (data: CategoryFormValues) => {
    if (!isAdmin) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await addCategory(data.nameEn, data.nameBn);
      setSuccessMsg(t('Category added successfully.', 'ক্যাটাগরি সফলভাবে যোগ করা হয়েছে।'));
      resetAdd();
      setIsAddModalOpen(false);
      loadCategories();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to add category.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onEditCategorySubmit = async (data: CategoryFormValues) => {
    if (!isAdmin || !categoryToEdit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await updateCategory(categoryToEdit.id, data.nameEn, data.nameBn);
      setSuccessMsg(t('Category updated successfully.', 'ক্যাটাগরি সফলভাবে আপডেট করা হয়েছে।'));
      resetEdit();
      setIsEditModalOpen(false);
      setCategoryToEdit(null);
      loadCategories();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update category.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDeleteConfirm = async () => {
    if (!isAdmin || !categoryToDelete) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await deleteCategory(categoryToDelete.id);
      setSuccessMsg(t('Category deleted successfully.', 'ক্যাটাগরি সফলভাবে মুছে ফেলা হয়েছে।'));
      setDeleteModalOpen(false);
      setCategoryToDelete(null);
      loadCategories();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete category. Make sure no items belong to it.');
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
              <Tags className="w-8 h-8 text-emerald-600" />
              <span>{t('Category Management', 'ক্যাটাগরি ব্যবস্থাপনা')}</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {t('Manage paint categories. Color classifications are helpful for sorting stock items.', 'পেইন্ট ক্যাটাগরি বা বিভাগসমূহ পরিচালনা করুন। স্টক পণ্য সাজানোর জন্য ক্যাটাগরি ব্যবহার করা হয়।')}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={handleOpenAddModal}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer self-start md:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>{t('Add Category', 'ক্যাটাগরি যোগ করুন')}</span>
            </button>
          )}
        </div>

        {/* Warning Banner for Staff */}
        {isStaff && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-850 text-sm flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
            <span className="font-medium">{t('Staff Read-Only Access', 'স্টাফ রিড-অনলি অ্যাক্সেস')}</span>
          </div>
        )}

        {/* Success/Error Alerts */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-750 text-sm flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-705 text-sm flex items-center gap-2">
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Categories List (Full Width Table) */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden w-full">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                <p className="text-slate-400 text-sm">{t('Loading categories...', 'ক্যাটাগরি লোড হচ্ছে...')}</p>
              </div>
            ) : categories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                <Info className="w-12 h-12 text-slate-350" />
                <p className="font-semibold text-slate-650">{t('No categories found', 'কোন ক্যাটাগরি পাওয়া যায়নি')}</p>
              </div>
            ) : (
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                    <th className="p-4 pl-6 w-20 text-center">{t('#', 'ক্রমিক নং')}</th>
                    <th className="p-4">{t('English Name', 'ইংরেজি নাম')}</th>
                    <th className="p-4">{t('Bangla Name', 'বাংলা নাম')}</th>
                    {isAdmin && <th className="p-4 pr-6 text-center w-32">{t('Actions', 'অপশন')}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {categories.map((cat, index) => (
                    <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors whitespace-nowrap">
                      <td className="p-4 pl-6 text-center text-slate-400 font-mono">{index + 1}</td>
                      <td className="p-4 font-semibold text-slate-900">{cat.name_en}</td>
                      <td className="p-4 text-slate-500">{cat.name_bn === cat.name_en ? '-' : cat.name_bn}</td>
                      {isAdmin && (
                        <td className="p-4 pr-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenEditModal(cat)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                              title={t('Edit Category', 'সম্পাদনা করুন')}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenDeleteModal(cat)}
                              className="p-1.5 text-rose-500 hover:text-rose-705 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                              title={t('Delete Category', 'ক্যাটাগরি মুছুন')}
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
        </div>

        {/* Modal: ADD Category */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white border border-slate-250 w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2">
                  <Tags className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-slate-800 text-lg">
                    {t('Add New Category', 'নতুন ক্যাটাগরি যোগ করুন')}
                  </h3>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 p-1 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitAdd(onAddCategorySubmit)} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-750 mb-1.5">
                    {t('Category Name (English)', 'ক্যাটাগরি নাম (ইংরেজি)')}
                  </label>
                  <input
                    type="text"
                    {...registerAdd('nameEn')}
                    placeholder="e.g. Plastic Paint"
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                  {errorsAdd.nameEn && (
                    <span className="text-red-500 text-xs mt-1 block">{errorsAdd.nameEn.message}</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-750 mb-1.5">
                    {t('Category Name (Bangla) - Optional', 'ক্যাটাগরি নাম (বাংলা) - ঐচ্ছিক')}
                  </label>
                  <input
                    type="text"
                    {...registerAdd('nameBn')}
                    placeholder="যেমন: প্লাস্টিক পেইন্ট"
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                  {errorsAdd.nameBn && (
                    <span className="text-red-500 text-xs mt-1 block">{errorsAdd.nameBn.message}</span>
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
                    <span>{t('Add Category', '+ ক্যাটাগরি যোগ করুন')}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: EDIT Category */}
        {isEditModalOpen && categoryToEdit && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white border border-slate-250 w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-slate-800 text-lg">
                    {t('Edit Category', 'ক্যাটাগরি সম্পাদনা করুন')}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setCategoryToEdit(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 p-1 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitEdit(onEditCategorySubmit)} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-750 mb-1.5">
                    {t('Category Name (English)', 'ক্যাটাগরি নাম (ইংরেজি)')}
                  </label>
                  <input
                    type="text"
                    {...registerEdit('nameEn')}
                    placeholder="e.g. Plastic Paint"
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                  {errorsEdit.nameEn && (
                    <span className="text-red-500 text-xs mt-1 block">{errorsEdit.nameEn.message}</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-750 mb-1.5">
                    {t('Category Name (Bangla) - Optional', 'ক্যাটাগরি নাম (বাংলা) - ঐচ্ছিক')}
                  </label>
                  <input
                    type="text"
                    {...registerEdit('nameBn')}
                    placeholder="যেমন: প্লাস্টিক পেইন্ট"
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                  {errorsEdit.nameBn && (
                    <span className="text-red-500 text-xs mt-1 block">{errorsEdit.nameBn.message}</span>
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
                    <span>{t('Save Changes', 'পরিবর্তন সংরক্ষণ করুন')}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && categoryToDelete && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-255 w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-fade-in">
              <div className="flex items-center gap-3 px-6 py-5 bg-rose-50 border-b border-rose-100">
                <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{t('Delete Category', 'ক্যাটাগরি মুছে ফেলুন')}</h3>
                  <p className="text-[11px] text-rose-700/80 font-medium mt-0.5">{t('Warning: Action is irreversible', 'সতর্কতা: এটি বাতিল করা যাবে না')}</p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-slate-600 text-sm leading-relaxed">
                  {t(
                    `Are you sure you want to delete the category "${categoryToDelete.name_en}"? Make sure no stock items are currently assigned to this category.`,
                    `আপনি কি নিশ্চিত যে আপনি "${categoryToDelete.name_bn}" ক্যাটাগরি মুছে ফেলতে চান? নিশ্চিত করুন যে এই ক্যাটাগরির অধীনে কোনো স্টক পণ্য বর্তমানে নেই।`
                  )}
                </p>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteModalOpen(false);
                      setCategoryToDelete(null);
                    }}
                    className="px-4 py-2 bg-slate-105 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-all cursor-pointer"
                  >
                    {t('Cancel', 'বাতিল')}
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
