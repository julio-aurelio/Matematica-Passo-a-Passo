// Gera public/js/config.js a partir do .env (local) ou das variáveis de ambiente (Vercel).
const fs = require('fs');
if (fs.existsSync('.env')) process.loadEnvFile('.env');
const { SUPABASE_URL, SUPABASE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Defina SUPABASE_URL e SUPABASE_KEY no .env (veja .env.example).');
fs.writeFileSync('public/js/config.js', `window.CONFIG = ${JSON.stringify({ SUPABASE_URL, SUPABASE_KEY }, null, 2)};\n`);
console.log('public/js/config.js gerado');
