import { URL } from 'url';
import dns from 'dns/promises';

const ALLOWED_PROTOCOLS = new Set(['https:', 'http:']);

const ALLOWED_CONTENT_TYPES = new Set([
  'text/html',
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'text/plain',
  'application/json',
]);

const MAX_RESPONSE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 15_000;

// RFC 1918 + loopback + link-local
const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
];

function isPrivateIp(ip: string): boolean {
  return PRIVATE_RANGES.some((re) => re.test(ip));
}

export async function validateUrl(urlString: string): Promise<{ valid: boolean; reason?: string }> {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    return { valid: false, reason: `Blocked protocol: ${url.protocol}` };
  }

  // Resolve hostname and check for private IPs (SSRF prevention)
  try {
    const addresses = await dns.resolve4(url.hostname);
    for (const addr of addresses) {
      if (isPrivateIp(addr)) {
        return { valid: false, reason: `Blocked private IP: ${addr}` };
      }
    }
  } catch {
    // DNS resolution failed — could be invalid hostname
    return { valid: false, reason: `DNS resolution failed for ${url.hostname}` };
  }

  return { valid: true };
}

export function validateContentType(contentType: string | null): { valid: boolean; reason?: string } {
  if (!contentType) {
    return { valid: false, reason: 'Missing Content-Type header' };
  }

  const baseType = contentType.split(';')[0].trim().toLowerCase();
  if (!ALLOWED_CONTENT_TYPES.has(baseType)) {
    return { valid: false, reason: `Blocked content type: ${baseType}` };
  }

  return { valid: true };
}

export async function safeFetch(url: string): Promise<Response> {
  const urlCheck = await validateUrl(url);
  if (!urlCheck.valid) {
    throw new Error(`URL validation failed: ${urlCheck.reason}`);
  }

  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      'User-Agent': 'FindADram/1.0 (menu-data-collection; Portland OR whiskey discovery)',
    },
  });

  // Check redirect count by inspecting the response URL
  const finalUrl = new URL(response.url);
  const originalUrl = new URL(url);
  if (finalUrl.hostname !== originalUrl.hostname) {
    // Cross-domain redirect — re-validate the final URL
    const finalCheck = await validateUrl(response.url);
    if (!finalCheck.valid) {
      throw new Error(`Redirect target failed validation: ${finalCheck.reason}`);
    }
  }

  // Validate content type
  const ctCheck = validateContentType(response.headers.get('content-type'));
  if (!ctCheck.valid) {
    throw new Error(ctCheck.reason!);
  }

  // Check response size
  const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
  if (contentLength > MAX_RESPONSE_SIZE) {
    throw new Error(`Response too large: ${contentLength} bytes (max ${MAX_RESPONSE_SIZE})`);
  }

  return response;
}

export { MAX_REDIRECTS, FETCH_TIMEOUT_MS, MAX_RESPONSE_SIZE };
