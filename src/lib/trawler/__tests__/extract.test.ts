import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// We mock the trawler client module before importing extract so that
// getAnthropicClient() never attempts a real network call.
// ---------------------------------------------------------------------------
vi.mock('../client', () => ({
  getAnthropicClient: vi.fn(),
  MODELS: {
    TEXT_EXTRACTION: 'claude-haiku-4-5-20251001',
    VISION_EXTRACTION: 'claude-sonnet-4-6',
    DEDUP_JUDGE: 'claude-haiku-4-5-20251001',
  },
}));

import { getAnthropicClient } from '../client';
import { extractFromText, extractFromImage, judgeDedup } from '../extract';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal Anthropic-style messages.create mock that returns `text`. */
function buildAnthropicMock(text: string) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text }],
      }),
    },
  };
}

/** Build a mock whose create call rejects with the given error. */
function buildFailingMock(error: Error) {
  return {
    messages: {
      create: vi.fn().mockRejectedValue(error),
    },
  };
}

// ---------------------------------------------------------------------------
// extractFromText
// ---------------------------------------------------------------------------

describe('extractFromText', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns extracted whiskeys when API returns valid JSON', async () => {
    const payload = {
      bar_name: 'The Dram',
      whiskeys: [
        { name: 'Buffalo Trace', type: 'bourbon', price: 9 },
        { name: 'Ardbeg 10', type: 'scotch', price: 14 },
      ],
    };
    const mock = buildAnthropicMock(JSON.stringify(payload));
    vi.mocked(getAnthropicClient).mockReturnValue(mock as never);

    const result = await extractFromText('<html>some menu html</html>');

    expect(result.extraction_method).toBe('text');
    expect(result.confidence).toBe(0.8);
    expect(result.whiskeys).toHaveLength(2);
    expect(result.whiskeys[0].name).toBe('Buffalo Trace');
    expect(result.whiskeys[1].name).toBe('Ardbeg 10');
  });

  it('returns empty whiskeys when API returns non-JSON text', async () => {
    const mock = buildAnthropicMock('Sorry, I could not find any whiskeys.');
    vi.mocked(getAnthropicClient).mockReturnValue(mock as never);

    const result = await extractFromText('<html></html>');

    expect(result.extraction_method).toBe('text');
    expect(result.confidence).toBe(0);
    expect(result.whiskeys).toEqual([]);
  });

  it('returns empty whiskeys when JSON is malformed', async () => {
    const mock = buildAnthropicMock('{ this is not valid json }}');
    vi.mocked(getAnthropicClient).mockReturnValue(mock as never);

    const result = await extractFromText('<html>bad</html>');

    expect(result.whiskeys).toEqual([]);
    expect(result.confidence).toBe(0);
  });

  it('returns empty whiskeys when API response content is empty', async () => {
    vi.mocked(getAnthropicClient).mockReturnValue({
      messages: {
        create: vi.fn().mockResolvedValue({ content: [] }),
      },
    } as never);

    const result = await extractFromText('<html></html>');
    expect(result.whiskeys).toEqual([]);
  });

  it('propagates API errors (does not silently swallow them)', async () => {
    const mock = buildFailingMock(new Error('Network timeout'));
    vi.mocked(getAnthropicClient).mockReturnValue(mock as never);

    await expect(extractFromText('<html></html>')).rejects.toThrow('Network timeout');
  });

  it('truncates HTML longer than 50000 characters before sending', async () => {
    const mock = buildAnthropicMock('{}');
    vi.mocked(getAnthropicClient).mockReturnValue(mock as never);

    const longHtml = 'x'.repeat(100_000);
    await extractFromText(longHtml);

    const callArg = mock.messages.create.mock.calls[0][0];
    const userContent: string = callArg.messages[0].content;
    // The content sent must not exceed the truncation length + some prefix chars
    expect(userContent.length).toBeLessThan(55_000);
  });

  it('returns bar_name from the API payload when present', async () => {
    const payload = { bar_name: 'Multnomah Whiskey Library', whiskeys: [] };
    const mock = buildAnthropicMock(JSON.stringify(payload));
    vi.mocked(getAnthropicClient).mockReturnValue(mock as never);

    const result = await extractFromText('<html>menu</html>');
    expect(result.bar_name).toBe('Multnomah Whiskey Library');
  });

  it('handles JSON embedded in surrounding prose', async () => {
    const payload = { whiskeys: [{ name: 'Lagavulin 16' }] };
    const wrappedText = `Here is the JSON you requested:\n${JSON.stringify(payload)}\nHope that helps.`;
    const mock = buildAnthropicMock(wrappedText);
    vi.mocked(getAnthropicClient).mockReturnValue(mock as never);

    const result = await extractFromText('<html>menu</html>');
    expect(result.whiskeys).toHaveLength(1);
    expect(result.whiskeys[0].name).toBe('Lagavulin 16');
  });
});

// ---------------------------------------------------------------------------
// extractFromImage
// ---------------------------------------------------------------------------

describe('extractFromImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns extracted whiskeys when API returns valid JSON', async () => {
    const payload = {
      whiskeys: [{ name: 'Glenfiddich 12', type: 'scotch', price: 12 }],
    };
    const mock = buildAnthropicMock(JSON.stringify(payload));
    vi.mocked(getAnthropicClient).mockReturnValue(mock as never);

    const result = await extractFromImage('base64data==', 'image/jpeg');

    expect(result.extraction_method).toBe('vision');
    expect(result.confidence).toBe(0.7);
    expect(result.whiskeys).toHaveLength(1);
    expect(result.whiskeys[0].name).toBe('Glenfiddich 12');
  });

  it('returns empty whiskeys when API returns non-JSON text', async () => {
    const mock = buildAnthropicMock('I cannot read this image.');
    vi.mocked(getAnthropicClient).mockReturnValue(mock as never);

    const result = await extractFromImage('base64data==', 'image/png');

    expect(result.extraction_method).toBe('vision');
    expect(result.confidence).toBe(0);
    expect(result.whiskeys).toEqual([]);
  });

  it('returns empty whiskeys when JSON is invalid', async () => {
    const mock = buildAnthropicMock('{ invalid }');
    vi.mocked(getAnthropicClient).mockReturnValue(mock as never);

    const result = await extractFromImage('base64data==', 'image/webp');
    expect(result.whiskeys).toEqual([]);
  });

  it('propagates API errors', async () => {
    const mock = buildFailingMock(new Error('Rate limit exceeded'));
    vi.mocked(getAnthropicClient).mockReturnValue(mock as never);

    await expect(extractFromImage('base64data==', 'image/jpeg')).rejects.toThrow(
      'Rate limit exceeded'
    );
  });

  it('passes the correct mime type to the API', async () => {
    const payload = { whiskeys: [] };
    const mock = buildAnthropicMock(JSON.stringify(payload));
    vi.mocked(getAnthropicClient).mockReturnValue(mock as never);

    await extractFromImage('base64data==', 'image/gif');

    const callArg = mock.messages.create.mock.calls[0][0];
    const imageBlock = callArg.messages[0].content[0];
    expect(imageBlock.source.media_type).toBe('image/gif');
  });

  it('passes base64 data to the API', async () => {
    const payload = { whiskeys: [] };
    const mock = buildAnthropicMock(JSON.stringify(payload));
    vi.mocked(getAnthropicClient).mockReturnValue(mock as never);

    await extractFromImage('myBase64String', 'image/png');

    const callArg = mock.messages.create.mock.calls[0][0];
    const imageBlock = callArg.messages[0].content[0];
    expect(imageBlock.source.data).toBe('myBase64String');
    expect(imageBlock.source.type).toBe('base64');
  });
});

// ---------------------------------------------------------------------------
// judgeDedup
// ---------------------------------------------------------------------------

describe('judgeDedup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when API says same_whiskey with high confidence', async () => {
    const payload = { same_whiskey: true, confidence: 0.95, reasoning: 'Same product.' };
    const mock = buildAnthropicMock(JSON.stringify(payload));
    vi.mocked(getAnthropicClient).mockReturnValue(mock as never);

    const result = await judgeDedup('Macallan 12 YO', 'Macallan 12 Year Old');
    expect(result).toBe(true);
  });

  it('returns false when same_whiskey is true but confidence is low', async () => {
    const payload = { same_whiskey: true, confidence: 0.5, reasoning: 'Maybe the same.' };
    const mock = buildAnthropicMock(JSON.stringify(payload));
    vi.mocked(getAnthropicClient).mockReturnValue(mock as never);

    const result = await judgeDedup('Ardbeg 10', 'Ardbeg Something');
    expect(result).toBe(false);
  });

  it('returns false when same_whiskey is false', async () => {
    const payload = { same_whiskey: false, confidence: 0.99, reasoning: 'Different products.' };
    const mock = buildAnthropicMock(JSON.stringify(payload));
    vi.mocked(getAnthropicClient).mockReturnValue(mock as never);

    const result = await judgeDedup('Lagavulin 16', 'Lagavulin 8');
    expect(result).toBe(false);
  });

  it('returns false when API returns non-JSON text', async () => {
    const mock = buildAnthropicMock('I cannot determine this.');
    vi.mocked(getAnthropicClient).mockReturnValue(mock as never);

    const result = await judgeDedup('A', 'B');
    expect(result).toBe(false);
  });

  it('returns false when API returns invalid JSON', async () => {
    const mock = buildAnthropicMock('{ broken json');
    vi.mocked(getAnthropicClient).mockReturnValue(mock as never);

    const result = await judgeDedup('A', 'B');
    expect(result).toBe(false);
  });

  it('propagates API errors', async () => {
    const mock = buildFailingMock(new Error('Service unavailable'));
    vi.mocked(getAnthropicClient).mockReturnValue(mock as never);

    await expect(judgeDedup('A', 'B')).rejects.toThrow('Service unavailable');
  });

  it('uses exactly the confidence threshold of 0.7', async () => {
    // Exactly 0.7 should NOT pass (condition is > 0.7)
    const payload = { same_whiskey: true, confidence: 0.7, reasoning: 'Borderline.' };
    const mock = buildAnthropicMock(JSON.stringify(payload));
    vi.mocked(getAnthropicClient).mockReturnValue(mock as never);

    const result = await judgeDedup('A', 'A');
    expect(result).toBe(false);
  });
});
