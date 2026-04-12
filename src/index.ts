export { SplashGuard } from './splash-guard';
export type {
  SplashGuardConfig,
  SplashConfig,
  MainConfig,
  ErrorConfig,
  HeadlessConfig,
  GitHubIssueConfig,
  DismissPolicy,
  ErrorContext,
  StatusUpdate,
} from './types';

/** Convenience factory */
export function createSplashGuard(config: import('./types').SplashGuardConfig): import('./splash-guard').SplashGuard {
  return new (require('./splash-guard').SplashGuard)(config);
}
