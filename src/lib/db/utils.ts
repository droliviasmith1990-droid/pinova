/**
 * Database Utilities
 * 
 * Centralized error handling and utility functions for database operations.
 * Provides consistent error types and helper functions across all db modules.
 */

// ============================================
// Error Types
// ============================================

/**
 * Database operation types
 */
export type DbOperation = 'select' | 'insert' | 'update' | 'delete';

/**
 * Custom database error with structured information
 */
export class DatabaseError extends Error {
    public readonly code: string;
    public readonly table: string;
    public readonly operation: DbOperation;
    public readonly originalError: unknown;

    constructor(
        message: string,
        options: {
            code?: string;
            table: string;
            operation: DbOperation;
            originalError?: unknown;
        }
    ) {
        super(message);
        this.name = 'DatabaseError';
        this.code = options.code || 'UNKNOWN';
        this.table = options.table;
        this.operation = options.operation;
        this.originalError = options.originalError;
    }
}

/**
 * Specific error for duplicate key violations
 */
export class DuplicateEntryError extends DatabaseError {
    constructor(table: string, field?: string) {
        super(
            field 
                ? `A ${table} with this ${field} already exists`
                : `Duplicate entry in ${table}`,
            { code: 'DUPLICATE', table, operation: 'insert' }
        );
        this.name = 'DuplicateEntryError';
    }
}

/**
 * Specific error for foreign key violations
 */
export class ForeignKeyError extends DatabaseError {
    constructor(table: string, referencedTable?: string) {
        super(
            referencedTable
                ? `Referenced ${referencedTable} does not exist`
                : `Foreign key constraint violation in ${table}`,
            { code: 'FK_VIOLATION', table, operation: 'insert' }
        );
        this.name = 'ForeignKeyError';
    }
}

/**
 * Specific error for not found
 */
export class NotFoundError extends DatabaseError {
    constructor(table: string, id?: string) {
        super(
            id ? `${table} with id ${id} not found` : `${table} not found`,
            { code: 'NOT_FOUND', table, operation: 'select' }
        );
        this.name = 'NotFoundError';
    }
}

/**
 * Specific error for unauthorized access
 */
export class UnauthorizedError extends DatabaseError {
    constructor(table: string) {
        super(
            `Unauthorized access to ${table}`,
            { code: 'UNAUTHORIZED', table, operation: 'select' }
        );
        this.name = 'UnauthorizedError';
    }
}

// ============================================
// Error Code Mapping
// ============================================

/**
 * PostgreSQL error codes
 * @see https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
const PG_ERROR_CODES = {
    UniqueViolation: '23505',
    ForeignKeyViolation: '23503',
    NotNullViolation: '23502',
    CheckViolation: '23514',
} as const;

/**
 * Parse a Supabase/PostgreSQL error into a structured DatabaseError
 */
export function parseDbError(
    error: unknown,
    table: string,
    operation: DbOperation
): DatabaseError {
    // Handle PostgreSQL errors
    if (typeof error === 'object' && error !== null && 'code' in error) {
        const pgError = error as { code: string; message?: string; details?: string };
        
        switch (pgError.code) {
            case PG_ERROR_CODES.UniqueViolation:
                return new DuplicateEntryError(table);
            
            case PG_ERROR_CODES.ForeignKeyViolation:
                return new ForeignKeyError(table);
            
            default:
                return new DatabaseError(
                    pgError.message || `Database error in ${table}`,
                    { code: pgError.code, table, operation, originalError: error }
                );
        }
    }

    // Handle generic errors
    if (error instanceof Error) {
        return new DatabaseError(error.message, {
            code: 'UNKNOWN',
            table,
            operation,
            originalError: error,
        });
    }

    // Fallback for unknown error types
    return new DatabaseError(`Unknown error in ${table}`, {
        code: 'UNKNOWN',
        table,
        operation,
        originalError: error,
    });
}

// ============================================
// Helper Functions
// ============================================

/**
 * Safe error logger that extracts useful information
 */
export function logDbError(
    error: unknown,
    context: { table: string; operation: DbOperation; additionalInfo?: Record<string, unknown> }
): void {
    const { table, operation, additionalInfo } = context;
    
    console.error(`[DB Error] ${operation.toUpperCase()} on ${table}:`, {
        error,
        ...(additionalInfo || {}),
    });
}

/**
 * Generate a URL-friendly slug from a string
 */
export function generateSlug(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')  // Remove non-word chars (except spaces and dashes)
        .replace(/[\s_-]+/g, '-')   // Replace spaces and underscores with dashes
        .replace(/^-+|-+$/g, '');   // Remove leading/trailing dashes
}

/**
 * Validate UUID format
 */
export function isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

/**
 * Retry a database operation with exponential backoff
 */
export async function withRetry<T>(
    operation: () => Promise<T>,
    options: {
        maxRetries?: number;
        initialDelay?: number;
        maxDelay?: number;
        retryOn?: (error: unknown) => boolean;
    } = {}
): Promise<T> {
    const {
        maxRetries = 3,
        initialDelay = 100,
        maxDelay = 2000,
        retryOn = () => true,
    } = options;

    let lastError: unknown;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            
            if (attempt === maxRetries || !retryOn(error)) {
                throw error;
            }

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));
            delay = Math.min(delay * 2, maxDelay);
        }
    }

    throw lastError;
}
