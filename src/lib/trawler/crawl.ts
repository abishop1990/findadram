/**
 * Try to crawl a URL with Puppeteer for JS-rendered content.
 * Falls back gracefully if Puppeteer isn't available (it's a devDependency).
 */
export async function crawlWithBrowser(url: string): Promise<string> {
  // Dynamic import — Puppeteer is a devDependency, may not be available
  let puppeteer: typeof import('puppeteer');
  try {
    puppeteer = await import('puppeteer');
  } catch {
    throw new Error('Puppeteer not available');
  }

  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 20000,
    });

    // Wait a bit for any lazy-loaded content
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Extract text content from the page
    const text = await page.evaluate(() => {
      // Remove script, style, nav, footer elements
      const removes = document.querySelectorAll('script, style, nav, footer, header, noscript');
      removes.forEach((el) => el.remove());
      return document.body?.innerText || '';
    });

    return text.replace(/\s+/g, ' ').trim();
  } finally {
    await browser.close();
  }
}

/**
 * Crawl a URL — tries Puppeteer first for JS-rendered content, falls back to fetch.
 */
export async function crawlUrl(url: string): Promise<string> {
  // Try Puppeteer first for JS-rendered menus
  try {
    const text = await crawlWithBrowser(url);
    if (text.length > 100) {
      return text;
    }
  } catch {
    // Puppeteer not available or failed — fall back to fetch
  }

  // Fallback: plain fetch
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; FindADram/1.0; +https://findadram.com)',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  return stripHtmlNoise(html);
}

function stripHtmlNoise(html: string): string {
  // Remove script and style tags and their contents
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '');

  // Remove HTML tags but keep content
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');

  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Decode common HTML entities
  cleaned = cleaned
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  return cleaned;
}
