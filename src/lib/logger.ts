/**
 * Structured logging for production readiness.
 *
 * Usage:
 *   import { log } from '@/lib/logger';
 *   log.info('User logged in', { userId: '123', email: 'test@example.com' });
 *   log.error('AI engine failed', { engine: 'gemini', error: err.message }, err);
 *   log.warn('Rate limit approaching', { userId: '123', remaining: 2 });
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: string;
  service: string;
}

const SERVICE_NAME = 'mamah';
const isDev = process.env.NODE_ENV !== 'production';

class Logger {
  private context: Record<string, unknown>;

  constructor(initialContext: Record<string, unknown> = {}) {
    this.context = initialContext;
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>, error?: Error | unknown): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: SERVICE_NAME,
      context: { ...this.context, ...data },
    };

    if (error instanceof Error) {
      entry.error = error.message;
      // Include stack in dev
      if (isDev) {
        entry.context!.stack = error.stack;
      }
    } else if (typeof error === 'string') {
      entry.error = error;
    }

    // In production, output JSON for log aggregators (Datadog, CloudWatch, etc.)
    // In dev, use console methods for readability
    if (isDev) {
      const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
      const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
      const err = entry.error ? ` | Error: ${entry.error}` : '';
      switch (level) {
        case 'debug':
          console.debug(`${prefix} ${message}${ctx}${err}`);
          break;
        case 'info':
          console.log(`${prefix} ${message}${ctx}${err}`);
          break;
        case 'warn':
          console.warn(`${prefix} ${message}${ctx}${err}`);
          break;
        case 'error':
          console.error(`${prefix} ${message}${ctx}${err}`);
          break;
      }
    } else {
      console.log(JSON.stringify(entry));
    }
  }

  debug(message: string, data?: Record<string, unknown>) {
    this.log('debug', message, data);
  }

  info(message: string, data?: Record<string, unknown>) {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>) {
    this.log('warn', message, data);
  }

  error(message: string, data?: Record<string, unknown>, error?: Error | unknown) {
    this.log('error', message, data, error);
  }

  /** Create a child logger with additional context */
  child(additionalContext: Record<string, unknown>): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }
}

/** Default logger instance */
export const log = new Logger();

/**
 * Create a named logger for a specific module.
 * Example: const logger = createLogger('ai-engine');
 */
export function createLogger(module: string): Logger {
  return new Logger({ module });
}