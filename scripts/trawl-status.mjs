#!/usr/bin/env node
/**
 * Check trawl job status and logs.
 *
 * Usage:
 *   node scripts/trawl-status.mjs              # last 20 jobs
 *   node scripts/trawl-status.mjs --failed     # only failed jobs
 *   node scripts/trawl-status.mjs --running    # only pending/processing
 *   node scripts/trawl-status.mjs <job-id>     # single job detail
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local without requiring dotenv
try {
  const envPath = resolve(import.meta.dirname, '..', '.env.local');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch { /* .env.local may not exist — rely on existing env vars */ }

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key);
const arg = process.argv[2];

// ── Single job detail ──────────────────────────────────────────────────────────

if (arg && !arg.startsWith('--')) {
  const { data: job, error } = await supabase
    .from('trawl_jobs')
    .select('*, bar:bars(name)')
    .eq('id', arg)
    .single();

  if (error || !job) {
    console.error(`Job not found: ${arg}`);
    process.exit(1);
  }

  console.log(`\n  Job ${job.id}`);
  console.log(`  ${'─'.repeat(50)}`);
  console.log(`  Status:       ${statusBadge(job.status)}`);
  console.log(`  Bar:          ${job.bar?.name || '(no bar linked)'}`);
  console.log(`  Source URL:    ${job.source_url || '—'}`);
  console.log(`  Source type:   ${job.source_type || '—'}`);
  console.log(`  Whiskeys:     ${job.whiskey_count ?? '—'}`);
  console.log(`  Created:      ${fmt(job.created_at)}`);
  console.log(`  Scraped:      ${fmt(job.scraped_at)}`);
  console.log(`  Source date:   ${fmt(job.source_date)}`);
  console.log(`  Attribution:   ${job.source_attribution || '—'}`);
  console.log(`  Content hash:  ${job.content_hash ? job.content_hash.slice(0, 16) + '...' : '—'}`);
  if (job.error) {
    console.log(`  Error:        ${job.error}`);
  }
  if (job.result) {
    const whiskeys = job.result.whiskeys || job.result.items || [];
    if (whiskeys.length > 0) {
      console.log(`\n  Extracted whiskeys (${whiskeys.length}):`);
      for (const w of whiskeys.slice(0, 20)) {
        const price = w.price ? ` — $${w.price}` : '';
        console.log(`    - ${w.name}${price}`);
      }
      if (whiskeys.length > 20) console.log(`    ... and ${whiskeys.length - 20} more`);
    }
  }
  console.log();
  process.exit(0);
}

// ── Job list ───────────────────────────────────────────────────────────────────

let query = supabase
  .from('trawl_jobs')
  .select('id, status, source_url, source_type, whiskey_count, error, created_at, scraped_at, bar:bars(name)')
  .order('created_at', { ascending: false })
  .limit(30);

if (arg === '--failed') {
  query = query.eq('status', 'failed');
} else if (arg === '--running') {
  query = query.in('status', ['pending', 'processing']);
}

const { data: jobs, error } = await query;

if (error) {
  console.error('Query failed:', error.message);
  process.exit(1);
}

if (!jobs || jobs.length === 0) {
  console.log('\n  No trawl jobs found.\n');
  process.exit(0);
}

// Summary counts
const counts = { pending: 0, processing: 0, completed: 0, failed: 0 };
for (const j of jobs) counts[j.status] = (counts[j.status] || 0) + 1;

console.log(`\n  Trawl Jobs (${jobs.length} shown)`);
console.log(`  ${'─'.repeat(70)}`);
console.log(`  ${counts.completed} completed  |  ${counts.failed} failed  |  ${counts.processing} processing  |  ${counts.pending} pending\n`);

for (const job of jobs) {
  const bar = job.bar?.name || '—';
  const url = job.source_url ? truncate(job.source_url.replace(/^https?:\/\//, ''), 40) : '—';
  const whiskeys = job.whiskey_count != null ? `${job.whiskey_count} whiskeys` : '';
  const err = job.error ? ` ERR: ${truncate(job.error, 50)}` : '';
  console.log(`  ${statusBadge(job.status)}  ${fmt(job.created_at)}  ${pad(bar, 28)}  ${pad(url, 42)}  ${whiskeys}${err}`);
}

console.log(`\n  Run with a job ID for full detail: node scripts/trawl-status.mjs <id>\n`);

// ── Helpers ────────────────────────────────────────────────────────────────────

function statusBadge(s) {
  const badges = {
    completed:  '\x1b[32m DONE \x1b[0m',
    failed:     '\x1b[31m FAIL \x1b[0m',
    processing: '\x1b[33m WORK \x1b[0m',
    pending:    '\x1b[36m WAIT \x1b[0m',
  };
  return badges[s] || ` ${s} `;
}

function fmt(dateStr) {
  if (!dateStr) return '—'.padEnd(16);
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).padEnd(16);
}

function truncate(str, len) {
  return str.length > len ? str.slice(0, len - 1) + '…' : str;
}

function pad(str, len) {
  return str.length > len ? str.slice(0, len - 1) + '…' : str.padEnd(len);
}
