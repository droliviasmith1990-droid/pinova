/**
 * Humanized error messages utility
 * Converts technical error messages into user-friendly language
 */

// Common error patterns and their friendly equivalents
const errorPatterns: Record<string, string> = {
    // Network errors
    'Failed to fetch': 'We couldn\'t connect to the server. Please check your internet connection and try again.',
    'Network Error': 'Connection lost. Please check your network and try again.',
    'NetworkError': 'Connection lost. Please check your network and try again.',
    'net::ERR_': 'Network connection failed. Please check your internet.',
    'ECONNREFUSED': 'Server is temporarily unavailable. Please try again later.',
    'ETIMEDOUT': 'The request took too long. Please try again.',

    // Auth errors
    'Invalid login credentials': 'The email or password you entered is incorrect.',
    'Email not confirmed': 'Please check your email to verify your account before signing in.',
    'User already registered': 'An account with this email already exists. Try signing in instead.',
    'Invalid email': 'Please enter a valid email address.',
    'Password should be at least': 'Password must be at least 6 characters long.',
    'JWT expired': 'Your session has expired. Please sign in again.',
    'Invalid token': 'Your session is invalid. Please sign in again.',

    // File errors
    'File too large': 'This file is too big. Please use a file smaller than 5MB.',
    'Invalid file type': 'This file type isn\'t supported. Please use a different format.',
    'Failed to parse CSV': 'We couldn\'t read this CSV file. Please check the format and try again.',
    'Failed to read file': 'We couldn\'t open this file. Please try again.',

    // Database errors
    'duplicate key': 'This item already exists. Please use a different name.',
    'violates foreign key': 'This item is linked to other data and cannot be modified.',
    'null value in column': 'Some required information is missing. Please fill in all required fields.',
    'permission denied': 'You don\'t have permission to do this action.',
    'row-level security': 'You don\'t have access to this resource.',

    // Template/Campaign errors
    'Template not found': 'This template no longer exists. It may have been deleted.',
    'Campaign not found': 'This campaign no longer exists. It may have been deleted.',
    'No elements': 'Your template needs at least one element before saving.',
    'No dynamic fields': 'Add some dynamic fields to your template to use with CSV data.',

    // S3/Storage errors
    'AccessDenied': 'We couldn\'t access the file storage. Please try again.',
    'NoSuchKey': 'The requested file couldn\'t be found.',
    'EntityTooLarge': 'This file exceeds the maximum allowed size.',

    // Generic
    'Internal Server Error': 'Something went wrong on our end. Please try again.',
    '500': 'Something went wrong on our end. Please try again.',
    '503': 'The service is temporarily unavailable. Please try again later.',
    'Unexpected error': 'An unexpected error occurred. Please try again.',
    'undefined': 'Something went wrong. Please try again.',
};

/**
 * Convert a technical error message to a user-friendly message
 */
export function humanizeError(error: string | Error | unknown): string {
    let errorMessage = '';

    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    } else {
        errorMessage = 'Unknown error';
    }

    // Check each pattern
    for (const [pattern, friendly] of Object.entries(errorPatterns)) {
        if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
            return friendly;
        }
    }

    // If no pattern matches but error is too technical, use generic message
    if (
        errorMessage.includes('::') ||
        errorMessage.includes('Error:') ||
        errorMessage.length > 150 ||
        /^[a-z]+Error$/i.test(errorMessage) ||
        errorMessage.startsWith('{') ||
        errorMessage.startsWith('[')
    ) {
        return 'Something went wrong. Please try again or contact support if the problem persists.';
    }

    // Return original if it seems user-friendly enough
    return errorMessage;
}

/**
 * Get a friendly error message for common operations
 */
export const errorMessages = {
    save: {
        success: 'Template saved successfully!',
        failed: 'We couldn\'t save your template. Please try again.',
        offline: 'You\'re offline. Changes will be saved when you reconnect.',
    },
    load: {
        failed: 'We couldn\'t load your data. Please refresh the page.',
        notFound: 'The item you\'re looking for doesn\'t exist.',
    },
    delete: {
        success: 'Successfully deleted.',
        failed: 'We couldn\'t delete this item. Please try again.',
        confirm: 'Are you sure? This action cannot be undone.',
    },
    upload: {
        tooLarge: 'This file is too large. Please use a file under 5MB.',
        invalidType: 'This file type isn\'t supported.',
        failed: 'Upload failed. Please try again.',
    },
    auth: {
        sessionExpired: 'Your session has expired. Please sign in again.',
        noPermission: 'You don\'t have permission to perform this action.',
    },
    network: {
        offline: 'You appear to be offline. Please check your connection.',
        timeout: 'The request took too long. Please try again.',
        serverError: 'Our servers are having issues. Please try again later.',
    },
} as const;
