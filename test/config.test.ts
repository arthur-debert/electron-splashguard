import { describe, it, expect } from 'vitest';
import { validateConfig } from '../src/config';
import type { SplashGuardConfig } from '../src/types';

function base(): SplashGuardConfig {
  return {
    splash: { content: 'logo.png' },
    main: { loadFile: 'index.html' },
  };
}

describe('validateConfig', () => {
  it('accepts valid minimal config', () => {
    expect(() => validateConfig(base())).not.toThrow();
  });

  it('accepts loadURL instead of loadFile', () => {
    const c = base();
    delete (c.main as any).loadFile;
    c.main.loadURL = 'https://example.com';
    expect(() => validateConfig(c)).not.toThrow();
  });

  it('rejects missing splash', () => {
    const c = { main: { loadFile: 'x.html' } } as any;
    expect(() => validateConfig(c)).toThrow('splash config is required');
  });

  it('rejects missing splash.content', () => {
    const c = base();
    (c.splash as any).content = '';
    expect(() => validateConfig(c)).toThrow('splash.content is required');
  });

  it('rejects missing main', () => {
    const c = { splash: { content: 'x.png' } } as any;
    expect(() => validateConfig(c)).toThrow('main config is required');
  });

  it('rejects missing loadFile and loadURL', () => {
    const c = base();
    delete (c.main as any).loadFile;
    expect(() => validateConfig(c)).toThrow('main.loadFile or main.loadURL is required');
  });

  it('rejects both loadFile and loadURL', () => {
    const c = base();
    c.main.loadURL = 'https://example.com';
    expect(() => validateConfig(c)).toThrow('specify either');
  });

  it('rejects negative minDisplayMs', () => {
    const c = base();
    c.splash.minDisplayMs = -1;
    expect(() => validateConfig(c)).toThrow('minDisplayMs must be >= 0');
  });

  it('rejects zero timeoutMs', () => {
    const c = base();
    c.main.timeoutMs = 0;
    expect(() => validateConfig(c)).toThrow('timeoutMs must be > 0');
  });

  it('rejects negative timeoutMs', () => {
    const c = base();
    c.main.timeoutMs = -5;
    expect(() => validateConfig(c)).toThrow('timeoutMs must be > 0');
  });
});
