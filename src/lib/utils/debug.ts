// Debug logging utility
// Only logs in development mode to prevent console pollution in production

const IS_DEV = process.env.NODE_ENV === 'development';

/**
 * Development-only console.log wrapper
 * Logs are stripped in production builds
 */
export function debugLog(prefix: string, ...args: unknown[]): void {
    if (IS_DEV) {
        console.log(`[${prefix}]`, ...args);
    }
}

/**
 * Development-only console.warn wrapper
 */
export function debugWarn(prefix: string, ...args: unknown[]): void {
    if (IS_DEV) {
        console.warn(`[${prefix}]`, ...args);
    }
}

/**
 * Always logs errors (needed for debugging in production)
 */
export function debugError(prefix: string, ...args: unknown[]): void {
    console.error(`[${prefix}]`, ...args);
}
