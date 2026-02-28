import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local
try {
  const envPath = resolve(process.cwd(), '.env.local');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
} catch { /* rely on existing env */ }

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const h = { 'apikey': key, 'Authorization': 'Bearer ' + key };

const [bars, links, whiskeys] = await Promise.all([
  fetch(url + '/rest/v1/bars?select=id,name,city,state&order=name', { headers: h }).then(r => r.json()),
  fetch(url + '/rest/v1/bar_whiskeys?select=bar_id,whiskey_id', { headers: h }).then(r => r.json()),
  fetch(url + '/rest/v1/whiskeys?select=id,name,type&order=name', { headers: h }).then(r => r.json()),
]);

const counts = {};
links.forEach(l => { counts[l.bar_id] = (counts[l.bar_id] || 0) + 1; });

console.log('=== BARS WITH WHISKEY COUNTS ===\n');
const portland = bars.filter(b => b.state === 'OR');
const other = bars.filter(b => b.state !== 'OR');

console.log(`Portland bars (${portland.length}):`);
portland.forEach(b => console.log(`  ${(counts[b.id] || 0).toString().padStart(3)}  ${b.name}`));

console.log(`\nOther bars (${other.length}):`);
other.forEach(b => console.log(`  ${(counts[b.id] || 0).toString().padStart(3)}  ${b.name} - ${b.city}, ${b.state}`));

console.log('\n=== WHISKEY TYPES ===');
const types = {};
whiskeys.forEach(w => { types[w.type] = (types[w.type] || 0) + 1; });
Object.entries(types).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => console.log(`  ${c.toString().padStart(3)}  ${t}`));

const emptyBars = bars.filter(b => !counts[b.id]);
console.log(`\n=== ${emptyBars.length} BARS WITH ZERO WHISKEYS ===`);
emptyBars.forEach(b => console.log(`  ${b.name} (${b.city}, ${b.state})`));

console.log(`\nTOTAL: ${bars.length} bars, ${whiskeys.length} whiskeys, ${links.length} links`);
