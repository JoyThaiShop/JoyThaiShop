/* ============================================
   Joy Thai Shop — Supabase Configuration
   ============================================
   
   ⚙️ วิธีตั้งค่า:
   1. ไปที่ https://supabase.com และ login
   2. เลือก Project ของคุณ
   3. ไปที่ Settings → API
   4. Copy "Project URL" ใส่ใน SUPABASE_URL
   5. Copy "anon public" key ใส่ใน SUPABASE_ANON_KEY
   ============================================ */

const SUPABASE_URL = 'https://cotekvvsnvkmaqkwvrba.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_v9g8kTki9jBv760z5uH4Tg_PvN5chRX';

// ─── สร้าง Supabase Client ───
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Admin password (ยังเก็บใน code สำหรับ admin login) ───
const ADMIN_PASSWORD = 'admin123';

console.log('✅ Supabase client initialized');
