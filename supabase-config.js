/* ============================================
   Joy Thai Shop — Supabase Configuration
   ============================================ */

const SUPABASE_URL = 'https://ootekvvsnvkmaqkwvrba.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vdGVrdnZzbnZrbWFxa3d2cmJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NjY2OTQsImV4cCI6MjA5ODI0MjY5NH0._LDgF38HpCzeLS6yv4gsux02JQMmp3IU_NI74RXh3KU';

// ─── สร้าง Supabase Client ───
let supabaseClient;
try {
  const { createClient } = supabase;
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('✅ Supabase client initialized successfully');
} catch (e) {
  console.error('❌ Supabase init failed:', e);
  // Fallback mock client — จะ log error แทน crash
  supabaseClient = {
    from: () => ({
      select: async () => ({ data: [], error: new Error('Supabase not available') }),
      insert: async () => ({ error: new Error('Supabase not available') }),
      update: async () => ({ error: new Error('Supabase not available') }),
      delete: async () => ({ error: new Error('Supabase not available') }),
      upsert: async () => ({ error: new Error('Supabase not available') }),
      eq: function() { return this; },
      ilike: function() { return this; },
      order: function() { return this; },
      maybeSingle: async () => ({ data: null, error: null }),
    })
  };
}

// ─── Admin password ───
const ADMIN_PASSWORD = 'admin123';
