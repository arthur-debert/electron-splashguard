import type { SplashGuardConfig } from './types';

export function validateConfig(config: SplashGuardConfig): void {
  if (!config.splash) throw new Error('splash-guard: splash config is required');
  if (!config.splash.content) throw new Error('splash-guard: splash.content is required');
  if (!config.main) throw new Error('splash-guard: main config is required');
  if (!config.main.loadFile && !config.main.loadURL) {
    throw new Error('splash-guard: main.loadFile or main.loadURL is required');
  }
  if (config.main.loadFile && config.main.loadURL) {
    throw new Error('splash-guard: specify either main.loadFile or main.loadURL, not both');
  }
  if (config.splash.minDisplayMs !== undefined && config.splash.minDisplayMs < 0) {
    throw new Error('splash-guard: splash.minDisplayMs must be >= 0');
  }
  if (config.main.timeoutMs !== undefined && config.main.timeoutMs <= 0) {
    throw new Error('splash-guard: main.timeoutMs must be > 0');
  }
}
