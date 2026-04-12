import type { BrowserWindowConstructorOptions } from 'electron';

export interface SplashConfig {
  /** Path to an image file (png, jpg, svg) or HTML file to show */
  content: string;
  width?: number;
  height?: number;
  /** Background color for the splash window (CSS color) */
  background?: string;
  /** Show a status text line below the splash content */
  showStatus?: boolean;
  /** Minimum time (ms) to show splash, avoids flash */
  minDisplayMs?: number;
}

export interface MainConfig {
  /** Path to the HTML file to load as the main app */
  loadFile?: string;
  /** URL to load as the main app */
  loadURL?: string;
  /** Extra BrowserWindow constructor options */
  browserWindowOptions?: BrowserWindowConstructorOptions;
  /** IPC channel name the app sends when truly ready (optional) */
  readySignal?: string;
  /** Max ms to wait for the app to become ready before treating as failure */
  timeoutMs?: number;
}

export type DismissPolicy =
  | 'user'      // error window stays open until user closes
  | 'auto'      // quit immediately after logging
  | { mode: 'auto'; afterMs: number }; // show error, auto-quit after countdown

export interface GitHubIssueConfig {
  user: string;
  repo: string;
  labels?: string[];
  template?: (err: ErrorContext) => string;
}

export interface ErrorConfig {
  title?: string;
  logger?: (err: Error, ctx: ErrorContext) => void;
  /** Path to a log file to show in the error view */
  logPath?: string;
  copyToClipboard?: boolean;
  githubIssue?: GitHubIssueConfig;
  dismiss?: DismissPolicy;
}

export interface HeadlessConfig {
  detect?: () => boolean;
  onError?: (err: Error, ctx: ErrorContext) => void;
}

export interface SplashGuardConfig {
  splash: SplashConfig;
  main: MainConfig;
  errors?: ErrorConfig;
  headless?: HeadlessConfig;
}

export interface ErrorContext {
  appVersion: string;
  electronVersion: string;
  platform: string;
  arch: string;
  errorType: 'load-failure' | 'renderer-crash' | 'uncaught-exception' | 'timeout';
  logPath?: string;
}

export interface StatusUpdate {
  text: string;
  progress?: number; // 0..1
}
