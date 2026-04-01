export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

const levelOrder: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

let currentLevel: LogLevel = 'warn';

function shouldLog(level: LogLevel): boolean {
  return currentLevel !== 'silent' && levelOrder[level] <= levelOrder[currentLevel];
}

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

export function getLogLevel(): LogLevel {
  return currentLevel;
}

export function debugLog(prefix: string, message: string, ...args: unknown[]): void {
  if (!shouldLog('debug')) {
    return;
  }

  console.debug(`[${prefix}] ${message}`, ...args);
}

export function infoLog(prefix: string, message: string, ...args: unknown[]): void {
  if (!shouldLog('info')) {
    return;
  }

  console.info(`[${prefix}] ${message}`, ...args);
}
