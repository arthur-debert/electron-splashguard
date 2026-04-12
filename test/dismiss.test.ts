import { describe, it, expect } from 'vitest';
import { resolveDismissPolicy } from '../src/dismiss';

describe('resolveDismissPolicy', () => {
  it('defaults to user (no auto-quit) when undefined', () => {
    expect(resolveDismissPolicy(undefined)).toEqual({ autoQuit: false, afterMs: 0 });
  });

  it('resolves "user" to no auto-quit', () => {
    expect(resolveDismissPolicy('user')).toEqual({ autoQuit: false, afterMs: 0 });
  });

  it('resolves "auto" to immediate quit', () => {
    expect(resolveDismissPolicy('auto')).toEqual({ autoQuit: true, afterMs: 0 });
  });

  it('resolves { mode: "auto", afterMs } to delayed quit', () => {
    expect(resolveDismissPolicy({ mode: 'auto', afterMs: 5000 })).toEqual({
      autoQuit: true,
      afterMs: 5000,
    });
  });

  it('preserves exact afterMs value', () => {
    const result = resolveDismissPolicy({ mode: 'auto', afterMs: 12345 });
    expect(result.afterMs).toBe(12345);
  });
});
