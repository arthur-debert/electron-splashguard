import type { DismissPolicy } from './types';

export interface DismissResolution {
  autoQuit: boolean;
  afterMs: number;
}

export function resolveDismissPolicy(policy: DismissPolicy | undefined): DismissResolution {
  if (!policy || policy === 'user') {
    return { autoQuit: false, afterMs: 0 };
  }
  if (policy === 'auto') {
    return { autoQuit: true, afterMs: 0 };
  }
  return { autoQuit: true, afterMs: policy.afterMs };
}
