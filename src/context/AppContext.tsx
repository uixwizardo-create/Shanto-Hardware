'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Profile, Settings } from '@/lib/types';
import { loginUser, fetchSettings } from '@/lib/db';

interface AppContextType {
  language: 'en' | 'bn';
  setLanguage: (lang: 'en' | 'bn') => void;
  user: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<Profile>;
  logout: () => void;
  t: (en: string, bn: string) => string;
  settings: Settings | null;
  refreshSettings: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<'en' | 'bn'>('en');
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const refreshSettings = async () => {
    try {
      const data = await fetchSettings();
      setSettings(data);
    } catch (e) {
      console.error('Failed to fetch settings', e);
    }
  };

  useEffect(() => {
    // Load state from localStorage on mount
    const storedLang = localStorage.getItem('shanto_lang') as 'en' | 'bn';
    if (storedLang) {
      setLanguageState(storedLang);
    }
    
    const storedUser = localStorage.getItem('shanto_session');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse user session', e);
      }
    }
    
    // Load settings
    refreshSettings();
    setLoading(false);
  }, []);

  useEffect(() => {
    // Redirect logic
    if (!loading) {
      if (!user && pathname !== '/login') {
        router.push('/login');
      } else if (user && pathname === '/login') {
        router.push('/dashboard');
      }
    }
  }, [user, loading, pathname, router]);

  const setLanguage = (lang: 'en' | 'bn') => {
    setLanguageState(lang);
    localStorage.setItem('shanto_lang', lang);
  };

  const login = async (email: string, password: string) => {
    try {
      const profile = await loginUser(email, password);
      setUser(profile);
      localStorage.setItem('shanto_session', JSON.stringify(profile));
      router.push('/dashboard');
      return profile;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('shanto_session');
    router.push('/login');
  };

  const t = (en: string, bn: string) => {
    return language === 'en' ? en : bn;
  };

  return (
    <AppContext.Provider value={{ language, setLanguage, user, loading, login, logout, t, settings, refreshSettings }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
