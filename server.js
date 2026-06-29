const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 10000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Support base64 image uploads up to 10MB

// PostgreSQL Connection Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : {
    rejectUnauthorized: false
  }
});

// Initialize Database Tables
async function initDatabase() {
  let client;
  try {
    console.log('🔄 Connecting to database and checking tables...');
    client = await pool.connect();
    
    // 1. Products Table
    await client.query(`
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
      )
    `);

    // 2. Orders Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id              TEXT PRIMARY KEY,
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
        payment_slip    TEXT,
        tracking_number TEXT,
        addr_name       TEXT,
        addr_street     TEXT,
        addr_city       TEXT,
        addr_zip        TEXT,
        addr_country    TEXT,
        addr_phone      TEXT,
        addr_notes      TEXT,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 3. Order Items Table
    await client.query(`
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
      )
    `);

    // 4. Profiles Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        username    TEXT PRIMARY KEY,
        email       TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 5. Admins Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        username    TEXT PRIMARY KEY,
        password    TEXT NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Seed default admin accounts if empty
    const adminCheck = await client.query('SELECT COUNT(*) FROM admins');
    if (parseInt(adminCheck.rows[0].count) === 0) {
      await client.query("INSERT INTO admins (username, password) VALUES ('admin', 'admin123')");
      console.log('👤 Seeded default admin account (username: admin / password: admin123)');
    }

    // Auto-seed default products if empty
    const productCheck = await client.query('SELECT COUNT(*) FROM products');
    if (parseInt(productCheck.rows[0].count) === 0) {
      console.log('📦 Products database empty. Seeding default products...');
      const defaultProducts = [
        {
          id: 1, name_th: 'มาม่าต้มยำกุ้ง รสเด็ด', name_de: 'MAMA Tom Yum Garnelen Nudeln', name_en: 'MAMA Tom Yum Shrimp Noodles',
          weight: '90g', price_thb: 35, price_eur: 0.92, category: 'noodle', image: 'images/product_food1.png', emoji: '🍜',
          badge: 'hot', badge_th: 'ขายดี', badge_de: 'Bestseller', badge_en: 'Bestseller', rating: 4.8, reviews: 1234,
          desc_th: 'รสต้มยำกุ้งเข้มข้น หอมกลมกล่อม อิ่มท้องทุกคำ', desc_de: 'Authentischer thailändischer Tom-Yum-Garnelengeschmack, würzig und lecker.', desc_en: 'Authentic Thai Tom Yum shrimp flavor, spicy and delicious in every bite.'
        },
        {
          id: 2, name_th: 'โมจิไอศกรีม รวมรส', name_de: 'Mochi Eiscreme Sortiert', name_en: 'Mochi Ice Cream Assorted',
          weight: '240g', price_thb: 280, price_eur: 7.37, category: 'snack', image: 'images/product_food2.png', emoji: '🍡',
          badge: 'new', badge_th: 'ใหม่', badge_de: 'Neu', badge_en: 'New', rating: 4.9, reviews: 856,
          desc_th: 'โมจิญี่ปุ่นแท้ รวม 6 รส ห่อครีมนุ่ม ละมุนลิ้น', desc_de: 'Echtes japanisches Mochi mit 6 leckeren Eissorten.', desc_en: 'Authentic Japanese mochi with 6 delicious ice cream flavors.'
        },
        {
          id: 3, name_th: 'พริกแกงเขียวหวานแม่พลอย', name_de: 'Mae Ploy Grüne Currypaste', name_en: 'Mae Ploy Green Curry Paste',
          weight: '400g', price_thb: 89, price_eur: 2.34, category: 'sauce', image: 'images/product_food3.png', emoji: '🫙',
          badge: null, badge_th: null, badge_de: null, badge_en: null, rating: 4.7, reviews: 567,
          desc_th: 'พริกแกงสูตรโบราณ ส่วนผสมแท้ หอมสมุนไพรธรรมชาติ', desc_de: 'Traditionelle grüne Currypaste, reich an natürlichen Kräutern.', desc_en: 'Traditional green curry paste, rich in natural Thai herbs.'
        },
        {
          id: 4, name_th: 'น้ำปลาแท้ทิพรส', name_de: 'Tiparos Premium Fischsauce', name_en: 'Tiparos Premium Fish Sauce',
          weight: '700ml', price_thb: 65, price_eur: 1.71, category: 'sauce', image: 'images/product_food4.png', emoji: '🍶',
          badge: null, badge_th: null, badge_de: null, badge_en: null, rating: 4.6, reviews: 432,
          desc_th: 'น้ำปลาแท้คุณภาพเยี่ยม หมักจากปลาทะเลแท้ กลิ่นหอม', desc_de: 'Erstklassige thailändische Fischsauce, naturally fermented.', desc_en: 'Premium quality Thai fish sauce, naturally fermented.'
        },
        {
          id: 5, name_th: 'ราเมงเกาหลี รสเผ็ดจัด', name_de: 'Scharfe Koreanische Ramen Nudeln', name_en: 'Korean Spicy Ramen Noodles',
          weight: '140g', price_thb: 95, price_eur: 2.50, category: 'noodle', image: 'images/product_food5.png', emoji: '🍲',
          badge: 'hot', badge_th: 'ร้อนแรง', badge_de: 'Scharf', badge_en: 'Hot', rating: 4.9, reviews: 2103,
          desc_th: 'ราเมงสไตล์เกาหลี เผ็ดจัด รสเข้มข้น ซุปเข้มถึงใจ', desc_de: 'Extrem scharfe Ramen-Nudeln nach koreanischer Art.', desc_en: 'Extremely spicy Korean-style ramen noodles.'
        },
        {
          id: 6, name_th: 'กะทิสด ชาวเกาะ', name_de: 'Chaokoh Kokosmilch', name_en: 'Chaokoh Coconut Milk',
          weight: '400ml', price_thb: 55, price_eur: 1.45, category: 'ingredient', image: 'images/product_food6.png', emoji: '🥥',
          badge: null, badge_th: null, badge_de: null, badge_en: null, rating: 4.8, reviews: 789,
          desc_th: 'กะทิสดจากมะพร้าวไทย ครีมเข้มข้น หอมหวานธรรมชาติ', desc_de: 'Reine thailändische Kokosmilch, perfekt zum Kochen und Backen.', desc_en: 'Pure Thai coconut milk, perfect for cooking and desserts.'
        },
        {
          id: 7, name_th: 'ชาตรามือ ชาไทยสูตรต้นตำรับ', name_de: 'ChaTraMue Traditioneller Thailändischer Tee', name_en: 'ChaTraMue Traditional Thai Tee',
          weight: '400g', price_thb: 180, price_eur: 4.74, category: 'drink', image: null, emoji: '🍵',
          badge: 'new', badge_th: 'ใหม่', badge_de: 'Neu', badge_en: 'New', rating: 4.9, reviews: 945,
          desc_th: 'ผงชาไทยสูตรดั้งเดิม หอมกรุ่น รสเข้มข้น สำหรับทำชาเย็น', desc_de: 'Original thailändisches Teepulver für Eistee und Milchtee.', desc_en: 'Original Thai tea powder for making authentic Thai iced tea.'
        },
        {
          id: 8, name_th: 'ข้าวเกรียบกุ้ง ตราฮานามิ', name_de: 'Hanami Krabbenchips', name_en: 'Hanami Prawn Crackers',
          weight: '110g', price_thb: 45, price_eur: 1.18, category: 'snack', image: null, emoji: '🍿',
          badge: null, badge_th: null, badge_de: null, badge_en: null, rating: 4.6, reviews: 612,
          desc_th: 'ข้าวเกรียบกุ้งทอดกรอบ รสชาติกลมกล่อม กรอบอร่อยเคี้ยวเพลิน', desc_de: 'Knusprige thailändische Krabbenchips mit tollem Geschmack.', desc_en: 'Crispy Thai prawn crackers with a delicious, savory taste.'
        },
        {
          id: 9, name_th: 'เส้นเล็ก ตราสามเหรียญ', name_de: 'Drei Münzen Reisnudeln', name_en: 'Three Coins Rice Noodles',
          weight: '500g', price_thb: 40, price_eur: 1.05, category: 'noodle', image: null, emoji: '🍝',
          badge: null, badge_th: null, badge_de: null, badge_en: null, rating: 4.7, reviews: 389,
          desc_th: 'เส้นก๋วยเตี๋ยวข้าวอย่างดี เหนียวนุ่ม ไม่ขาดง่าย เหมาะทำผัดไทย', desc_de: 'Hochwertige Reisnudeln, ideal für Pad Thai und Suppen.', desc_en: 'High-quality rice noodles, perfect for Pad Thai and noodle soups.'
        },
        {
          id: 10, name_th: 'นมถั่วเหลือง ไวตามิ้ลค์', name_de: 'Vitamilk Sojamilch', name_en: 'Vitamilk Soy Milk',
          weight: '300ml', price_thb: 25, price_eur: 0.66, category: 'drink', image: null, emoji: '🥛',
          badge: null, badge_th: null, badge_de: null, badge_en: null, rating: 4.7, reviews: 1567,
          desc_th: 'นมถั่วเหลืองสูตรดั้งเดิม โปรตีนสูง หวานมันกลมกล่อม', desc_de: 'Klassische thailändische Sojamilch, cremig und nahrhaft.', desc_en: 'Classic Thai soy milk, rich, creamy and high in protein.'
        },
        {
          id: 11, name_th: 'ซอสพริกศรีราชา ตราเหรียญทอง', name_de: 'Goldmedaille Sriracha Scharfe Sauce', name_en: 'Gold Medal Sriracha Hot Sauce',
          weight: '570g', price_thb: 120, price_eur: 3.16, category: 'sauce', image: null, emoji: '🌶️',
          badge: 'hot', badge_th: 'ขายดีที่สุด', badge_de: 'Bestseller', badge_en: 'Top Seller', rating: 4.9, reviews: 3201,
          desc_th: 'ซอสพริกศรีราชาแท้ รสชาติกลมกล่อม เผ็ดเปรี้ยวหวานลงตัว', desc_de: 'Authentische thailändische Sriracha-Sauce, perfekt scharf.', desc_en: 'Authentic Thai Sriracha sauce, perfect blend of heat and tang.'
        },
        {
          id: 12, name_th: 'ข้าวหอมมะลิใหม่ ตราฉัตรทอง', name_de: 'Royal Umbrella Premium Jasminreis', name_en: 'Royal Umbrella Premium Jasmine Rice',
          weight: '5kg', price_thb: 380, price_eur: 10.00, category: 'ingredient', image: null, emoji: '🌾',
          badge: 'new', badge_th: 'พรีเมียม', badge_de: 'Premium', badge_en: 'Premium', rating: 4.9, reviews: 1892,
          desc_th: 'ข้าวหอมมะลิแท้ 100% คุณภาพส่งออก นุ่มเหนียว หอมกรุ่นเมื่อหุง', desc_de: 'Premium thailändischer Jasminreis, duftend und weich.', desc_en: 'Premium 100% Thai jasmine rice, aromatic and soft when cooked.'
        }
      ];

      for (const p of defaultProducts) {
        await client.query(`
          INSERT INTO products (
            id, name_th, name_de, name_en, price_thb, price_eur, category, image, emoji,
            badge, badge_th, badge_de, badge_en, rating, reviews, desc_th, desc_de, desc_en
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        `, [
          p.id, p.name_th, p.name_de, p.name_en, p.price_thb, p.price_eur, p.category, p.image, p.emoji,
          p.badge, p.badge_th, p.badge_de, p.badge_en, p.rating, p.reviews, p.desc_th, p.desc_de, p.desc_en
        ]);
      }
      console.log('✅ Seeded 12 default products successfully!');
    }
    
    console.log('🎉 Database initialization complete!');
  } catch (err) {
    console.error('❌ Database initialization error:', err);
  } finally {
    if (client) client.release();
  }
}

// ==========================================
// REST API ROUTES
// ==========================================

// 1. GET ALL PRODUCTS
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 2. UPSERT PRODUCTS (Used by Admin to add/edit/delete/restock)
app.post('/api/products/upsert', async (req, res) => {
  const { rows } = req.body;
  if (!rows || !Array.isArray(rows)) {
    return res.status(400).json({ error: 'Invalid rows structure' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Clear product table to synchronize with local array
    await client.query('DELETE FROM products');
    
    for (const p of rows) {
      const query = `
        INSERT INTO products (
          id, name_th, name_de, name_en, price_thb, price_eur, 
          original_price_thb, original_price_eur, on_sale, discount, 
          category, image, weight, emoji, badge, badge_th, badge_de, badge_en, 
          in_stock, stock, rating, reviews, desc_th, desc_de, desc_en
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
        )
      `;
      const values = [
        p.id, p.name_th, p.name_de, p.name_en, p.price_thb, p.price_eur,
        p.original_price_thb, p.original_price_eur, p.on_sale, p.discount,
        p.category, p.image, p.weight, p.emoji, p.badge, p.badge_th, p.badge_de, p.badge_en,
        p.in_stock, p.stock, p.rating, p.reviews, p.desc_th, p.desc_de, p.desc_en
      ];
      await client.query(query, values);
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// 3. GET ALL ORDERS WITH THEIR ORDER ITEMS
app.get('/api/orders', async (req, res) => {
  try {
    const ordersResult = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    const itemsResult = await pool.query('SELECT * FROM order_items');
    
    // Group items by order_id
    const itemsByOrderId = {};
    itemsResult.rows.forEach(item => {
      if (!itemsByOrderId[item.order_id]) {
        itemsByOrderId[item.order_id] = [];
      }
      itemsByOrderId[item.order_id].push(item);
    });
    
    const aggregatedOrders = ordersResult.rows.map(o => ({
      ...o,
      order_items: itemsByOrderId[o.id] || []
    }));
    
    res.json(aggregatedOrders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 4. CREATE AN ORDER AND ASSOCIATED ORDER ITEMS
app.post('/api/orders', async (req, res) => {
  const { order, items } = req.body;
  if (!order || !items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Invalid order structure' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Insert order metadata
    const orderQuery = `
      INSERT INTO orders (
        id, username, status, subtotal_thb, subtotal_eur, 
        service_fee_thb, service_fee_eur, shipping_thb, shipping_eur, 
        total_thb, total_eur, payment_method, payment_slip,
        addr_name, addr_street, addr_city, addr_zip, addr_country, addr_phone, addr_notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
      )
    `;
    const orderValues = [
      order.id, order.username, order.status, order.subtotal_thb, order.subtotal_eur,
      order.service_fee_thb, order.service_fee_eur, order.shipping_thb, order.shipping_eur,
      order.total_thb, order.total_eur, order.payment_method, order.payment_slip,
      order.addr_name, order.addr_street, order.addr_city, order.addr_zip, order.addr_country, order.addr_phone, order.addr_notes
    ];
    await client.query(orderQuery, orderValues);
    
    // Insert order items
    for (const item of items) {
      const itemQuery = `
        INSERT INTO order_items (
          order_id, product_id, product_name_th, product_name_de, product_name_en, 
          qty, price_thb, price_eur, image, emoji
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        )
      `;
      const itemValues = [
        item.order_id, item.product_id, item.product_name_th, item.product_name_de, item.product_name_en,
        item.qty, item.price_thb, item.price_eur, item.image, item.emoji
      ];
      await client.query(itemQuery, itemValues);
    }
    
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// 5. UPDATE ORDER FIELD(S) (Status or tracking number)
app.put('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  const fields = req.body;
  if (!fields || Object.keys(fields).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const setClause = [];
  const values = [];
  let paramIndex = 1;
  for (const [key, val] of Object.entries(fields)) {
    setClause.push(`${key} = $${paramIndex}`);
    values.push(val);
    paramIndex++;
  }
  values.push(id);

  const query = `UPDATE orders SET ${setClause.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`;
  try {
    const result = await pool.query(query, values);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 6. DELETE ORDER
app.delete('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM orders WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 7. CHECK IF USER PROFILE EXISTS
app.post('/api/profiles/check', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }
  try {
    const result = await pool.query('SELECT username FROM profiles WHERE LOWER(username) = LOWER($1)', [username]);
    if (result.rows.length > 0) {
      res.json({ exists: true, profile: result.rows[0] });
    } else {
      res.json({ exists: false, profile: null });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 8. CREATE NEW PROFILE (REGISTER)
app.post('/api/profiles', async (req, res) => {
  const { username, email } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }
  try {
    await pool.query('INSERT INTO profiles (username, email) VALUES ($1, $2)', [username, email || null]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 9. ADMIN LOGIN
app.post('/api/admins/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  try {
    const result = await pool.query('SELECT username FROM admins WHERE username = $1 AND password = $2', [username, password]);
    if (result.rows.length > 0) {
      res.json({ success: true, admin: result.rows[0] });
    } else {
      res.json({ success: false, error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 10. GET ALL ADMIN ACCOUNTS
app.get('/api/admins', async (req, res) => {
  try {
    const result = await pool.query('SELECT username, created_at FROM admins ORDER BY created_at ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 11. CREATE AN ADMIN
app.post('/api/admins', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  try {
    const check = await pool.query('SELECT username FROM admins WHERE username = $1', [username]);
    if (check.rows.length > 0) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    await pool.query('INSERT INTO admins (username, password) VALUES ($1, $2)', [username, password]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 12. DELETE AN ADMIN
app.delete('/api/admins/:username', async (req, res) => {
  const { username } = req.params;
  try {
    await pool.query('DELETE FROM admins WHERE username = $1', [username]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '.')));

// Catch-all route to serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server and Initialize Database Tables
app.listen(port, () => {
  console.log(`🚀 Joy Thai Shop server running on port ${port}`);
  if (process.env.DATABASE_URL) {
    initDatabase();
  } else {
    console.error('⚠️ Warning: DATABASE_URL environment variable is not defined!');
  }
});
