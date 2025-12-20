// Database module exports
export * from './templates';
export * from './campaigns';
export * from './categories';
export * from './tags';
export * from './dashboard';
export * from './fonts';

// Export utils separately to avoid naming conflicts with generateSlug
export {
    DatabaseError,
    DuplicateEntryError,
    ForeignKeyError,
    NotFoundError,
    UnauthorizedError,
    parseDbError,
    logDbError,
    isValidUUID,
    withRetry,
    type DbOperation,
} from './utils';
