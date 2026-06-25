'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useApp } from '@/context/AppContext';
import { Paintbrush, Shield, User, AlertCircle, Loader2 } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required / ইমেইল প্রয়োজন').email('Invalid email / ইমেইল সঠিক নয়'),
  password: z.string().min(1, 'Password is required / পাসওয়ার্ড প্রয়োজন'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, t, language, setLanguage, settings } = useApp();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (role: 'admin' | 'staff') => {
    if (role === 'admin') {
      setValue('email', 'admin@shantohardware.com');
      setValue('password', 'admin123');
    } else {
      setValue('email', 'staff@shantohardware.com');
      setValue('password', 'staff123');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 items-center justify-center p-4">
      {/* Language Toggle in Top Right */}
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
          className="bg-slate-900 border border-slate-800 text-xs px-3 py-1.5 rounded-lg font-medium text-slate-300 hover:text-emerald-400 transition-colors"
        >
          {language === 'en' ? 'বাংলা' : 'English'}
        </button>
      </div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="w-14 h-14 object-contain rounded-xl shadow-lg mb-4" />
          ) : (
            <div className="w-14 h-14 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/30 mb-4">
              <Paintbrush className="w-8 h-8 text-white" />
            </div>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-white text-center">
            {settings ? settings.shop_name : t('Shanto Hardware', 'শান্তর হার্ডওয়্যার')}
          </h1>
          <p className="text-slate-400 text-sm mt-1 text-center">
            {t('Inventory & Sales Management System', 'ইনভেন্টরি এবং সেলস ম্যানেজমেন্ট সিস্টেম')}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{t('Authentication Error', 'অথেন্টিকেশন ত্রুটি')}</p>
              <p className="text-red-300/90 text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              {t('Email Address', 'ইমেইল ঠিকানা')}
            </label>
            <input
              type="email"
              {...register('email')}
              placeholder="e.g. admin@shantohardware.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white placeholder-slate-600 transition-all"
            />
            {errors.email && (
              <span className="text-red-400 text-xs mt-1 block">
                {errors.email.message}
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              {t('Password', 'পাসওয়ার্ড')}
            </label>
            <input
              type="password"
              {...register('password')}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white placeholder-slate-600 transition-all"
            />
            {errors.password && (
              <span className="text-red-400 text-xs mt-1 block">
                {errors.password.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('Logging in...', 'লগইন হচ্ছে...')}
              </>
            ) : (
              t('Sign In', 'সাইন ইন করুন')
            )}
          </button>
        </form>

        {/* Demo Credentials Quick-Select */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 text-center mb-3">
            {t('Quick Demo Access', 'ডেমো লগইন')}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin')}
              className="flex items-center justify-center gap-2 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/60 p-2.5 rounded-xl text-xs font-medium text-slate-300 hover:text-emerald-400 transition-all cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <div className="text-left">
                <p className="font-semibold text-[11px] leading-tight">{t('Admin Portal', 'এডমিন পোর্টাল')}</p>
                <p className="text-[10px] text-slate-500">{t('Full Access', 'পূর্ণ অ্যাক্সেস')}</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('staff')}
              className="flex items-center justify-center gap-2 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/60 p-2.5 rounded-xl text-xs font-medium text-slate-300 hover:text-emerald-400 transition-all cursor-pointer"
            >
              <User className="w-3.5 h-3.5 shrink-0" />
              <div className="text-left">
                <p className="font-semibold text-[11px] leading-tight">{t('Staff Portal', 'স্টাফ পোর্টাল')}</p>
                <p className="text-[10px] text-slate-500">{t('Sales/Stock In', 'বিক্রয়/স্টক ইন')}</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
