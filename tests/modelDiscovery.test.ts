import { describe, it, expect } from 'vitest';
import {
  classifyError,
  fallbackPriority,
  formatModelDisplayName,
  type DiscoveredModel,
} from '../services/modelDiscoveryService';

describe('classifyError', () => {
  it('should classify authentication errors (status 401)', () => {
    const err = { status: 401, message: 'Unauthorized' };
    expect(classifyError(err)).toBe('AUTH');
  });

  it('should classify authentication errors based on message content', () => {
    const err = { status: 200, message: 'Invalid API key provided' };
    expect(classifyError(err)).toBe('AUTH');
  });

  it('should classify retryable errors (e.g., rate limit)', () => {
    const err = { status: 429, message: 'Rate limit exceeded' };
    expect(classifyError(err)).toBe('RETRYABLE');
  });

  it('should classify unknown errors as OTHER', () => {
    const err = { status: 418, message: "I'm a teapot" };
    expect(classifyError(err)).toBe('OTHER');
  });
});

describe('fallbackPriority', () => {
  it('gives higher score to higher version numbers', () => {
    const high = fallbackPriority('gemini-3.8-flash');
    const low = fallbackPriority('gemini-3.5-flash');
    expect(high).toBeGreaterThan(low);
  });

  it('adds a small bonus for "latest" alias', () => {
    const score = fallbackPriority('gemini-flash-latest');
    expect(score).toBe(5); // version 0 * 10 + 5
  });

  it('penalises preview/experimental models heavily', () => {
    const score = fallbackPriority('gemini-3.5-flash-preview');
    // version 3.5 => 35, preview => -100 => -65
    expect(score).toBe(-65);
  });

  it('penalises lite models extremely', () => {
    const score = fallbackPriority('gemini-3.5-flash-lite');
    // version 3.5 => 35, lite => -100000 => -99965
    expect(score).toBe(-99965);
  });

  it('places gemma models at the very bottom', () => {
    const score = fallbackPriority('gemma-3-27b');
    // version 3 => 30, gemma => -1000000 => -999970
    expect(score).toBe(-999970);
  });
});

describe('formatModelDisplayName', () => {
  const discovered: DiscoveredModel[] = [
    {
      id: 'gemini-3.8-flash',
      name: 'gemini-3.8-flash',
      displayName: 'Custom Flash',
      tier: 'flash',
      tierLabel: '⚡ Flash',
    },
  ];

  it('returns discovered model info when modelId matches a discovered model', () => {
    const result = formatModelDisplayName('gemini-3.8-flash', discovered);
    expect(result).toEqual({
      displayName: 'Custom Flash',
      rawId: 'gemini-3.8-flash',
      tierLabel: '⚡ Flash',
    });
  });

  it('uses friendlyMap for known alias IDs', () => {
    const result = formatModelDisplayName('gemini-flash-latest');
    expect(result).toEqual({
      displayName: 'Gemini Flash (alias, Google tự trỏ)',
      rawId: 'gemini-flash-latest',
      tierLabel: '⚡ Flash',
    });
  });

  it('formats unknown IDs into a readable name and assigns tier label', () => {
    const result = formatModelDisplayName('gemini-2.5-pro-preview-0514');
    expect(result.displayName).toBe('Gemini 2.5 Pro Preview 0514');
    expect(result.rawId).toBe('gemini-2.5-pro-preview-0514');
    // "pro" → tier 'pro' → label '🚀 Cao cấp'
    expect(result.tierLabel).toBe('🚀 Cao cấp');
  });

  it('handles empty modelId gracefully', () => {
    const result = formatModelDisplayName('');
    expect(result.displayName).toBe('');
    expect(result.rawId).toBe('');
    expect(result.tierLabel).toBe('🤖 AI Model');
  });
});
