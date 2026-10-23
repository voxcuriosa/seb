// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { runPrivacyGuard } from '../../scripts/privacy-guard.mjs';

describe('personvernvakt', () => {
  it('elevarbeid kan ikke forlate nettleseren', () => {
    expect(runPrivacyGuard()).toEqual([]);
  });
});
