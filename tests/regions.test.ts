// Entire test file for climateRegion and isSeaObserved
import { describe, it, expect } from 'vitest';
import { climateRegion } from '../services/cloudScoreEngine';
import { isSeaObserved } from '../services/fieldReportService';

describe('climateRegion', () => {
  it('returns NORTH for lat >= 17.5', () => {
    expect(climateRegion(18)).toBe('NORTH');
    expect(climateRegion(17.5)).toBe('NORTH');
  });

  it('returns CENTRAL for 15.5 <= lat < 17.5', () => {
    expect(climateRegion(16)).toBe('CENTRAL');
    expect(climateRegion(15.5)).toBe('CENTRAL');
  });

  it('returns SOUTH for lat < 15.5', () => {
    expect(climateRegion(14)).toBe('SOUTH');
    expect(climateRegion(0)).toBe('SOUTH');
    expect(climateRegion(-5)).toBe('SOUTH');
  });

  it('returns NORTH when lat is undefined or not a number', () => {
    expect(climateRegion(undefined)).toBe('NORTH');
    expect(climateRegion(null as any)).toBe('NORTH');
    expect(climateRegion(NaN)).toBe('SOUTH'); // NaN is a number, so it goes to numeric checks
    expect(climateRegion('18' as any)).toBe('NORTH');
  });
});

describe('isSeaObserved', () => {
  it('returns true for BELOW and AT_EYE', () => {
    expect(isSeaObserved({ seaLevel: 'BELOW' } as any)).toBe(true);
    expect(isSeaObserved({ seaLevel: 'AT_EYE' } as any)).toBe(true);
  });

  it('returns false for ABOVE, NONE, and other values', () => {
    expect(isSeaObserved({ seaLevel: 'ABOVE' } as any)).toBe(false);
    expect(isSeaObserved({ seaLevel: 'NONE' } as any)).toBe(false);
    expect(isSeaObserved({ seaLevel: 'UNKNOWN' } as any)).toBe(false);
  });

  it('returns false when seaLevel is missing or null', () => {
    expect(isSeaObserved({} as any)).toBe(false);
    expect(isSeaObserved({ seaLevel: null } as any)).toBe(false);
  });

  it('returns false for other falsy values', () => {
    expect(isSeaObserved({ seaLevel: '' } as any)).toBe(false);
    expect(isSeaObserved({ seaLevel: 0 } as any)).toBe(false);
  });
});
