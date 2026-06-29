import { createClient } from '@supabase/supabase-js';
import { 
  InventoryItem, 
  StockTransaction, 
  DashboardSummary, 
  Profile, 
  UserRole, 
  ItemSize, 
  InventoryFilter, 
  ReportFilter,
  ActionType,
  TransactionType,
  Settings,
  Category,
  Size
} from './types';

// Load Supabase environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Suppress console warnings if credentials are empty in development mode
export const isDemoMode = !supabaseUrl || !supabaseAnonKey;

// Initialize Supabase client if credentials exist
export const supabase = isDemoMode 
  ? null 
  : createClient(supabaseUrl, supabaseAnonKey);

/**
 * Standard Paint Prices based on size to compute Dashboard Summary Sales Revenue and maintain compatibility
 */
const SIZE_PRICES: Record<ItemSize, number> = {
  'Gallon': 45.00,
  '2 Pound (.91L)': 25.00,
  'Half Liter (4.55)': 15.00,
  'Half Pound (200ML)': 8.00
};

/**
 * English to Bengali translation map for seeded colors
 */
const COLOR_TRANSLATIONS: Record<string, string> = {
  'Signal Red': 'সিগন্যাল রেড',
  'Royal Blue': 'রয়্যাল ব্লু',
  'Forest Green': 'ফরেস্ট গ্রিন',
  'Canary Yellow': 'ক্যানারি ইয়োলো',
  'Charcoal Black': 'চারকোল ব্ল্যাক',
  'Pure White': 'পিওর হোয়াইট',
  'Slate Gray': 'স্লেট গ্রে',
  'Walnut Brown': 'ওয়ালনাট ব্রাউন',
  'Ocean Teal': 'ওশান টিল',
  'Coral Pink': 'কোরাল পিঙ্ক',
  'Mustard Gold': 'মাস্টার্ড গোল্ড',
  'Lavender Mist': 'ল্যাভেন্ডার মিস্ট',
  'Crimson Red': 'ক্রিমসন রেড',
  'Olive Drab': 'অলিভ ড্র্যাব',
  'Sky Blue': 'স্কাই ব্লু'
};

/**
 * ----------------------------------------------------
 * BACKWARD COMPATIBILITY FIELD MAPPERS
 * ----------------------------------------------------
 */

function mapInventoryItem(item: any): InventoryItem {
  const min_stock = item.minimum_stock ?? item.min_stock ?? 5;
  const size = item.size as ItemSize;
  const price = SIZE_PRICES[size] || 10.00;
  
  return {
    ...item,
    color_name: item.full_color_name || item.color_name_en || item.color_name,
    min_stock,
    price,
    current_stock: item.current_stock ?? 0,
    total_stock_in: item.total_stock_in ?? 0,
    total_stock_out: item.total_stock_out ?? 0,
    total_adjustments: item.total_adjustments ?? 0,
    status: (item.current_stock ?? 0) <= 0
      ? 'Out of Stock'
      : (item.current_stock ?? 0) < min_stock
        ? 'Reorder'
        : 'Available'
  };
}

function mapStockTransaction(t: any): StockTransaction {
  const action_type = t.action_type || (t.transaction_type === 'IN' ? 'STOCK_IN' : t.transaction_type === 'OUT' ? 'STOCK_OUT' : 'ADJUSTMENT');
  const transaction_type = (action_type === 'STOCK_IN' ? 'IN' : action_type === 'STOCK_OUT' ? 'OUT' : 'ADJUSTMENT') as TransactionType;
  
  let item = undefined;
  if (t.item) {
    const size = t.item.size as ItemSize;
    const price = SIZE_PRICES[size] || 10.00;
    item = {
      ...t.item,
      color_name: t.item.full_color_name || t.item.color_name_en || t.item.color_name,
      price
    };
  } else if (t.color && t.size) {
    // Fallback for system import logs or legacy formats
    item = {
      color_name_en: t.color,
      color_name_bn: t.color,
      full_color_name: t.color,
      size: t.size as any,
      color_name: t.color,
      price: 0
    };
  }

  return {
    ...t,
    action_type,
    transaction_type,
    item,
    profile: t.profile || null
  };
}

/**
 * ----------------------------------------------------
 * LOCAL STORAGE (DEMO MODE) HELPERS
 * ----------------------------------------------------
 */

function getLocalData<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
}

function setLocalData<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

/**
 * Initialize Demo Data in localStorage
 */
export function initializeDemoData(force = false) {
  if (typeof window === 'undefined') return;

  let shouldForce = force;
  if (!shouldForce) {
    const existing = localStorage.getItem('shanto_inventory');
    if (!existing) {
      shouldForce = true;
    }
  }

  if (shouldForce) {
    localStorage.removeItem('shanto_profiles');
    localStorage.removeItem('shanto_categories');
    localStorage.removeItem('shanto_sizes');
    localStorage.removeItem('shanto_inventory');
    localStorage.removeItem('shanto_transactions');
  }

  // Seed Categories
  if (!localStorage.getItem('shanto_categories')) {
    const defaultCategories: Category[] = [
      { id: '22222222-2222-2222-2222-000000000001', name_en: 'Plastic Paint', name_bn: 'প্লাস্টিক পেইন্ট', created_at: new Date().toISOString() },
      { id: '22222222-2222-2222-2222-000000000002', name_en: 'Enamel', name_bn: 'ইনামেল', created_at: new Date().toISOString() },
      { id: '22222222-2222-2222-2222-000000000003', name_en: 'Primer', name_bn: 'প্রাইমার', created_at: new Date().toISOString() },
      { id: '22222222-2222-2222-2222-000000000004', name_en: 'Wall Putty', name_bn: 'ওয়াল পুটি', created_at: new Date().toISOString() },
      { id: '22222222-2222-2222-2222-000000000005', name_en: 'Exterior/Weather Coat', name_bn: 'এক্সটেরিয়র/ওয়েদার কোট', created_at: new Date().toISOString() },
      { id: '22222222-2222-2222-2222-000000000006', name_en: 'Distemper', name_bn: 'ডিস্টেম্পার', created_at: new Date().toISOString() }
    ];
    setLocalData('shanto_categories', defaultCategories);
  }

  // Seed Sizes
  if (!localStorage.getItem('shanto_sizes')) {
    const defaultSizes: Size[] = [
      { id: '33333333-3333-3333-3333-000000000001', name_en: 'Gallon', name_bn: 'গ্যালন', created_at: new Date().toISOString() },
      { id: '33333333-3333-3333-3333-000000000002', name_en: '2 Pound (.91L)', name_bn: '২ পাউন্ড (.৯১ লি.)', created_at: new Date().toISOString() },
      { id: '33333333-3333-3333-3333-000000000003', name_en: 'Half Liter (4.55)', name_bn: 'হাফ লিটার (৪.৫৫)', created_at: new Date().toISOString() },
      { id: '33333333-3333-3333-3333-000000000004', name_en: 'Half Pound (200ML)', name_bn: 'হাফ পাউন্ড (২০০ মিলি)', created_at: new Date().toISOString() }
    ];
    setLocalData('shanto_sizes', defaultSizes);
  }

  // 1. Seed Profiles
  if (!localStorage.getItem('shanto_profiles')) {
    const defaultProfiles: Profile[] = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'admin@shantohardware.com',
        name: 'Admin User',
        role: 'admin',
        created_at: new Date().toISOString()
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        email: 'staff@shantohardware.com',
        name: 'Staff User',
        role: 'staff',
        created_at: new Date().toISOString()
      }
    ];
    setLocalData('shanto_profiles', defaultProfiles);
  }

  // 2. Seed Inventory (57 items from Excel)
  if (!localStorage.getItem('shanto_inventory')) {
    const items = [
  {
    "id": "11111111-1111-1111-1111-000000000001",
    "serial_no": 1,
    "color_name_bn": "হলুদ",
    "color_name_en": "Yellow",
    "full_color_name": "হলুদ (Yellow)",
    "size": "Gallon",
    "initial_stock": 1,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000002",
    "serial_no": 2,
    "color_name_bn": "নেভি ব্লু",
    "color_name_en": "Navy Blue",
    "full_color_name": "নেভি ব্লু (Navy Blue)",
    "size": "Gallon",
    "initial_stock": 2,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000003",
    "serial_no": 3,
    "color_name_bn": "সিএনজি গ্রিন",
    "color_name_en": "CNG Green",
    "full_color_name": "সিএনজি গ্রিন (CNG Green)",
    "size": "Gallon",
    "initial_stock": 3,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000004",
    "serial_no": 4,
    "color_name_bn": "স্মোক গ্রে",
    "color_name_en": "Smoke Grey",
    "full_color_name": "স্মোক গ্রে (Smoke Grey)",
    "size": "Gallon",
    "initial_stock": 4,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000005",
    "serial_no": 5,
    "color_name_bn": "সাদা",
    "color_name_en": "White",
    "full_color_name": "সাদা (White)",
    "size": "Gallon",
    "initial_stock": 2,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000006",
    "serial_no": 6,
    "color_name_bn": "ট্যাঞ্জারিন",
    "color_name_en": "Tangerine",
    "full_color_name": "ট্যাঞ্জারিন (Tangerine)",
    "size": "Gallon",
    "initial_stock": 5,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000007",
    "serial_no": 7,
    "color_name_bn": "কাঠালি",
    "color_name_en": "Kathali",
    "full_color_name": "কাঠালি (Kathali)",
    "size": "Gallon",
    "initial_stock": 4,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000008",
    "serial_no": 8,
    "color_name_bn": "টার্কিশ",
    "color_name_en": "Turkish",
    "full_color_name": "টার্কিশ (Turkish)",
    "size": "Gallon",
    "initial_stock": 3,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000009",
    "serial_no": 9,
    "color_name_bn": "কালো",
    "color_name_en": "Black",
    "full_color_name": "কালো (Black)",
    "size": "Gallon",
    "initial_stock": 7,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000010",
    "serial_no": 10,
    "color_name_bn": "রেইনবো রেড অক্সাইড প্রাইমার",
    "color_name_en": "Rainbow Red Oxide Primer",
    "full_color_name": "রেইনবো রেড অক্সাইড প্রাইমার (Rainbow Red Oxide Primer)",
    "size": "Gallon",
    "initial_stock": 4,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000011",
    "serial_no": 11,
    "color_name_bn": "মেরিন রেড অক্সাইড প্রাইমার",
    "color_name_en": "Marine Red Oxide Primer",
    "full_color_name": "মেরিন রেড অক্সাইড প্রাইমার (Marine Red Oxide Primer)",
    "size": "Gallon",
    "initial_stock": 5,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000012",
    "serial_no": 12,
    "color_name_bn": "লাল",
    "color_name_en": "Red",
    "full_color_name": "লাল (Red)",
    "size": "Gallon",
    "initial_stock": 4,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000013",
    "serial_no": 13,
    "color_name_bn": "সিলভার",
    "color_name_en": "Silver",
    "full_color_name": "সিলভার (Silver)",
    "size": "2 Pound (.91L)",
    "initial_stock": 20,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000014",
    "serial_no": 14,
    "color_name_bn": "স্মোক গ্রে",
    "color_name_en": "Smoke Grey",
    "full_color_name": "স্মোক গ্রে (Smoke Grey)",
    "size": "2 Pound (.91L)",
    "initial_stock": 24,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000015",
    "serial_no": 15,
    "color_name_bn": "সাদা",
    "color_name_en": "White",
    "full_color_name": "সাদা (White)",
    "size": "2 Pound (.91L)",
    "initial_stock": 5,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000016",
    "serial_no": 16,
    "color_name_bn": "অফ হোয়াইট",
    "color_name_en": "Off White",
    "full_color_name": "অফ হোয়াইট (Off White)",
    "size": "2 Pound (.91L)",
    "initial_stock": 8,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000017",
    "serial_no": 17,
    "color_name_bn": "নেভি ব্লু",
    "color_name_en": "Navy Blue",
    "full_color_name": "নেভি ব্লু (Navy Blue)",
    "size": "2 Pound (.91L)",
    "initial_stock": 16,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000018",
    "serial_no": 18,
    "color_name_bn": "হলুদ",
    "color_name_en": "Yellow",
    "full_color_name": "হলুদ (Yellow)",
    "size": "2 Pound (.91L)",
    "initial_stock": 20,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000019",
    "serial_no": 19,
    "color_name_bn": "লাল",
    "color_name_en": "Red",
    "full_color_name": "লাল (Red)",
    "size": "2 Pound (.91L)",
    "initial_stock": 21,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000020",
    "serial_no": 20,
    "color_name_bn": "রেইনবো রেড অক্সাইড প্রাইমার",
    "color_name_en": "Rainbow Red Oxide Primer",
    "full_color_name": "রেইনবো রেড অক্সাইড প্রাইমার (Rainbow Red Oxide Primer)",
    "size": "2 Pound (.91L)",
    "initial_stock": 6,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000021",
    "serial_no": 21,
    "color_name_bn": "মেরিন রেড অক্সাইড প্রাইমার",
    "color_name_en": "Marine Red Oxide Primer",
    "full_color_name": "মেরিন রেড অক্সাইড প্রাইমার (Marine Red Oxide Primer)",
    "size": "2 Pound (.91L)",
    "initial_stock": 27,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000022",
    "serial_no": 22,
    "color_name_bn": "রেড অক্সাইড",
    "color_name_en": "Red Oxide",
    "full_color_name": "রেড অক্সাইড (Red Oxide)",
    "size": "2 Pound (.91L)",
    "initial_stock": 24,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000023",
    "serial_no": 23,
    "color_name_bn": "ব্লু",
    "color_name_en": "Blue",
    "full_color_name": "ব্লু (Blue)",
    "size": "2 Pound (.91L)",
    "initial_stock": 40,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000024",
    "serial_no": 24,
    "color_name_bn": "কাঠালি",
    "color_name_en": "Kathali",
    "full_color_name": "কাঠালি (Kathali)",
    "size": "2 Pound (.91L)",
    "initial_stock": 49,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000025",
    "serial_no": 25,
    "color_name_bn": "চকোলেট",
    "color_name_en": "Chocolate",
    "full_color_name": "চকোলেট (Chocolate)",
    "size": "2 Pound (.91L)",
    "initial_stock": 19,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000026",
    "serial_no": 26,
    "color_name_bn": "কালো",
    "color_name_en": "Black",
    "full_color_name": "কালো (Black)",
    "size": "2 Pound (.91L)",
    "initial_stock": 12,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000027",
    "serial_no": 27,
    "color_name_bn": "ক্রিম",
    "color_name_en": "Cream",
    "full_color_name": "ক্রিম (Cream)",
    "size": "2 Pound (.91L)",
    "initial_stock": 8,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000028",
    "serial_no": 28,
    "color_name_bn": "সিএমজি গ্রিন",
    "color_name_en": "CMG Green",
    "full_color_name": "সিএমজি গ্রিন (CMG Green)",
    "size": "2 Pound (.91L)",
    "initial_stock": 33,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000029",
    "serial_no": 29,
    "color_name_bn": "টার্কিশ",
    "color_name_en": "Turkish",
    "full_color_name": "টার্কিশ (Turkish)",
    "size": "2 Pound (.91L)",
    "initial_stock": 39,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000030",
    "serial_no": 30,
    "color_name_bn": "হলুদ",
    "color_name_en": "Yellow",
    "full_color_name": "হলুদ (Yellow)",
    "size": "Half Liter (4.55)",
    "initial_stock": 11,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000031",
    "serial_no": 31,
    "color_name_bn": "সিএনজি গ্রিন",
    "color_name_en": "CNG Green",
    "full_color_name": "সিএনজি গ্রিন (CNG Green)",
    "size": "Half Liter (4.55)",
    "initial_stock": 15,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000032",
    "serial_no": 32,
    "color_name_bn": "সাদা",
    "color_name_en": "White",
    "full_color_name": "সাদা (White)",
    "size": "Half Liter (4.55)",
    "initial_stock": 27,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000033",
    "serial_no": 33,
    "color_name_bn": "অফ হোয়াইট",
    "color_name_en": "Off White",
    "full_color_name": "অফ হোয়াইট (Off White)",
    "size": "Half Liter (4.55)",
    "initial_stock": 5,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000034",
    "serial_no": 34,
    "color_name_bn": "ক্রিম",
    "color_name_en": "Cream",
    "full_color_name": "ক্রিম (Cream)",
    "size": "Half Liter (4.55)",
    "initial_stock": 14,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000035",
    "serial_no": 35,
    "color_name_bn": "লাল",
    "color_name_en": "Red",
    "full_color_name": "লাল (Red)",
    "size": "Half Liter (4.55)",
    "initial_stock": 34,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000036",
    "serial_no": 36,
    "color_name_bn": "মেরিন রেড অক্সাইড প্রাইমার",
    "color_name_en": "Marine Red Oxide Primer",
    "full_color_name": "মেরিন রেড অক্সাইড প্রাইমার (Marine Red Oxide Primer)",
    "size": "Half Liter (4.55)",
    "initial_stock": 37,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000037",
    "serial_no": 37,
    "color_name_bn": "রেড অক্সাইড",
    "color_name_en": "Red Oxide",
    "full_color_name": "রেড অক্সাইড (Red Oxide)",
    "size": "Half Liter (4.55)",
    "initial_stock": 14,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000038",
    "serial_no": 38,
    "color_name_bn": "স্মোক গ্রে",
    "color_name_en": "Smoke Grey",
    "full_color_name": "স্মোক গ্রে (Smoke Grey)",
    "size": "Half Liter (4.55)",
    "initial_stock": 13,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000039",
    "serial_no": 39,
    "color_name_bn": "টার্কিশ",
    "color_name_en": "Turkish",
    "full_color_name": "টার্কিশ (Turkish)",
    "size": "Half Liter (4.55)",
    "initial_stock": 50,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000040",
    "serial_no": 40,
    "color_name_bn": "কাঠালি",
    "color_name_en": "Kathali",
    "full_color_name": "কাঠালি (Kathali)",
    "size": "Half Liter (4.55)",
    "initial_stock": 58,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000041",
    "serial_no": 41,
    "color_name_bn": "কালো",
    "color_name_en": "Black",
    "full_color_name": "কালো (Black)",
    "size": "Half Liter (4.55)",
    "initial_stock": 37,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000042",
    "serial_no": 42,
    "color_name_bn": "চকোলেট",
    "color_name_en": "Chocolate",
    "full_color_name": "চকোলেট (Chocolate)",
    "size": "Half Liter (4.55)",
    "initial_stock": 31,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000043",
    "serial_no": 43,
    "color_name_bn": "ব্লু",
    "color_name_en": "Blue",
    "full_color_name": "ব্লু (Blue)",
    "size": "Half Liter (4.55)",
    "initial_stock": 44,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000044",
    "serial_no": 44,
    "color_name_bn": "হলুদ",
    "color_name_en": "Yellow",
    "full_color_name": "হলুদ (Yellow)",
    "size": "Half Pound (200ML)",
    "initial_stock": 18,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000045",
    "serial_no": 45,
    "color_name_bn": "গ্রিন",
    "color_name_en": "Green",
    "full_color_name": "গ্রিন (Green)",
    "size": "Half Pound (200ML)",
    "initial_stock": 7,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000046",
    "serial_no": 46,
    "color_name_bn": "সাদা",
    "color_name_en": "White",
    "full_color_name": "সাদা (White)",
    "size": "Half Pound (200ML)",
    "initial_stock": 21,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000047",
    "serial_no": 47,
    "color_name_bn": "অফ হোয়াইট",
    "color_name_en": "Off White",
    "full_color_name": "অফ হোয়াইট (Off White)",
    "size": "Half Pound (200ML)",
    "initial_stock": 21,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000048",
    "serial_no": 48,
    "color_name_bn": "ক্রিম",
    "color_name_en": "Cream",
    "full_color_name": "ক্রিম (Cream)",
    "size": "Half Pound (200ML)",
    "initial_stock": 18,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000049",
    "serial_no": 49,
    "color_name_bn": "লাল",
    "color_name_en": "Red",
    "full_color_name": "লাল (Red)",
    "size": "Half Pound (200ML)",
    "initial_stock": 34,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000050",
    "serial_no": 50,
    "color_name_bn": "রেড অক্সাইড",
    "color_name_en": "Red Oxide",
    "full_color_name": "রেড অক্সাইড (Red Oxide)",
    "size": "Half Pound (200ML)",
    "initial_stock": 58,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000051",
    "serial_no": 51,
    "color_name_bn": "স্মোক গ্রে",
    "color_name_en": "Smoke Grey",
    "full_color_name": "স্মোক গ্রে (Smoke Grey)",
    "size": "Half Pound (200ML)",
    "initial_stock": 23,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000052",
    "serial_no": 52,
    "color_name_bn": "টার্কিশ",
    "color_name_en": "Turkish",
    "full_color_name": "টার্কিশ (Turkish)",
    "size": "Half Pound (200ML)",
    "initial_stock": 33,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000053",
    "serial_no": 53,
    "color_name_bn": "কাঠালি",
    "color_name_en": "Kathali",
    "full_color_name": "কাঠালি (Kathali)",
    "size": "Half Pound (200ML)",
    "initial_stock": 48,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000054",
    "serial_no": 54,
    "color_name_bn": "কালো",
    "color_name_en": "Black",
    "full_color_name": "কালো (Black)",
    "size": "Half Pound (200ML)",
    "initial_stock": 28,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000055",
    "serial_no": 55,
    "color_name_bn": "চকোলেট",
    "color_name_en": "Chocolate",
    "full_color_name": "চকোলেট (Chocolate)",
    "size": "Half Pound (200ML)",
    "initial_stock": 55,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000056",
    "serial_no": 56,
    "color_name_bn": "ব্লু",
    "color_name_en": "Blue",
    "full_color_name": "ব্লু (Blue)",
    "size": "Half Pound (200ML)",
    "initial_stock": 34,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  },
  {
    "id": "11111111-1111-1111-1111-000000000057",
    "serial_no": 57,
    "color_name_bn": "নেভি ব্লু",
    "color_name_en": "Navy Blue",
    "full_color_name": "নেভি ব্লু (Navy Blue)",
    "size": "Half Pound (200ML)",
    "initial_stock": 25,
    "minimum_stock": 5,
    "notes": "",
    "category_id": "22222222-2222-2222-2222-000000000002"
  }
];
    setLocalData('shanto_inventory', items);
  }

  // 3. Seed Initial Transactions
  if (!localStorage.getItem('shanto_transactions')) {
    const transactions = [
  {
    "id": "tx-init-1000000",
    "inventory_item_id": "system-import",
    "action_type": "STOCK_IN",
    "quantity": 0,
    "previous_stock": 0,
    "new_stock": 0,
    "notes": "Excel থেকে ৫৭টি product import করা হয়েছে. Initial import - shanto_data.json",
    "created_by": "00000000-0000-0000-0000-000000000001",
    "created_at": "2026-06-20T05:51:17.233Z",
    "transaction_type": "IN",
    "color": "System",
    "size": "সব Size"
  }
];
    setLocalData('shanto_transactions', transactions);
  }

  // 4. Force Enamel category migration on all existing stock items
  const existingInventory = localStorage.getItem('shanto_inventory');
  if (existingInventory) {
    try {
      const items = JSON.parse(existingInventory);
      if (Array.isArray(items)) {
        let migrated = false;
        const enamelId = '22222222-2222-2222-2222-000000000002';
        const updated = items.map(item => {
          if (item.category_id !== enamelId) {
            migrated = true;
            return { ...item, category_id: enamelId };
          }
          return item;
        });
        if (migrated) {
          setLocalData('shanto_inventory', updated);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }
}

function getLocalInventoryItems(): InventoryItem[] {
  initializeDemoData();
  const items = getLocalData<Omit<InventoryItem, 'current_stock' | 'total_stock_in' | 'total_stock_out' | 'total_adjustments' | 'status' | 'color_name' | 'min_stock' | 'price'>[]>('shanto_inventory', []);
  const transactions = getLocalData<StockTransaction[]>('shanto_transactions', []);
  const categories = getLocalData<Category[]>('shanto_categories', []);
  
  return items.map((item, index) => {
    const itemTransactions = transactions.filter(t => t.inventory_item_id === item.id);
    
    let total_stock_in = 0;
    let total_stock_out = 0;
    let total_adjustments = 0;
    
    itemTransactions.forEach(t => {
      if (t.action_type === 'STOCK_IN') {
        total_stock_in += t.quantity;
      } else if (t.action_type === 'STOCK_OUT') {
        total_stock_out += t.quantity;
      } else if (t.action_type === 'ADJUSTMENT') {
        total_adjustments += t.quantity;
      }
    });
    
    const current_stock = item.initial_stock + total_stock_in - total_stock_out + total_adjustments;
    
    let status: 'Out of Stock' | 'Reorder' | 'Available' = 'Available';
    if (current_stock <= 0) {
      status = 'Out of Stock';
    } else if (current_stock < item.minimum_stock) {
      status = 'Reorder';
    }
    
    const category = categories.find(c => c.id === item.category_id);
    
    return mapInventoryItem({
      ...item,
      serial_no: item.serial_no || (index + 1),
      current_stock,
      total_stock_in,
      total_stock_out,
      total_adjustments,
      category_id: item.category_id || null,
      category_name_en: category ? category.name_en : undefined,
      category_name_bn: category ? category.name_bn : undefined,
      status
    });
  });
}

/**
 * Populates transaction with related item and profile data for Demo Mode lists
 */
function populateLocalTransaction(t: StockTransaction): StockTransaction {
  const items = getLocalData<any[]>('shanto_inventory', []);
  const profiles = getLocalData<Profile[]>('shanto_profiles', []);
  
  const item = items.find(i => i.id === t.inventory_item_id);
  const profile = profiles.find(p => p.id === t.created_by);
  
  return {
    ...t,
    item: item ? { 
      color_name_en: item.color_name_en, 
      color_name_bn: item.color_name_bn, 
      full_color_name: item.full_color_name, 
      size: item.size,
      color_name: item.full_color_name,
      price: SIZE_PRICES[item.size as ItemSize] || 10.00
    } : undefined,
    profile: profile ? { email: profile.email, name: profile.name, role: profile.role } : null
  };
}

/**
 * Inserts a transaction in Demo Mode and updates localStorage
 * Simulates SQL trigger: enforces no negative stock and snapshots previous/new stock
 */
function insertLocalTransaction(
  itemId: string, 
  actionType: ActionType, 
  quantity: number, 
  userId: string | null, 
  notes: string | null
): StockTransaction {
  const items = getLocalData<any[]>('shanto_inventory', []);
  const item = items.find(i => i.id === itemId);
  if (!item) throw new Error('Inventory item not found.');

  const transactions = getLocalData<StockTransaction[]>('shanto_transactions', []);
  
  // Calculate current stock before this transaction
  const itemTransactions = transactions.filter(t => t.inventory_item_id === itemId);
  let total_stock_in = 0;
  let total_stock_out = 0;
  let total_adjustments = 0;
  
  itemTransactions.forEach(t => {
    if (t.action_type === 'STOCK_IN') {
      total_stock_in += t.quantity;
    } else if (t.action_type === 'STOCK_OUT') {
      total_stock_out += t.quantity;
    } else if (t.action_type === 'ADJUSTMENT') {
      total_adjustments += t.quantity;
    }
  });
  
  const prev_stock = item.initial_stock + total_stock_in - total_stock_out + total_adjustments;
  
  let stock_change = 0;
  if (actionType === 'STOCK_IN') {
    stock_change = quantity;
  } else if (actionType === 'STOCK_OUT') {
    stock_change = -quantity;
  } else if (actionType === 'ADJUSTMENT') {
    stock_change = quantity;
  }
  
  const net_new_stock = prev_stock + stock_change;
  
  if (net_new_stock < 0) {
    throw new Error(`Insufficient stock. Available: ${prev_stock}, requested change: ${stock_change}`);
  }
  
  const newTx: StockTransaction = {
    id: 'tx-' + Math.random().toString(36).substr(2, 9),
    inventory_item_id: itemId,
    action_type: actionType,
    quantity,
    previous_stock: prev_stock,
    new_stock: net_new_stock,
    notes: notes || null,
    created_by: userId,
    created_at: new Date().toISOString(),
    transaction_type: actionType === 'STOCK_IN' ? 'IN' : actionType === 'STOCK_OUT' ? 'OUT' : 'ADJUSTMENT'
  };
  
  transactions.push(newTx);
  setLocalData('shanto_transactions', transactions);
  return populateLocalTransaction(newTx);
}

/**
 * ----------------------------------------------------
 * EXPORTED DATA ACCESS LAYER FUNCTIONS
 * ----------------------------------------------------
 */

/**
 * Returns configuration status of Supabase
 */
export function isSupabaseConfigured(): boolean {
  return !isDemoMode;
}

/**
 * Reset Demo Data in localStorage
 */
export function resetDemoDatabase(): void {
  initializeDemoData(true);
}

/**
 * 1. Fetch Inventory with optional filters
 */
export async function fetchInventory(filters?: InventoryFilter): Promise<InventoryItem[]> {
  if (isDemoMode) {
    initializeDemoData();
    let items = getLocalInventoryItems().sort((a, b) => b.serial_no - a.serial_no);
    
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      items = items.filter(item => 
        item.color_name_en.toLowerCase().includes(searchLower) ||
        item.color_name_bn.toLowerCase().includes(searchLower) ||
        item.full_color_name.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters?.size) {
      items = items.filter(item => item.size === filters.size);
    }
    
    if (filters?.status && filters.status !== 'all') {
      items = items.filter(item => item.status === filters.status);
    }

    if (filters?.categoryId && filters.categoryId !== 'all') {
      items = items.filter(item => item.category_id === filters.categoryId);
    }
    
    return items;
  } else {
    // Ensure all items are assigned to Enamel in Supabase
    supabase!
      .from('inventory_items')
      .update({ category_id: '22222222-2222-2222-2222-000000000002' })
      .not('category_id', 'eq', '22222222-2222-2222-2222-000000000002')
      .then(({ error }) => {
        if (error) console.error('Error migrating category in Supabase:', error);
      });

    let query = supabase!
      .from('inventory_current_stock_view')
      .select('*')
      .order('serial_no', { ascending: false });
    
    if (filters?.search) {
      query = query.or(`color_name_en.ilike.%${filters.search}%,color_name_bn.ilike.%${filters.search}%,full_color_name.ilike.%${filters.search}%`);
    }
    
    if (filters?.size) {
      query = query.eq('size', filters.size);
    }
    
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.categoryId && filters.categoryId !== 'all') {
      query = query.eq('category_id', filters.categoryId);
    }
    
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching inventory from Supabase:', error);
      throw error;
    }
    
    return (data as any[]).map(mapInventoryItem);
  }
}

/**
 * 2. Add Stock (Stock In)
 */
export async function addStock(
  itemId: string, 
  quantity: number, 
  userId: string, 
  notes?: string
): Promise<StockTransaction> {
  if (quantity <= 0) {
    throw new Error('Quantity must be greater than zero.');
  }

  if (isDemoMode) {
    return insertLocalTransaction(itemId, 'STOCK_IN', quantity, userId, notes || null);
  } else {
    const { data, error } = await supabase!
      .from('stock_transactions')
      .insert({
        inventory_item_id: itemId,
        action_type: 'STOCK_IN',
        quantity,
        created_by: userId,
        notes: notes || null
      })
      .select(`
        id,
        inventory_item_id,
        action_type,
        quantity,
        previous_stock,
        new_stock,
        notes,
        created_by,
        created_at,
        item:inventory_items(color_name_en, color_name_bn, full_color_name, size),
        profile:profiles(email, name, role)
      `)
      .single();

    if (error) {
      console.error('Error adding stock in Supabase:', error);
      throw error;
    }
    return mapStockTransaction(data);
  }
}

/**
 * 3. Record Sale (Stock Out)
 */
export async function recordSale(
  itemId: string, 
  quantity: number, 
  userId: string, 
  notes?: string
): Promise<StockTransaction> {
  if (quantity <= 0) {
    throw new Error('Quantity must be greater than zero.');
  }

  if (isDemoMode) {
    return insertLocalTransaction(itemId, 'STOCK_OUT', quantity, userId, notes || null);
  } else {
    const { data, error } = await supabase!
      .from('stock_transactions')
      .insert({
        inventory_item_id: itemId,
        action_type: 'STOCK_OUT',
        quantity,
        created_by: userId,
        notes: notes || null
      })
      .select(`
        id,
        inventory_item_id,
        action_type,
        quantity,
        previous_stock,
        new_stock,
        notes,
        created_by,
        created_at,
        item:inventory_items(color_name_en, color_name_bn, full_color_name, size),
        profile:profiles(email, name, role)
      `)
      .single();

    if (error) {
      console.error('Error recording sale in Supabase:', error);
      if (error.message && error.message.includes('Insufficient stock')) {
        throw new Error(error.message);
      }
      throw new Error(error.message || 'Failed to record sale due to database constraint.');
    }
    return mapStockTransaction(data);
  }
}

/**
 * 4. Record Adjustment
 */
export async function recordAdjustment(
  itemId: string, 
  quantity: number, 
  userId: string, 
  notes?: string
): Promise<StockTransaction> {
  if (quantity === 0) {
    throw new Error('Adjustment quantity cannot be zero.');
  }

  if (isDemoMode) {
    return insertLocalTransaction(itemId, 'ADJUSTMENT', quantity, userId, notes || null);
  } else {
    const { data, error } = await supabase!
      .from('stock_transactions')
      .insert({
        inventory_item_id: itemId,
        action_type: 'ADJUSTMENT',
        quantity,
        created_by: userId,
        notes: notes || null
      })
      .select(`
        id,
        inventory_item_id,
        action_type,
        quantity,
        previous_stock,
        new_stock,
        notes,
        created_by,
        created_at,
        item:inventory_items(color_name_en, color_name_bn, full_color_name, size),
        profile:profiles(email, name, role)
      `)
      .single();

    if (error) {
      console.error('Error recording adjustment in Supabase:', error);
      if (error.message && error.message.includes('Insufficient stock')) {
        throw new Error(error.message);
      }
      throw new Error(error.message || 'Failed to record adjustment.');
    }
    return mapStockTransaction(data);
  }
}

/**
 * 5. Fetch Transaction Logs with optional filtering
 */
export async function fetchTransactionLogs(filters?: ReportFilter): Promise<StockTransaction[]> {
  if (isDemoMode) {
    initializeDemoData();
    const transactions = getLocalData<StockTransaction[]>('shanto_transactions', []);
    let populated = transactions.map(t => populateLocalTransaction(t));

    // Apply Filter Criteria
    if (filters?.startDate) {
      populated = populated.filter(t => t.created_at >= filters.startDate!);
    }
    if (filters?.endDate) {
      const rawEnd = filters.endDate;
      const endStr = rawEnd.includes('T') ? rawEnd : `${rawEnd}T23:59:59.999Z`;
      populated = populated.filter(t => t.created_at <= endStr);
    }
    if (filters?.actionType) {
      populated = populated.filter(t => t.action_type === filters.actionType);
    }
    if (filters?.colorName) {
      const search = filters.colorName.toLowerCase();
      populated = populated.filter(t => {
        if (!t.item) return false;
        return (
          t.item.color_name_en?.toLowerCase().includes(search) ||
          t.item.color_name_bn?.toLowerCase().includes(search) ||
          t.item.full_color_name?.toLowerCase().includes(search)
        );
      });
    }
    if (filters?.size) {
      populated = populated.filter(t => t.item && t.item.size === filters.size);
    }

    // Sort chronologically desc
    populated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return populated.map(mapStockTransaction);
  } else {
    let query = supabase!
      .from('stock_transactions')
      .select(`
        id,
        inventory_item_id,
        action_type,
        quantity,
        previous_stock,
        new_stock,
        notes,
        created_by,
        created_at,
        item:inventory_items!inner(color_name_en, color_name_bn, full_color_name, size),
        profile:profiles(email, name, role)
      `)
      .order('created_at', { ascending: false });

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters?.endDate) {
      const rawEnd = filters.endDate;
      const endStr = rawEnd.includes('T') ? rawEnd : `${rawEnd}T23:59:59.999Z`;
      query = query.lte('created_at', endStr);
    }
    if (filters?.actionType) {
      query = query.eq('action_type', filters.actionType);
    }
    if (filters?.colorName) {
      query = query.or(`color_name_en.ilike.%${filters.colorName}%,color_name_bn.ilike.%${filters.colorName}%,full_color_name.ilike.%${filters.colorName}%`, { foreignTable: 'inventory_items' });
    }
    if (filters?.size) {
      query = query.eq('inventory_items.size', filters.size);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching transactions from Supabase:', error);
      throw error;
    }
    return (data as any[]).map(mapStockTransaction);
  }
}

/**
 * 6. Get Dashboard Summary Metrics
 */
export async function getDashboardSummaryMetrics(): Promise<DashboardSummary> {
  if (isDemoMode) {
    initializeDemoData();
    const items = getLocalInventoryItems();
    const transactions = getLocalData<StockTransaction[]>('shanto_transactions', []);
    
    const totalItems = items.length;
    const totalStock = items.reduce((sum, item) => sum + item.current_stock, 0);
    const lowStockCount = items.filter(item => item.status === 'Reorder' || item.status === 'Out of Stock').length;

    // Filter OUT transactions
    const outTxs = transactions.filter(t => t.action_type === 'STOCK_OUT');
    const totalSalesCount = outTxs.length;
    
    const totalSalesValue = outTxs.reduce((sum, t) => {
      const it = items.find(i => i.id === t.inventory_item_id);
      const price = it ? SIZE_PRICES[it.size] : 10.00;
      return sum + (t.quantity * price);
    }, 0);

    const inTxs = transactions.filter(t => t.action_type === 'STOCK_IN');
    const totalStockInCount = inTxs.reduce((sum, t) => sum + t.quantity, 0);

    return {
      totalItems,
      totalStock,
      lowStockCount,
      totalSalesCount,
      totalSalesValue,
      totalStockInCount
    };
  } else {
    // 1. Get total items count
    const { count: totalItems, error: err1 } = await supabase!
      .from('inventory_items')
      .select('*', { count: 'exact', head: true });
    
    if (err1) throw err1;

    // 2. Fetch inventory items to aggregate total stock and low stock count
    const { data: stockData, error: err2 } = await supabase!
      .from('inventory_current_stock_view')
      .select('current_stock, minimum_stock');
    
    if (err2) throw err2;

    const totalStock = stockData.reduce((sum, item) => sum + (item.current_stock || 0), 0);
    const lowStockCount = stockData.filter(item => (item.current_stock || 0) < (item.minimum_stock ?? 5)).length;

    // 3. Fetch sales transactions to compute sales count and value
    const { data: salesData, error: err3 } = await supabase!
      .from('stock_transactions')
      .select('quantity, item:inventory_items(size)')
      .eq('action_type', 'STOCK_OUT');

    if (err3) throw err3;

    const totalSalesCount = salesData.length;
    const totalSalesValue = (salesData as unknown as { quantity: number; item: { size: string } | null }[]).reduce((sum, t) => {
      const size = (t.item?.size || 'Gallon') as ItemSize;
      const price = SIZE_PRICES[size] || 10.00;
      return sum + (t.quantity * price);
    }, 0);

    // 4. Fetch stock in transactions total quantity
    const { data: inData, error: err4 } = await supabase!
      .from('stock_transactions')
      .select('quantity')
      .eq('action_type', 'STOCK_IN');

    if (err4) throw err4;

    const totalStockInCount = inData.reduce((sum, t) => sum + t.quantity, 0);

    return {
      totalItems: totalItems || 0,
      totalStock,
      lowStockCount,
      totalSalesCount,
      totalSalesValue,
      totalStockInCount
    };
  }
}

/**
 * 7. Fetch Reports
 */
export async function fetchReports(filters?: ReportFilter): Promise<{
  transactions: StockTransaction[];
  summary: {
    salesCount: number;
    salesValue: number;
    stockInCount: number;
    lowStockCount: number;
  };
}> {
  const transactions = await fetchTransactionLogs(filters);
  
  let lowStockCount = 0;
  if (isDemoMode) {
    const items = getLocalInventoryItems();
    lowStockCount = items.filter(item => (item.current_stock ?? 0) < (item.min_stock ?? 5)).length;
  } else {
    const { data, error } = await supabase!
      .from('inventory_current_stock_view')
      .select('current_stock, minimum_stock');
    if (!error && data) {
      lowStockCount = data.filter(item => (item.current_stock || 0) < (item.minimum_stock ?? 5)).length;
    }
  }

  const sales = transactions.filter(t => t.action_type === 'STOCK_OUT');
  const salesCount = sales.length;
  const salesValue = sales.reduce((sum, t) => {
    const size = t.item?.size || 'Gallon';
    const price = SIZE_PRICES[size] || 10.00;
    return sum + (t.quantity * price);
  }, 0);
  
  const stockIns = transactions.filter(t => t.action_type === 'STOCK_IN');
  const stockInCount = stockIns.reduce((sum, t) => sum + t.quantity, 0);

  return {
    transactions,
    summary: {
      salesCount,
      salesValue,
      stockInCount,
      lowStockCount
    }
  };
}

/**
 * ----------------------------------------------------
 * INVENTORY CRUD FUNCTIONS
 * ----------------------------------------------------
 */

export async function addInventoryItem(
  colorName: string, 
  size: ItemSize, 
  minStock: number, 
  price: number,
  categoryId?: string,
  initialStock: number = 0,
  userId?: string
): Promise<InventoryItem> {
  const finalCategoryId = categoryId || '22222222-2222-2222-2222-000000000002';
  let en = colorName;
  let bn = COLOR_TRANSLATIONS[colorName] || '';
  if (colorName.includes('(') && colorName.endsWith(')')) {
    const parts = colorName.slice(0, -1).split(' (');
    if (parts.length === 2) {
      en = parts[0];
      bn = parts[1];
    }
  }
  const full = bn ? `${en} (${bn})` : en;

  if (isDemoMode) {
    initializeDemoData();
    const items = getLocalData<any[]>('shanto_inventory', []);
    
    // Check duplicate
    const exists = items.some(i => i.color_name_en.toLowerCase() === en.toLowerCase() && i.size === size);
    if (exists) {
      throw new Error(`Inventory item for color "${en}" in size "${size}" already exists.`);
    }

    const newItem = {
      id: 'item-' + Math.random().toString(36).substr(2, 9),
      serial_no: items.length + 1,
      color_name_en: en,
      color_name_bn: bn || '',
      full_color_name: full,
      size,
      initial_stock: 0,
      minimum_stock: minStock,
      notes: `Added via inventory manager. Price set to ৳${price}.`,
      category_id: finalCategoryId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    items.push(newItem);
    setLocalData('shanto_inventory', items);

    if (initialStock > 0) {
      insertLocalTransaction(newItem.id, 'STOCK_IN', initialStock, userId || 'admin-id', 'Initial stock setup / প্রারম্ভিক স্টক সেটআপ');
    }
    
    const updatedList = getLocalInventoryItems();
    const updatedItem = updatedList.find(i => i.id === newItem.id)!;
    return updatedItem;
  } else {
    // Check duplicate
    const { data: existing } = await supabase!
      .from('inventory_items')
      .select('id')
      .eq('color_name_en', en)
      .eq('size', size)
      .maybeSingle();

    if (existing) {
      throw new Error(`Inventory item for color "${en}" in size "${size}" already exists.`);
    }

    const { data, error } = await supabase!
      .from('inventory_items')
      .insert({
        color_name_en: en,
        color_name_bn: bn || '',
        full_color_name: full,
        size,
        minimum_stock: minStock,
        initial_stock: 0,
        notes: `Added via inventory manager. Price set to ৳${price}.`,
        category_id: finalCategoryId
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding inventory item in Supabase:', error);
      throw error;
    }

    if (initialStock > 0) {
      const { error: txError } = await supabase!
        .from('stock_transactions')
        .insert({
          inventory_item_id: data.id,
          action_type: 'STOCK_IN',
          quantity: initialStock,
          created_by: userId || null,
          notes: 'Initial stock setup / প্রারম্ভিক স্টক সেটআপ'
        });
      if (txError) {
        console.error('Error adding initial transaction in Supabase:', txError);
      }
    }

    const { data: viewItem, error: viewError } = await supabase!
      .from('inventory_current_stock_view')
      .select('*')
      .eq('id', data.id)
      .single();

    if (viewError || !viewItem) {
      return mapInventoryItem(data);
    }
    return mapInventoryItem(viewItem);
  }
}

export async function updateInventoryItem(
  id: string,
  colorName: string,
  size: ItemSize,
  minStock: number,
  price: number,
  categoryId?: string
): Promise<InventoryItem> {
  const finalCategoryId = categoryId || '22222222-2222-2222-2222-000000000002';
  let en = colorName;
  let bn = COLOR_TRANSLATIONS[colorName] || '';
  if (colorName.includes('(') && colorName.endsWith(')')) {
    const parts = colorName.slice(0, -1).split(' (');
    if (parts.length === 2) {
      en = parts[0];
      bn = parts[1];
    }
  }
  const full = bn ? `${en} (${bn})` : en;

  if (isDemoMode) {
    initializeDemoData();
    const items = getLocalData<any[]>('shanto_inventory', []);
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) throw new Error('Inventory item not found.');

    // Check duplicate
    const exists = items.some(i => i.id !== id && i.color_name_en.toLowerCase() === en.toLowerCase() && i.size === size);
    if (exists) {
      throw new Error(`Another inventory item for color "${en}" in size "${size}" already exists.`);
    }

    items[idx] = {
      ...items[idx],
      color_name_en: en,
      color_name_bn: bn,
      full_color_name: full,
      size,
      minimum_stock: minStock,
      notes: `Updated via inventory manager. Price set to ৳${price}.`,
      category_id: finalCategoryId,
      updated_at: new Date().toISOString()
    };

    setLocalData('shanto_inventory', items);
    
    const updatedList = getLocalInventoryItems();
    const updated = updatedList.find(i => i.id === id)!;
    return updated;
  } else {
    // Check duplicate
    const { data: existing } = await supabase!
      .from('inventory_items')
      .select('id')
      .eq('color_name_en', en)
      .eq('size', size)
      .neq('id', id)
      .maybeSingle();

    if (existing) {
      throw new Error(`Another inventory item for color "${en}" in size "${size}" already exists.`);
    }

    const { data, error } = await supabase!
      .from('inventory_items')
      .update({
        color_name_en: en,
        color_name_bn: bn,
        full_color_name: full,
        size,
        minimum_stock: minStock,
        notes: `Updated via inventory manager. Price set to ৳${price}.`,
        category_id: finalCategoryId
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating inventory item in Supabase:', error);
      throw error;
    }

    const { data: viewItem, error: viewError } = await supabase!
      .from('inventory_current_stock_view')
      .select('*')
      .eq('id', id)
      .single();

    if (viewError || !viewItem) {
      return mapInventoryItem(data);
    }
    return mapInventoryItem(viewItem);
  }
}

export async function deleteInventoryItem(id: string): Promise<void> {
  if (isDemoMode) {
    initializeDemoData();
    const items = getLocalData<any[]>('shanto_inventory', []);
    const filteredItems = items.filter(i => i.id !== id);
    setLocalData('shanto_inventory', filteredItems);

    const transactions = getLocalData<any[]>('shanto_transactions', []);
    const filteredTxs = transactions.filter(t => t.inventory_item_id !== id);
    setLocalData('shanto_transactions', filteredTxs);
  } else {
    const { error } = await supabase!
      .from('inventory_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting inventory item from Supabase:', error);
      throw error;
    }
  }
}

/**
 * ----------------------------------------------------
 * USER AUTHENTICATION & PROFILE FUNCTIONS
 * ----------------------------------------------------
 */

export async function loginUser(email: string, password: string): Promise<Profile> {
  if (isDemoMode) {
    initializeDemoData();
    const profiles = getLocalData<Profile[]>('shanto_profiles', []);
    
    // Check credentials
    if (email === 'admin@shantohardware.com' && password === 'admin123') {
      const admin = profiles.find(p => p.email === email);
      if (admin) return admin;
    } else if (email === 'staff@shantohardware.com' && password === 'staff123') {
      const staff = profiles.find(p => p.email === email);
      if (staff) return staff;
    }
    
    throw new Error('Invalid email or password. Please use standard demo accounts: admin@shantohardware.com / admin123 or staff@shantohardware.com / staff123');
  } else {
    const { data: authData, error: authError } = await supabase!.auth.signInWithPassword({
      email,
      password
    });
    
    if (authError) {
      throw new Error(authError.message);
    }
    
    if (!authData.user) {
      throw new Error('Failed to retrieve user authentication details.');
    }
    
    const { data: profile, error: profileError } = await supabase!
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();
      
    if (profileError) {
      const fallbackRole: UserRole = email.includes('admin') ? 'admin' : 'staff';
      const { data: newProfile, error: createError } = await supabase!
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: authData.user.email || email,
          name: email.substring(0, email.indexOf('@')),
          role: fallbackRole
        })
        .select()
        .single();
        
      if (createError) {
        throw new Error('Failed to find or create user database profile.');
      }
      return newProfile as Profile;
    }
    
    return profile as Profile;
  }
}

export async function fetchProfiles(): Promise<Profile[]> {
  if (isDemoMode) {
    initializeDemoData();
    return getLocalData<Profile[]>('shanto_profiles', []);
  } else {
    const { data, error } = await supabase!
      .from('profiles')
      .select('*')
      .order('email');
    if (error) {
      console.error('Error fetching profiles from Supabase:', error);
      throw error;
    }
    return data as Profile[];
  }
}

/**
 * ----------------------------------------------------
 * SETTINGS MANAGEMENT FUNCTIONS
 * ----------------------------------------------------
 */

export async function fetchSettings(): Promise<Settings> {
  const defaultSettings: Settings = {
    id: 1,
    shop_name: 'Shanto Hardware',
    logo_url: null,
    phone: '01700000005',
    address: 'Dhaka, Bangladesh',
    default_min_stock: 5,
    updated_at: new Date().toISOString()
  };

  if (isDemoMode) {
    return getLocalData<Settings>('shanto_settings', defaultSettings);
  } else {
    const { data, error } = await supabase!
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single();
    
    if (error) {
      console.warn('Settings not found in Supabase. Inserting default settings...', error);
      // Attempt to insert default settings if not exists
      const { data: inserted, error: insertError } = await supabase!
        .from('settings')
        .insert(defaultSettings)
        .select()
        .single();
        
      if (insertError) {
        console.error('Failed to create default settings in Supabase:', insertError);
        return defaultSettings;
      }
      return inserted as Settings;
    }
    return data as Settings;
  }
}

export async function updateSettings(settings: Partial<Settings>): Promise<Settings> {
  const defaultSettings: Settings = {
    id: 1,
    shop_name: 'Shanto Hardware',
    logo_url: null,
    phone: '01700000005',
    address: 'Dhaka, Bangladesh',
    default_min_stock: 5,
    updated_at: new Date().toISOString()
  };

  if (isDemoMode) {
    const current = getLocalData<Settings>('shanto_settings', defaultSettings);
    const updated = {
      ...current,
      ...settings,
      updated_at: new Date().toISOString()
    };
    setLocalData('shanto_settings', updated);
    return updated;
  } else {
    const { data, error } = await supabase!
      .from('settings')
      .update({
        ...settings,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1)
      .select()
      .single();

    if (error) {
      console.error('Failed to update settings in Supabase:', error);
      throw error;
    }
    return data as Settings;
  }
}

/**
 * ----------------------------------------------------
 * COLOR CATEGORY FUNCTIONS
 * ----------------------------------------------------
 */

export async function fetchCategories(): Promise<Category[]> {
  if (isDemoMode) {
    initializeDemoData();
    return getLocalData<Category[]>('shanto_categories', []);
  } else {
    const { data, error } = await supabase!
      .from('categories')
      .select('*')
      .order('name_en', { ascending: true });
    if (error) {
      console.error('Error fetching categories from Supabase:', error);
      throw error;
    }
    return data as Category[];
  }
}

export async function addCategory(nameEn: string, nameBn?: string): Promise<Category> {
  const finalNameBn = nameBn || nameEn;
  if (isDemoMode) {
    initializeDemoData();
    const categories = getLocalData<Category[]>('shanto_categories', []);
    
    // Check duplicate
    const exists = categories.some(c => c.name_en.toLowerCase() === nameEn.toLowerCase());
    if (exists) {
      throw new Error(`Category "${nameEn}" already exists.`);
    }
    
    const newCategory: Category = {
      id: 'cat-' + Math.random().toString(36).substr(2, 9),
      name_en: nameEn,
      name_bn: finalNameBn,
      created_at: new Date().toISOString()
    };
    
    categories.push(newCategory);
    setLocalData('shanto_categories', categories);
    return newCategory;
  } else {
    const { data, error } = await supabase!
      .from('categories')
      .insert({ name_en: nameEn, name_bn: finalNameBn })
      .select()
      .single();
    if (error) {
      console.error('Error adding category in Supabase:', error);
      throw error;
    }
    return data as Category;
  }
}

export async function updateCategory(id: string, nameEn: string, nameBn?: string): Promise<Category> {
  const finalNameBn = nameBn || nameEn;
  if (isDemoMode) {
    initializeDemoData();
    const categories = getLocalData<Category[]>('shanto_categories', []);
    const categoryIndex = categories.findIndex(c => c.id === id);
    if (categoryIndex === -1) {
      throw new Error('Category not found.');
    }
    
    // Check duplicate english name (excluding current category)
    const exists = categories.some(c => c.id !== id && c.name_en.toLowerCase() === nameEn.toLowerCase());
    if (exists) {
      throw new Error(`Category "${nameEn}" already exists.`);
    }

    const updatedCategory = {
      ...categories[categoryIndex],
      name_en: nameEn,
      name_bn: finalNameBn
    };
    categories[categoryIndex] = updatedCategory;
    setLocalData('shanto_categories', categories);
    
    // Update category names in inventory items cache if they exist there
    const items = getLocalData<any[]>('shanto_inventory', []);
    let itemUpdated = false;
    const updatedItems = items.map(item => {
      if (item.category_id === id) {
        itemUpdated = true;
        return { ...item, category_name_en: nameEn, category_name_bn: finalNameBn };
      }
      return item;
    });
    if (itemUpdated) {
      setLocalData('shanto_inventory', updatedItems);
    }
    
    return updatedCategory;
  } else {
    const { data, error } = await supabase!
      .from('categories')
      .update({ name_en: nameEn, name_bn: nameBn })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Error updating category in Supabase:', error);
      throw error;
    }
    return data as Category;
  }
}

export async function deleteCategory(id: string): Promise<void> {
  if (isDemoMode) {
    initializeDemoData();
    const categories = getLocalData<Category[]>('shanto_categories', []);
    const filtered = categories.filter(c => c.id !== id);
    setLocalData('shanto_categories', filtered);
    
    // Update inventory items with this category to null
    const items = getLocalData<any[]>('shanto_inventory', []);
    const updatedItems = items.map(item => {
      if (item.category_id === id) {
        return { ...item, category_id: null };
      }
      return item;
    });
    setLocalData('shanto_inventory', updatedItems);
  } else {
    const { error } = await supabase!
      .from('categories')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Error deleting category from Supabase:', error);
      throw error;
    }
  }
}

/**
 * ----------------------------------------------------
 * PAINT SIZE FUNCTIONS
 * ----------------------------------------------------
 */

export async function fetchSizes(): Promise<Size[]> {
  if (isDemoMode) {
    initializeDemoData();
    return getLocalData<Size[]>('shanto_sizes', []);
  } else {
    const { data, error } = await supabase!
      .from('sizes')
      .select('*')
      .order('name_en', { ascending: true });
    if (error) {
      console.error('Error fetching sizes from Supabase:', error);
      throw error;
    }
    return data as Size[];
  }
}

export async function addSize(nameEn: string, nameBn?: string): Promise<Size> {
  const finalNameBn = nameBn || nameEn;
  if (isDemoMode) {
    initializeDemoData();
    const sizes = getLocalData<Size[]>('shanto_sizes', []);
    
    // Check duplicate
    const exists = sizes.some(s => s.name_en.toLowerCase() === nameEn.toLowerCase());
    if (exists) {
      throw new Error(`Size "${nameEn}" already exists.`);
    }
    
    const newSize: Size = {
      id: 'size-' + Math.random().toString(36).substr(2, 9),
      name_en: nameEn,
      name_bn: finalNameBn,
      created_at: new Date().toISOString()
    };
    
    sizes.push(newSize);
    setLocalData('shanto_sizes', sizes);
    return newSize;
  } else {
    const { data, error } = await supabase!
      .from('sizes')
      .insert({ name_en: nameEn, name_bn: finalNameBn })
      .select()
      .single();
    if (error) {
      console.error('Error adding size in Supabase:', error);
      throw error;
    }
    return data as Size;
  }
}

export async function updateSize(id: string, nameEn: string, nameBn?: string): Promise<Size> {
  const finalNameBn = nameBn || nameEn;
  if (isDemoMode) {
    initializeDemoData();
    const sizes = getLocalData<Size[]>('shanto_sizes', []);
    const sizeIndex = sizes.findIndex(s => s.id === id);
    if (sizeIndex === -1) {
      throw new Error('Size not found.');
    }
    
    // Check duplicate english name (excluding current size)
    const exists = sizes.some(s => s.id !== id && s.name_en.toLowerCase() === nameEn.toLowerCase());
    if (exists) {
      throw new Error(`Size "${nameEn}" already exists.`);
    }

    const updatedSize = {
      ...sizes[sizeIndex],
      name_en: nameEn,
      name_bn: finalNameBn
    };
    sizes[sizeIndex] = updatedSize;
    setLocalData('shanto_sizes', sizes);
    
    return updatedSize;
  } else {
    const { data, error } = await supabase!
      .from('sizes')
      .update({ name_en: nameEn, name_bn: finalNameBn })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Error updating size in Supabase:', error);
      throw error;
    }
    return data as Size;
  }
}

export async function deleteSize(id: string): Promise<void> {
  if (isDemoMode) {
    initializeDemoData();
    const sizes = getLocalData<Size[]>('shanto_sizes', []);
    const filtered = sizes.filter(s => s.id !== id);
    setLocalData('shanto_sizes', filtered);
  } else {
    const { error } = await supabase!
      .from('sizes')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Error deleting size from Supabase:', error);
      throw error;
    }
  }
}

export async function deleteStockTransaction(id: string): Promise<void> {
  if (isDemoMode) {
    initializeDemoData();
    const transactions = getLocalData<StockTransaction[]>('shanto_transactions', []);
    const tx = transactions.find(t => t.id === id);
    if (!tx) throw new Error('Transaction not found.');

    const items = getLocalInventoryItems();
    const item = items.find(i => i.id === tx.inventory_item_id);
    if (!item) throw new Error('Inventory item not found.');

    // Calculate effect of deleting this transaction
    let netChange = 0;
    if (tx.action_type === 'STOCK_IN') {
      netChange = -tx.quantity;
    } else if (tx.action_type === 'STOCK_OUT') {
      netChange = tx.quantity;
    } else if (tx.action_type === 'ADJUSTMENT') {
      netChange = -tx.quantity;
    }

    if (item.current_stock + netChange < 0) {
      throw new Error(`Cannot delete transaction. It would cause stock of "${item.full_color_name}" to go below 0 (Remaining: ${item.current_stock + netChange}).`);
    }

    const filtered = transactions.filter(t => t.id !== id);
    setLocalData('shanto_transactions', filtered);
  } else {
    // Supabase Mode
    // 1. Fetch transaction to get quantity & item_id
    const { data: tx, error: fetchErr } = await supabase!
      .from('stock_transactions')
      .select('inventory_item_id, action_type, quantity')
      .eq('id', id)
      .single();
    if (fetchErr || !tx) throw new Error('Transaction not found.');

    // 2. Fetch current stock of item
    const { data: item, error: itemErr } = await supabase!
      .from('inventory_current_stock_view')
      .select('current_stock, full_color_name')
      .eq('id', tx.inventory_item_id)
      .single();
    if (itemErr || !item) throw new Error('Item not found.');

    let netChange = 0;
    if (tx.action_type === 'STOCK_IN') netChange = -tx.quantity;
    else if (tx.action_type === 'STOCK_OUT') netChange = tx.quantity;
    else if (tx.action_type === 'ADJUSTMENT') netChange = -tx.quantity;

    if ((item.current_stock || 0) + netChange < 0) {
      throw new Error(`Cannot delete transaction. It would cause stock of "${item.full_color_name}" to go below 0.`);
    }

    const { error } = await supabase!
      .from('stock_transactions')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Error deleting transaction in Supabase:', error);
      throw error;
    }
  }
}

export async function updateStockTransaction(
  id: string, 
  quantity: number, 
  notes?: string | null
): Promise<StockTransaction> {
  if (quantity <= 0) {
    throw new Error('Quantity must be greater than zero.');
  }

  if (isDemoMode) {
    initializeDemoData();
    const transactions = getLocalData<StockTransaction[]>('shanto_transactions', []);
    const idx = transactions.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Transaction not found.');
    const tx = transactions[idx];

    const items = getLocalInventoryItems();
    const item = items.find(i => i.id === tx.inventory_item_id);
    if (!item) throw new Error('Inventory item not found.');

    const diff = quantity - tx.quantity;
    let netChange = 0;
    if (tx.action_type === 'STOCK_IN') netChange = diff;
    else if (tx.action_type === 'STOCK_OUT') netChange = -diff;
    else if (tx.action_type === 'ADJUSTMENT') netChange = diff;

    if (item.current_stock + netChange < 0) {
      throw new Error(`Cannot update transaction. It would cause stock of "${item.full_color_name}" to go below 0 (Remaining: ${item.current_stock + netChange}).`);
    }

    let stock_change = 0;
    if (tx.action_type === 'STOCK_IN') stock_change = quantity;
    else if (tx.action_type === 'STOCK_OUT') stock_change = -quantity;
    else if (tx.action_type === 'ADJUSTMENT') stock_change = quantity;

    transactions[idx] = {
      ...tx,
      quantity,
      new_stock: (tx.previous_stock ?? 0) + stock_change,
      notes: notes || null
    };

    setLocalData('shanto_transactions', transactions);
    return populateLocalTransaction(transactions[idx]);
  } else {
    // Supabase Mode
    // 1. Fetch transaction
    const { data: tx, error: fetchErr } = await supabase!
      .from('stock_transactions')
      .select('inventory_item_id, action_type, quantity')
      .eq('id', id)
      .single();
    if (fetchErr || !tx) throw new Error('Transaction not found.');

    // 2. Fetch current stock
    const { data: item, error: itemErr } = await supabase!
      .from('inventory_current_stock_view')
      .select('current_stock, full_color_name')
      .eq('id', tx.inventory_item_id)
      .single();
    if (itemErr || !item) throw new Error('Item not found.');

    const diff = quantity - tx.quantity;
    let netChange = 0;
    if (tx.action_type === 'STOCK_IN') netChange = diff;
    else if (tx.action_type === 'STOCK_OUT') netChange = -diff;
    else if (tx.action_type === 'ADJUSTMENT') netChange = diff;

    if ((item.current_stock || 0) + netChange < 0) {
      throw new Error(`Cannot update transaction. It would cause stock of "${item.full_color_name}" to go below 0.`);
    }

    const { data, error } = await supabase!
      .from('stock_transactions')
      .update({ quantity, notes: notes || null })
      .eq('id', id)
      .select(`
        id,
        inventory_item_id,
        action_type,
        quantity,
        previous_stock,
        new_stock,
        notes,
        created_by,
        created_at,
        item:inventory_items(color_name_en, color_name_bn, full_color_name, size),
        profile:profiles(email, name, role)
      `)
      .single();

    if (error) {
      console.error('Error updating transaction in Supabase:', error);
      throw error;
    }
    return mapStockTransaction(data);
  }
}
