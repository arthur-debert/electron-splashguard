import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { defaultHeadlessDetect } from '../src/headless';

describe('defaultHeadlessDetect', () => {
  const origEnv = { ...process.env };
  const origArgv = [...process.argv];
  const origPlatform = process.platform;

  beforeEach(() => {
    delete process.env.CI;
    delete process.env.ELECTRON_SPLASH_HEADLESS;
    delete process.env.DISPLAY;
    delete process.env.WAYLAND_DISPLAY;
    process.argv = ['node', 'app.js'];
  });

  afterEach(() => {
    process.env = { ...origEnv };
    process.argv = origArgv;
    Object.defineProperty(process, 'platform', { value: origPlatform });
  });

  it('returns false with no CI indicators', () => {
    // On macOS (our test env), no DISPLAY check applies
    expect(defaultHeadlessDetect()).toBe(false);
  });

  it('returns true when CI env is set', () => {
    process.env.CI = 'true';
    expect(defaultHeadlessDetect()).toBe(true);
  });

  it('returns true when ELECTRON_SPLASH_HEADLESS=1', () => {
    process.env.ELECTRON_SPLASH_HEADLESS = '1';
    expect(defaultHeadlessDetect()).toBe(true);
  });

  it('returns true when --headless argv is present', () => {
    process.argv.push('--headless');
    expect(defaultHeadlessDetect()).toBe(true);
  });

  it('returns true on linux with no DISPLAY and no WAYLAND_DISPLAY', () => {
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    delete process.env.DISPLAY;
    delete process.env.WAYLAND_DISPLAY;
    expect(defaultHeadlessDetect()).toBe(true);
  });

  it('returns false on linux when DISPLAY is set', () => {
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    process.env.DISPLAY = ':0';
    expect(defaultHeadlessDetect()).toBe(false);
  });

  it('returns false on linux when WAYLAND_DISPLAY is set', () => {
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    process.env.WAYLAND_DISPLAY = 'wayland-0';
    expect(defaultHeadlessDetect()).toBe(false);
  });
});
