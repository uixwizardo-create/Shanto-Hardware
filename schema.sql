-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing views, triggers, and tables in correct order
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_transactions') THEN
    DROP TRIGGER IF EXISTS trg_enforce_no_negative_stock ON stock_transactions;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_items') THEN
    DROP TRIGGER IF EXISTS trg_update_inventory_updated_at ON inventory_items;
  END IF;
END $$;
DROP FUNCTION IF EXISTS enforce_no_negative_stock() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP VIEW IF EXISTS inventory_current_stock_view;
DROP TABLE IF EXISTS stock_transactions CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS pricing CASCADE;
DROP TABLE IF EXISTS sizes CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Create Settings Table
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    shop_name TEXT NOT NULL DEFAULT 'Shanto Hardware',
    logo_url TEXT,
    phone TEXT DEFAULT '01700000000',
    address TEXT DEFAULT 'Dhaka, Bangladesh',
    default_min_stock INTEGER DEFAULT 5,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Seed Settings
INSERT INTO settings (id, shop_name, logo_url, phone, address, default_min_stock)
VALUES (1, 'Shanto Hardware', NULL, '01700000000', 'Dhaka, Bangladesh', 5)
ON CONFLICT (id) DO NOTHING;

-- Create Profiles Table
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create Categories Table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en TEXT UNIQUE NOT NULL,
    name_bn TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Seed Categories
INSERT INTO categories (id, name_en, name_bn) VALUES
('22222222-2222-2222-2222-000000000001', 'Plastic Paint', 'প্লাস্টিক পেইন্ট'),
('22222222-2222-2222-2222-000000000002', 'Enamel', 'ইনামেল'),
('22222222-2222-2222-2222-000000000003', 'Primer', 'প্রাইমার'),
('22222222-2222-2222-2222-000000000004', 'Wall Putty', 'ওয়াল পুটি'),
('22222222-2222-2222-2222-000000000005', 'Exterior/Weather Coat', 'এক্সটেরিয়র/ওয়েদার কোট'),
('22222222-2222-2222-2222-000000000006', 'Distemper', 'ডিস্টেম্পার')
ON CONFLICT (id) DO NOTHING;

-- Create Sizes Table
CREATE TABLE sizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en TEXT UNIQUE NOT NULL,
    name_bn TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Seed Sizes
INSERT INTO sizes (id, name_en, name_bn) VALUES
('33333333-3333-3333-3333-000000000001', 'Gallon', 'গ্যালন'),
('33333333-3333-3333-3333-000000000002', '2 Pound (.91L)', '২ পাউন্ড (.৯১ লি.)'),
('33333333-3333-3333-3333-000000000003', 'Half Liter (4.55)', 'হাফ লিটার (৪.৫৫)'),
('33333333-3333-3333-3333-000000000004', 'Half Pound (200ML)', 'হাফ পাউন্ড (২০০ মিলি)')
ON CONFLICT (id) DO NOTHING;

-- Create Pricing Table
CREATE TABLE pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    size_id UUID NOT NULL REFERENCES sizes(id) ON DELETE CASCADE,
    buying_price DECIMAL(12,2) NOT NULL DEFAULT 0.00 CHECK (buying_price >= 0),
    selling_price DECIMAL(12,2) NOT NULL DEFAULT 0.00 CHECK (selling_price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(category_id, size_id)
);

-- Seed Pricing Records
INSERT INTO pricing (category_id, size_id, buying_price, selling_price) VALUES
('22222222-2222-2222-2222-000000000001', '33333333-3333-3333-3333-000000000001', 1800.00, 2200.00),
('22222222-2222-2222-2222-000000000002', '33333333-3333-3333-3333-000000000001', 2000.00, 2400.00),
('22222222-2222-2222-2222-000000000002', '33333333-3333-3333-3333-000000000002', 450.00, 550.00),
('22222222-2222-2222-2222-000000000002', '33333333-3333-3333-3333-000000000003', 250.00, 320.00),
('22222222-2222-2222-2222-000000000002', '33333333-3333-3333-3333-000000000004', 120.00, 160.00),
('22222222-2222-2222-2222-000000000003', '33333333-3333-3333-3333-000000000001', 1500.00, 1900.00),
('22222222-2222-2222-2222-000000000004', '33333333-3333-3333-3333-000000000001', 1200.00, 1500.00),
('22222222-2222-2222-2222-000000000006', '33333333-3333-3333-3333-000000000001', 1100.00, 1400.00)
ON CONFLICT (category_id, size_id) DO NOTHING;

-- Create Inventory Items Table
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_no SERIAL UNIQUE,
    color_name_bn TEXT NOT NULL,
    color_name_en TEXT NOT NULL,
    full_color_name TEXT NOT NULL,
    size TEXT NOT NULL,
    initial_stock INTEGER NOT NULL DEFAULT 0 CHECK (initial_stock >= 0),
    minimum_stock INTEGER NOT NULL DEFAULT 5 CHECK (minimum_stock >= 0),
    notes TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (color_name_en, size)
);

-- Create Stock Transactions Table
CREATE TABLE stock_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT')),
    quantity INTEGER NOT NULL CHECK (quantity <> 0),
    previous_stock INTEGER,
    new_stock INTEGER,
    notes TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create Current Stock View
CREATE OR REPLACE VIEW inventory_current_stock_view AS
SELECT 
    i.id,
    i.serial_no,
    i.color_name_bn,
    i.color_name_en,
    i.full_color_name,
    i.size,
    i.initial_stock,
    i.minimum_stock,
    i.notes,
    i.created_at,
    i.updated_at,
    i.category_id,
    c.name_en AS category_name_en,
    c.name_bn AS category_name_bn,
    COALESCE(SUM(CASE WHEN t.action_type = 'STOCK_IN' THEN t.quantity ELSE 0 END), 0) AS total_stock_in,
    COALESCE(SUM(CASE WHEN t.action_type = 'STOCK_OUT' THEN t.quantity ELSE 0 END), 0) AS total_stock_out,
    COALESCE(SUM(CASE WHEN t.action_type = 'ADJUSTMENT' THEN t.quantity ELSE 0 END), 0) AS total_adjustments,
    (
        i.initial_stock + 
        COALESCE(SUM(CASE WHEN t.action_type = 'STOCK_IN' THEN t.quantity ELSE 0 END), 0) - 
        COALESCE(SUM(CASE WHEN t.action_type = 'STOCK_OUT' THEN t.quantity ELSE 0 END), 0) + 
        COALESCE(SUM(CASE WHEN t.action_type = 'ADJUSTMENT' THEN t.quantity ELSE 0 END), 0)
    ) AS current_stock,
    CASE 
        WHEN (
            i.initial_stock + 
            COALESCE(SUM(CASE WHEN t.action_type = 'STOCK_IN' THEN t.quantity ELSE 0 END), 0) - 
            COALESCE(SUM(CASE WHEN t.action_type = 'STOCK_OUT' THEN t.quantity ELSE 0 END), 0) + 
            COALESCE(SUM(CASE WHEN t.action_type = 'ADJUSTMENT' THEN t.quantity ELSE 0 END), 0)
        ) <= 0 THEN 'Out of Stock'
        WHEN (
            i.initial_stock + 
            COALESCE(SUM(CASE WHEN t.action_type = 'STOCK_IN' THEN t.quantity ELSE 0 END), 0) - 
            COALESCE(SUM(CASE WHEN t.action_type = 'STOCK_OUT' THEN t.quantity ELSE 0 END), 0) + 
            COALESCE(SUM(CASE WHEN t.action_type = 'ADJUSTMENT' THEN t.quantity ELSE 0 END), 0)
        ) < i.minimum_stock THEN 'Reorder'
        ELSE 'Available'
    END AS status
FROM inventory_items i
LEFT JOIN stock_transactions t ON i.id = t.inventory_item_id
LEFT JOIN categories c ON i.category_id = c.id
GROUP BY 
    i.id, 
    i.serial_no, 
    i.color_name_bn, 
    i.color_name_en, 
    i.full_color_name, 
    i.size, 
    i.initial_stock, 
    i.minimum_stock, 
    i.notes, 
    i.created_at, 
    i.updated_at,
    i.category_id,
    c.name_en,
    c.name_bn;

-- Trigger Function to Prevent Negative Stock and Auto-populate Snapshots
CREATE OR REPLACE FUNCTION enforce_no_negative_stock()
RETURNS TRIGGER AS $$
DECLARE
    prev_stock INTEGER;
    stock_change INTEGER;
    net_new_stock INTEGER;
BEGIN
    -- Calculate stock before this transaction
    SELECT COALESCE(i.initial_stock, 0) + COALESCE((
        SELECT SUM(
            CASE 
                WHEN t.action_type = 'STOCK_IN' THEN t.quantity
                WHEN t.action_type = 'STOCK_OUT' THEN -t.quantity
                WHEN t.action_type = 'ADJUSTMENT' THEN t.quantity
                ELSE 0
            END
        ) FROM stock_transactions t
        WHERE t.inventory_item_id = NEW.inventory_item_id
    ), 0) INTO prev_stock
    FROM inventory_items i
    WHERE i.id = NEW.inventory_item_id;

    -- Calculate stock change for the incoming transaction
    IF NEW.action_type = 'STOCK_IN' THEN
        stock_change := NEW.quantity;
    ELSIF NEW.action_type = 'STOCK_OUT' THEN
        stock_change := -NEW.quantity;
    ELSIF NEW.action_type = 'ADJUSTMENT' THEN
        stock_change := NEW.quantity;
    ELSE
        stock_change := 0;
    END IF;

    net_new_stock := prev_stock + stock_change;

    -- Enforce no negative stock rule
    IF net_new_stock < 0 THEN
        RAISE EXCEPTION 'Insufficient stock. Available: %, requested change: %', prev_stock, stock_change;
    END IF;

    -- Populate snapshots
    NEW.previous_stock := prev_stock;
    NEW.new_stock := net_new_stock;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create Enforce Negative Stock Trigger
CREATE TRIGGER trg_enforce_no_negative_stock
BEFORE INSERT ON stock_transactions
FOR EACH ROW
EXECUTE FUNCTION enforce_no_negative_stock();

-- Auto-update updated_at Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_inventory_updated_at
BEFORE UPDATE ON inventory_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- Seed 57 colors and sizes from Excel JSON
INSERT INTO inventory_items (id, serial_no, color_name_bn, color_name_en, full_color_name, size, initial_stock, minimum_stock, notes, category_id) VALUES
('11111111-1111-1111-1111-000000000001', 1, 'হলুদ', 'Yellow', 'হলুদ (Yellow)', 'Gallon', 1, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000002', 2, 'নেভি ব্লু', 'Navy Blue', 'নেভি ব্লু (Navy Blue)', 'Gallon', 2, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000003', 3, 'সিএনজি গ্রিন', 'CNG Green', 'সিএনজি গ্রিন (CNG Green)', 'Gallon', 3, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000004', 4, 'স্মোক গ্রে', 'Smoke Grey', 'স্মোক গ্রে (Smoke Grey)', 'Gallon', 4, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000005', 5, 'সাদা', 'White', 'সাদা (White)', 'Gallon', 2, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000006', 6, 'ট্যাঞ্জারিন', 'Tangerine', 'ট্যাঞ্জারিন (Tangerine)', 'Gallon', 5, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000007', 7, 'কাঠালি', 'Kathali', 'কাঠালি (Kathali)', 'Gallon', 4, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000008', 8, 'টার্কিশ', 'Turkish', 'টার্কিশ (Turkish)', 'Gallon', 3, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000009', 9, 'কালো', 'Black', 'কালো (Black)', 'Gallon', 7, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000010', 10, 'রেইনবো রেড অক্সাইড প্রাইমার', 'Rainbow Red Oxide Primer', 'রেইনবো রেড অক্সাইড প্রাইমার (Rainbow Red Oxide Primer)', 'Gallon', 4, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000011', 11, 'মেরিন রেড অক্সাইড প্রাইমার', 'Marine Red Oxide Primer', 'মেরিন রেড অক্সাইড প্রাইমার (Marine Red Oxide Primer)', 'Gallon', 5, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000012', 12, 'লাল', 'Red', 'লাল (Red)', 'Gallon', 4, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000013', 13, 'সিলভার', 'Silver', 'সিলভার (Silver)', '2 Pound (.91L)', 20, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000014', 14, 'স্মোক গ্রে', 'Smoke Grey', 'স্মোক গ্রে (Smoke Grey)', '2 Pound (.91L)', 24, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000015', 15, 'সাদা', 'White', 'সাদা (White)', '2 Pound (.91L)', 5, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000016', 16, 'অফ হোয়াইট', 'Off White', 'অফ হোয়াইট (Off White)', '2 Pound (.91L)', 8, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000017', 17, 'নেভি ব্লু', 'Navy Blue', 'নেভি ব্লু (Navy Blue)', '2 Pound (.91L)', 16, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000018', 18, 'হলুদ', 'Yellow', 'হলুদ (Yellow)', '2 Pound (.91L)', 20, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000019', 19, 'লাল', 'Red', 'লাল (Red)', '2 Pound (.91L)', 21, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000020', 20, 'রেইনবো রেড অক্সাইড প্রাইমার', 'Rainbow Red Oxide Primer', 'রেইনবো রেড অক্সাইড প্রাইমার (Rainbow Red Oxide Primer)', '2 Pound (.91L)', 6, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000021', 21, 'মেরিন রেড অক্সাইড প্রাইমার', 'Marine Red Oxide Primer', 'মেরিন রেড অক্সাইড প্রাইমার (Marine Red Oxide Primer)', '2 Pound (.91L)', 27, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000022', 22, 'রেড অক্সাইড', 'Red Oxide', 'রেড অক্সাইড (Red Oxide)', '2 Pound (.91L)', 24, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000023', 23, 'ব্লু', 'Blue', 'ব্লু (Blue)', '2 Pound (.91L)', 40, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000024', 24, 'কাঠালি', 'Kathali', 'কাঠালি (Kathali)', '2 Pound (.91L)', 49, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000025', 25, 'চকোলেট', 'Chocolate', 'চকোলেট (Chocolate)', '2 Pound (.91L)', 19, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000026', 26, 'কালো', 'Black', 'কালো (Black)', '2 Pound (.91L)', 12, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000027', 27, 'ক্রিম', 'Cream', 'ক্রিম (Cream)', '2 Pound (.91L)', 8, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000028', 28, 'সিএমজি গ্রিন', 'CMG Green', 'সিএমজি গ্রিন (CMG Green)', '2 Pound (.91L)', 33, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000029', 29, 'টার্কিশ', 'Turkish', 'টার্কিশ (Turkish)', '2 Pound (.91L)', 39, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000030', 30, 'হলুদ', 'Yellow', 'হলুদ (Yellow)', 'Half Liter (4.55)', 11, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000031', 31, 'সিএনজি গ্রিন', 'CNG Green', 'সিএনজি গ্রিন (CNG Green)', 'Half Liter (4.55)', 15, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000032', 32, 'সাদা', 'White', 'সাদা (White)', 'Half Liter (4.55)', 27, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000033', 33, 'অফ হোয়াইট', 'Off White', 'অফ হোয়াইট (Off White)', 'Half Liter (4.55)', 5, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000034', 34, 'ক্রিম', 'Cream', 'ক্রিম (Cream)', 'Half Liter (4.55)', 14, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000035', 35, 'লাল', 'Red', 'লাল (Red)', 'Half Liter (4.55)', 34, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000036', 36, 'মেরিন রেড অক্সাইড প্রাইমার', 'Marine Red Oxide Primer', 'মেরিন রেড অক্সাইড প্রাইমার (Marine Red Oxide Primer)', 'Half Liter (4.55)', 37, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000037', 37, 'রেড অক্সাইড', 'Red Oxide', 'রেড অক্সাইড (Red Oxide)', 'Half Liter (4.55)', 14, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000038', 38, 'স্মোক গ্রে', 'Smoke Grey', 'স্মোক গ্রে (Smoke Grey)', 'Half Liter (4.55)', 13, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000039', 39, 'টার্কিশ', 'Turkish', 'টার্কিশ (Turkish)', 'Half Liter (4.55)', 50, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000040', 40, 'কাঠালি', 'Kathali', 'কাঠালি (Kathali)', 'Half Liter (4.55)', 58, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000041', 41, 'কালো', 'Black', 'কালো (Black)', 'Half Liter (4.55)', 37, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000042', 42, 'চকোলেট', 'Chocolate', 'চকোলেট (Chocolate)', 'Half Liter (4.55)', 31, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000043', 43, 'ব্লু', 'Blue', 'ব্লু (Blue)', 'Half Liter (4.55)', 44, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000044', 44, 'হলুদ', 'Yellow', 'হলুদ (Yellow)', 'Half Pound (200ML)', 18, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000045', 45, 'গ্রিন', 'Green', 'গ্রিন (Green)', 'Half Pound (200ML)', 7, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000046', 46, 'সাদা', 'White', 'সাদা (White)', 'Half Pound (200ML)', 21, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000047', 47, 'অফ হোয়াইট', 'Off White', 'অফ হোয়াইট (Off White)', 'Half Pound (200ML)', 21, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000048', 48, 'ক্রিম', 'Cream', 'ক্রিম (Cream)', 'Half Pound (200ML)', 18, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000049', 49, 'লাল', 'Red', 'লাল (Red)', 'Half Pound (200ML)', 34, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000050', 50, 'রেড অক্সাইড', 'Red Oxide', 'রেড অক্সাইড (Red Oxide)', 'Half Pound (200ML)', 58, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000051', 51, 'স্মোক গ্রে', 'Smoke Grey', 'স্মোক গ্রে (Smoke Grey)', 'Half Pound (200ML)', 23, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000052', 52, 'টার্কিশ', 'Turkish', 'টার্কিশ (Turkish)', 'Half Pound (200ML)', 33, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000053', 53, 'কাঠালি', 'Kathali', 'কাঠালি (Kathali)', 'Half Pound (200ML)', 48, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000054', 54, 'কালো', 'Black', 'কালো (Black)', 'Half Pound (200ML)', 28, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000055', 55, 'চকোলেট', 'Chocolate', 'চকোলেট (Chocolate)', 'Half Pound (200ML)', 55, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000056', 56, 'ব্লু', 'Blue', 'ব্লু (Blue)', 'Half Pound (200ML)', 34, 5, '', '22222222-2222-2222-2222-000000000002'),
('11111111-1111-1111-1111-000000000057', 57, 'নেভি ব্লু', 'Navy Blue', 'নেভি ব্লু (Navy Blue)', 'Half Pound (200ML)', 25, 5, '', '22222222-2222-2222-2222-000000000002')
ON CONFLICT (id) DO UPDATE SET 
  serial_no = EXCLUDED.serial_no,
  color_name_bn = EXCLUDED.color_name_bn,
  color_name_en = EXCLUDED.color_name_en,
  full_color_name = EXCLUDED.full_color_name,
  size = EXCLUDED.size,
  initial_stock = EXCLUDED.initial_stock,
  minimum_stock = EXCLUDED.minimum_stock,
  notes = EXCLUDED.notes,
  category_id = EXCLUDED.category_id;
