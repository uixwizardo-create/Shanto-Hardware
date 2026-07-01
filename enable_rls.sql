-- =========================================================================
-- SUPABASE ROW-LEVEL SECURITY (RLS) ENABLING SCRIPT
-- Copy and run this script in your Supabase SQL Editor to resolve warnings.
-- =========================================================================

-- 1. Enable RLS on all tables
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Allow public read for settings" ON settings;
DROP POLICY IF EXISTS "Allow authenticated write for settings" ON settings;

DROP POLICY IF EXISTS "Allow authenticated read for profiles" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated write for profiles" ON profiles;

DROP POLICY IF EXISTS "Allow public read for categories" ON categories;
DROP POLICY IF EXISTS "Allow authenticated write for categories" ON categories;

DROP POLICY IF EXISTS "Allow public read for sizes" ON sizes;
DROP POLICY IF EXISTS "Allow authenticated write for sizes" ON sizes;

DROP POLICY IF EXISTS "Allow public read for pricing" ON pricing;
DROP POLICY IF EXISTS "Allow authenticated write for pricing" ON pricing;

DROP POLICY IF EXISTS "Allow public read for inventory_items" ON inventory_items;
DROP POLICY IF EXISTS "Allow authenticated write for inventory_items" ON inventory_items;

DROP POLICY IF EXISTS "Allow public read for stock_transactions" ON stock_transactions;
DROP POLICY IF EXISTS "Allow authenticated write for stock_transactions" ON stock_transactions;


-- 3. Create access policies

-- SETTINGS Policies
CREATE POLICY "Allow public read for settings" ON settings
    FOR SELECT USING (true);
CREATE POLICY "Allow authenticated write for settings" ON settings
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PROFILES Policies
CREATE POLICY "Allow authenticated read for profiles" ON profiles
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write for profiles" ON profiles
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CATEGORIES Policies
CREATE POLICY "Allow public read for categories" ON categories
    FOR SELECT USING (true);
CREATE POLICY "Allow authenticated write for categories" ON categories
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- SIZES Policies
CREATE POLICY "Allow public read for sizes" ON sizes
    FOR SELECT USING (true);
CREATE POLICY "Allow authenticated write for sizes" ON sizes
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PRICING Policies
CREATE POLICY "Allow public read for pricing" ON pricing
    FOR SELECT USING (true);
CREATE POLICY "Allow authenticated write for pricing" ON pricing
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- INVENTORY_ITEMS Policies
CREATE POLICY "Allow public read for inventory_items" ON inventory_items
    FOR SELECT USING (true);
CREATE POLICY "Allow authenticated write for inventory_items" ON inventory_items
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- STOCK_TRANSACTIONS Policies
CREATE POLICY "Allow public read for stock_transactions" ON stock_transactions
    FOR SELECT USING (true);
CREATE POLICY "Allow authenticated write for stock_transactions" ON stock_transactions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
