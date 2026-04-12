/** Default headless environment detection */
export function defaultHeadlessDetect(): boolean {
  if (process.env.CI) return true;
  if (process.env.ELECTRON_SPLASH_HEADLESS === '1') return true;
  if (process.platform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) return true;
  if (process.argv.includes('--headless')) return true;
  return false;
}
