'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import LayoutWrapper from '@/components/layout-wrapper';
import { useApp } from '@/context/AppContext';
import { updateSettings } from '@/lib/db';
import { 
  Settings as SettingsIcon, 
  Store, 
  Phone, 
  MapPin, 
  ShieldAlert, 
  Save, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  Upload,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const settingsSchema = z.object({
  shopName: z.string().min(1, 'Shop name is required / দোকানের নাম প্রয়োজন'),
  phone: z.string().min(1, 'Phone is required / ফোন নম্বর প্রয়োজন'),
  address: z.string().min(1, 'Address is required / ঠিকানা প্রয়োজন'),
  defaultMinStock: z.number().min(1, 'Default minimum stock must be at least 1 / নূন্যতম স্টক কমপক্ষে ১ হতে হবে'),
  logoUrl: z.string().nullable().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const PREDEFINED_LOGOS = [
  { name: 'Default Brush / ডিফল্ট তুলি', url: '' },
  { name: 'Emerald Gear / সবুজ গিয়ার', url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=100&auto=format&fit=crop' },
  { name: 'Hardware Shop / হার্ডওয়্যার শপ', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=100&auto=format&fit=crop' },
  { name: 'Paint Palette / পেইন্ট প্যালেট', url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=100&auto=format&fit=crop' }
];

export default function SettingsPage() {
  const { t, settings, refreshSettings, user } = useApp();
  const router = useRouter();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === 'admin';

  // Staff হলে dashboard এ redirect করো
  useEffect(() => {
    if (user && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [user, isAdmin, router]);

  // Admin না হলে কিছু render করো না
  if (!user || !isAdmin) return null;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
  });

  const logoUrlValue = watch('logoUrl');

  // Load current settings into form
  useEffect(() => {
    if (settings) {
      reset({
        shopName: settings.shop_name,
        phone: settings.phone,
        address: settings.address,
        defaultMinStock: settings.default_min_stock,
        logoUrl: settings.logo_url || '',
      });
    }
  }, [settings, reset]);

  const onSubmit = async (data: SettingsFormValues) => {
    if (!isAdmin) return;
    setIsSubmitting(true);
    setSuccess(null);
    setError(null);
    try {
      await updateSettings({
        shop_name: data.shopName,
        phone: data.phone,
        address: data.address,
        default_min_stock: data.defaultMinStock,
        logo_url: data.logoUrl || null,
      });
      await refreshSettings();
      setSuccess(t('Settings updated successfully!', 'দোকান সেটিংস সফলভাবে আপডেট করা হয়েছে!'));
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setError(t('Failed to update settings. Please try again.', 'সেটিংস আপডেট করতে ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectPredefinedLogo = (url: string) => {
    if (!isAdmin) return;
    setValue('logoUrl', url);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size limit (under 1.5MB for Base64 storage)
    if (file.size > 1.5 * 1024 * 1024) {
      alert(t('File size must be under 1.5MB to save.', 'ফাইল সাইজ ১.৫ মেগাবাইটের নিচে হতে হবে।'));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setValue('logoUrl', base64);
    };
    reader.readAsDataURL(file);
  };

  const handleClearLogo = () => {
    if (!isAdmin) return;
    setValue('logoUrl', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <LayoutWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <SettingsIcon className="w-7 h-7 text-emerald-500 shrink-0" />
            <span>{t('Shop Settings', 'দোকান সেটিংস')}</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {t('Manage shop configuration, contact info, branding name and default reorder rules.', 'দোকানের নাম, লোগো, ফোন নম্বর, ঠিকানা এবং নূন্যতম রিঅর্ডার স্টক মার্জিন সেট করুন।')}
          </p>
        </div>

        {/* Status Alerts */}
        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex items-center gap-2 animate-fade-in">
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2 animate-fade-in">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Staff Warning Banner */}
        {!isAdmin && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs md:text-sm flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{t('Staff Read-Only Access', 'শুধুমাত্র দেখার অনুমতি (স্টাফ)')}</p>
              <p className="text-slate-600 mt-0.5">
                {t('You do not have administrative privileges to edit shop settings. Only Admin users can modify these fields.', 'আপনার দোকান সেটিংস পরিবর্তন করার এডমিন অনুমতি নেই। শুধুমাত্র এডমিন ব্যবহারকারীরা এই তথ্য পরিবর্তন করতে পারবেন।')}
              </p>
            </div>
          </div>
        )}

        {/* Main Settings Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <form onSubmit={handleSubmit(onSubmit)} className="divide-y divide-slate-100">
            {/* Form Fields */}
            <div className="p-6 md:p-8 space-y-6">
              {/* Section 1: Shop Branding */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Store className="w-4 h-4 text-emerald-500" />
                  <span>{t('Shop Branding / তথ্য', 'দোকানের ব্র্যান্ডিং ও নাম')}</span>
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                  {/* Shop Name */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      {t('Shop Name', 'দোকানের নাম')}
                    </label>
                    <input
                      type="text"
                      disabled={!isAdmin}
                      {...register('shopName')}
                      placeholder={t('e.g. Shanto Hardware', 'যেমন: Shanto Hardware')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs md:text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                    />
                    {errors.shopName && (
                      <span className="text-red-500 text-xs mt-1 block">{errors.shopName.message}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 2: Logo Selection & Upload */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <ImageIcon className="w-4 h-4 text-emerald-500" />
                  <span>{t('Shop Logo Settings', 'লোগো কনফিগারেশন')}</span>
                </h3>
                
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row gap-5 items-start">
                    {/* Preview Logo */}
                    <div className="flex flex-col items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-5 shrink-0 w-32 h-32 justify-center shadow-sm">
                      {logoUrlValue ? (
                        <img 
                          src={logoUrlValue} 
                          alt="Logo Preview" 
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                          className="w-20 h-20 object-contain rounded-xl bg-white p-1 border border-slate-100" 
                        />
                      ) : (
                        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
                          <Store className="w-8 h-8" />
                        </div>
                      )}
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        {t('Logo / লোগো', 'লোগো')}
                      </span>
                    </div>

                    {/* Logo Control Options */}
                    <div className="flex-1 space-y-3.5 w-full">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                          {t('Upload Logo Image', 'লোগো ইমেজ আপলোড করুন')}
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            disabled={!isAdmin}
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                          <button
                            type="button"
                            disabled={!isAdmin}
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 hover:border-emerald-350 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Upload className="w-4 h-4" />
                            <span>{t('Choose Image File', 'ফাইল সিলেক্ট করুন')}</span>
                          </button>
                          
                          {logoUrlValue && isAdmin && (
                            <button
                              type="button"
                              onClick={handleClearLogo}
                              className="flex items-center gap-2 bg-rose-50 border border-rose-200 hover:bg-rose-100 hover:border-rose-350 text-rose-700 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>{t('Clear Logo', 'লোগো মুছুন')}</span>
                            </button>
                          )}
                        </div>
                        <span className="block text-[10px] text-slate-400 mt-1.5">
                          {t('Supports PNG, JPG, GIF (Max size: 1.5MB)', 'পিএনজি, জেপিজি, জিআইএফ ফাইল সমর্থন করে (সর্বোচ্চ সাইজ: ১.৫ মেগাবাইট)')}
                        </span>
                      </div>

                      {/* Custom Logo URL fallback input */}
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          {t('Or Enter Image Web URL', 'অথবা লোগোর ওয়েব লিঙ্ক (URL) দিন')}
                        </label>
                        <input
                          type="text"
                          disabled={!isAdmin}
                          {...register('logoUrl')}
                          placeholder="https://example.com/logo.png"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-emerald-500 disabled:opacity-60 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Predefined Logo Options */}
                  {isAdmin && (
                    <div className="border-t border-slate-100 pt-3">
                      <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                        {t('Choose Predefined Logo Template', 'ডিফল্ট টেমপ্লেট থেকে লোগো সিলেক্ট করুন')}
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {PREDEFINED_LOGOS.map((logo) => {
                          const isSelected = logoUrlValue === logo.url || (!logoUrlValue && logo.url === '');
                          return (
                            <button
                              key={logo.name}
                              type="button"
                              onClick={() => handleSelectPredefinedLogo(logo.url)}
                              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-emerald-50/60 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500' 
                                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              {logo.url ? (
                                <img src={logo.url} alt="logo" className="w-8 h-8 rounded-lg object-cover shrink-0 border border-slate-200" />
                              ) : (
                                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                                  <Store className="w-4.5 h-4.5" />
                                </div>
                              )}
                              <span className="text-xs font-semibold truncate">{t(logo.name.split(' / ')[0], logo.name.split(' / ')[1] || logo.name)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Contact & Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Phone className="w-4 h-4 text-emerald-500" />
                  <span>{t('Contact & Logistics / কন্টাক্ট তথ্য', 'যোগাযোগ ও লজিস্টিকস')}</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      {t('Contact Phone', 'ফোন নম্বর')}
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        disabled={!isAdmin}
                        {...register('phone')}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs md:text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                      />
                    </div>
                    {errors.phone && (
                      <span className="text-red-500 text-xs mt-1 block">{errors.phone.message}</span>
                    )}
                  </div>

                  {/* Address */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      {t('Shop Address', 'ঠিকানা')}
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        disabled={!isAdmin}
                        {...register('address')}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs md:text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                      />
                    </div>
                    {errors.address && (
                      <span className="text-red-500 text-xs mt-1 block">{errors.address.message}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Default Safety stock */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      {t('Default Safety Stock Threshold', 'ডিফল্ট সতর্কতা স্টক সীমা')}
                    </label>
                    <input
                      type="number"
                      disabled={!isAdmin}
                      {...register('defaultMinStock', { valueAsNumber: true })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs md:text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                    />
                    {errors.defaultMinStock && (
                      <span className="text-red-500 text-xs mt-1 block">{errors.defaultMinStock.message}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions (Only for Admin) */}
            {isAdmin && (
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs md:text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-55"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{t('Save Changes', 'পরিবর্তন সংরক্ষণ')}</span>
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </LayoutWrapper>
  );
}
