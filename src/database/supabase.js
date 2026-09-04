const { createClient } = require('@supabase/supabase-js');
const { getEnv, getSupabaseKey } = require('../config/env');

const url = getEnv('SUPABASE_URL');
const serverKey = getSupabaseKey();

if (!url || !serverKey) {
  throw new Error('Supabase no está configurado. Revisa SUPABASE_URL y SUPABASE_SECRET_KEY (o SUPABASE_SERVICE_ROLE_KEY).');
}

const supabase = createClient(url, serverKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'X-Client-Info': 'hypnox-bot/1.0'
    }
  }
});

module.exports = supabase;
