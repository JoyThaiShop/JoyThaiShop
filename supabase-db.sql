-- ============================================================
-- Joy Thai Shop — Supabase Database Schema
-- ============================================================
-- วิธีใช้: ไปที่ Supabase Dashboard → SQL Editor → New Query
-- วาง SQL นี้ทั้งหมดแล้วกด "Run"
-- ============================================================

-- ── 1. ตารางสินค้า (Products) ──
CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  name_th     TEXT NOT NULL,
  name_de     TEXT,
  name_en     TEXT,
  price_thb   NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_eur   NUMERIC(10,2) NOT NULL DEFAULT 0,
  original_price_thb NUMERIC(10,2),
  original_price_eur NUMERIC(10,2),
  on_sale     BOOLEAN DEFAULT false,
  discount    NUMERIC(5,2),
  category    TEXT DEFAULT 'other',
  image       TEXT,
  weight      TEXT,
  emoji       TEXT,
  badge       TEXT,
  badge_th    TEXT,
  badge_de    TEXT,
  badge_en    TEXT,
  in_stock    BOOLEAN DEFAULT true,
  stock       INT DEFAULT 12,
  rating      NUMERIC(3,1) DEFAULT 5.0,
  reviews     INT DEFAULT 0,
  desc_th     TEXT,
  desc_de     TEXT,
  desc_en     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. ตารางคำสั่งซื้อ (Orders) ──
CREATE TABLE IF NOT EXISTS orders (
  id              TEXT PRIMARY KEY,           -- e.g. "JOY-12345"
  username        TEXT NOT NULL DEFAULT 'Guest',
  status          TEXT NOT NULL DEFAULT 'pending',
  subtotal_thb    NUMERIC(10,2) DEFAULT 0,
  subtotal_eur    NUMERIC(10,2) DEFAULT 0,
  service_fee_thb NUMERIC(10,2) DEFAULT 0,
  service_fee_eur NUMERIC(10,2) DEFAULT 0,
  shipping_thb    NUMERIC(10,2) DEFAULT 0,
  shipping_eur    NUMERIC(10,2) DEFAULT 0,
  total_thb       NUMERIC(10,2) DEFAULT 0,
  total_eur       NUMERIC(10,2) DEFAULT 0,
  payment_method  TEXT DEFAULT 'paypal',
  payment_slip    TEXT,                        -- base64 image string
  tracking_number TEXT,
  -- Address fields
  addr_name       TEXT,
  addr_street     TEXT,
  addr_city       TEXT,
  addr_zip        TEXT,
  addr_country    TEXT,
  addr_phone      TEXT,
  addr_notes      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. ตารางรายการสินค้าในออเดอร์ (Order Items) ──
CREATE TABLE IF NOT EXISTS order_items (
  id          SERIAL PRIMARY KEY,
  order_id    TEXT REFERENCES orders(id) ON DELETE CASCADE,
  product_id  INT,
  product_name_th TEXT,
  product_name_de TEXT,
  product_name_en TEXT,
  qty         INT NOT NULL DEFAULT 1,
  price_thb   NUMERIC(10,2) DEFAULT 0,
  price_eur   NUMERIC(10,2) DEFAULT 0,
  image       TEXT,
  emoji       TEXT
);

-- ── 4. ตารางผู้ใช้งาน (Users / Profiles) ──
CREATE TABLE IF NOT EXISTS profiles (
  username    TEXT PRIMARY KEY,
  email       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. Row Level Security (RLS) ──
-- เปิด RLS สำหรับทุกตาราง
ALTER TABLE products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;

-- อนุญาตให้ anon (ผู้ใช้ทั่วไป) อ่านสินค้าได้
CREATE POLICY "Public can read products"
  ON products FOR SELECT TO anon USING (true);

-- อนุญาตให้ anon สร้างออเดอร์ได้
CREATE POLICY "Public can insert orders"
  ON orders FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Public can insert order_items"
  ON order_items FOR INSERT TO anon WITH CHECK (true);

-- อนุญาตให้ anon อ่าน/แก้ไขออเดอร์ (admin ใช้ anon key เพราะ client-side)
CREATE POLICY "Public can read orders"
  ON orders FOR SELECT TO anon USING (true);

CREATE POLICY "Public can update orders"
  ON orders FOR UPDATE TO anon USING (true);

CREATE POLICY "Public can delete orders"
  ON orders FOR DELETE TO anon USING (true);

CREATE POLICY "Public can read order_items"
  ON order_items FOR SELECT TO anon USING (true);

-- อนุญาตให้ anon จัดการสินค้า (admin ใช้ anon key)
CREATE POLICY "Public can insert products"
  ON products FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Public can update products"
  ON products FOR UPDATE TO anon USING (true);

CREATE POLICY "Public can delete products"
  ON products FOR DELETE TO anon USING (true);

-- Profiles
CREATE POLICY "Public can manage profiles"
  ON profiles FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── 6. Auto-update updated_at ──
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── เสร็จสิ้น! ──
-- หลังรัน SQL นี้แล้ว ให้กลับไปใส่ SUPABASE_URL และ SUPABASE_ANON_KEY
-- ในไฟล์ supabase-config.js ครับ
