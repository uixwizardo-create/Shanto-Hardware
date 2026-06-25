export type UserRole = 'admin' | 'staff';

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface Category {
  id: string;
  name_en: string;
  name_bn: string;
  created_at: string;
}

export interface Size {
  id: string;
  name_en: string;
  name_bn: string;
  created_at: string;
}

export type ItemSize = string;

export interface InventoryItem {
  id: string;
  serial_no: number;
  color_name_bn: string;
  color_name_en: string;
  full_color_name: string;
  size: ItemSize;
  initial_stock: number;
  minimum_stock: number;
  notes: string | null;
  category_id: string | null;
  category_name_en?: string;
  category_name_bn?: string;
  created_at: string;
  updated_at: string;
  
  // Dynamically populated fields from SQL view or LocalStorage
  current_stock: number;
  total_stock_in: number;
  total_stock_out: number;
  total_adjustments: number;
  status: 'Out of Stock' | 'Reorder' | 'Available';

  // Backward compatibility helper fields for existing frontend pages
  color_name: string;      // maps to full_color_name or color_name_en
  min_stock: number;       // maps to minimum_stock
  price: number;           // computed based on size or standard pricing
}

export type ActionType = 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT';

// Backward compatibility type mapping
export type TransactionType = 'IN' | 'OUT' | 'ADJUSTMENT';

export interface StockTransaction {
  id: string;
  inventory_item_id: string;
  action_type: ActionType;
  quantity: number;
  previous_stock: number | null;
  new_stock: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  
  // Backward compatibility helper fields
  transaction_type: TransactionType; // maps from action_type

  // Included fields for convenience in UI/log lists
  item?: {
    color_name_en: string;
    color_name_bn: string;
    full_color_name: string;
    size: ItemSize;
    color_name: string;  // maps to full_color_name
    price: number;       // size-based price
  };
  profile?: {
    email: string;
    name: string;
    role: UserRole;
  } | null;
}

export interface DashboardSummary {
  totalItems: number;
  totalStock: number;
  lowStockCount: number;
  totalSalesCount: number;
  totalSalesValue: number; // dynamically computed using transaction quantities and standard item prices
  totalStockInCount: number;
}

export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  actionType?: ActionType;
  colorName?: string;
  size?: ItemSize;
}

export interface InventoryFilter {
  search?: string; // searches by color_name_en or color_name_bn or full_color_name
  size?: ItemSize;
  status?: 'Out of Stock' | 'Reorder' | 'Available' | 'all';
  categoryId?: string;
}

export interface Settings {
  id: number;
  shop_name: string;
  logo_url: string | null;
  phone: string;
  address: string;
  default_min_stock: number;
  updated_at: string;
}
