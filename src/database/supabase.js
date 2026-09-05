const { createClient } = require('@supabase/supabase-js');
const { getEnv, getSupabaseKey } = require('../config/env');

let client;

function getClient() {
  if (client) return client;

  const url = getEnv('SUPABASE_URL');
  const serverKey = getSupabaseKey();

  if (!url || !serverKey) {
    throw new Error('Supabase no está configurado. Revisa SUPABASE_URL y SUPABASE_SECRET_KEY (o SUPABASE_SERVICE_ROLE_KEY).');
  }

  client = createClient(url, serverKey, {
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

  return client;
}

// Commands need to expose their definitions to the deploy/validation tools
// without requiring a database connection. The real Supabase client is created
// only when a command actually accesses the database.
module.exports = new Proxy({}, {
  get(_target, property) {
    const value = getClient()[property];
    return typeof value === 'function' ? value.bind(getClient()) : value;
  }
});
