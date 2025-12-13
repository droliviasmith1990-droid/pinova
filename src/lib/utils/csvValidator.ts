/**
 * CSV Validation Utility
 * Validates CSV data against field mappings and provides warnings for suspicious data
 */

export interface CSVValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}

export interface ValidationError {
    type: 'missing_required_field' | 'invalid_url' | 'empty_row' | 'invalid_mapping';
    rowIndex?: number;
    field?: string;
    message: string;
}

export interface ValidationWarning {
    type: 'text_too_long' | 'suspicious_url' | 'missing_optional' | 'special_characters';
    rowIndex: number;
    field: string;
    message: string;
    value?: string;
}

/**
 * Validate CSV data against field mappings
 */
export function validateCSV(
    csvData: Record<string, string>[],
    fieldMapping: Record<string, string>,
    requiredFields: string[]
): CSVValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check if all required fields are mapped
    for (const requiredField of requiredFields) {
        const csvColumn = fieldMapping[requiredField];
        if (!csvColumn) {
            errors.push({
                type: 'invalid_mapping',
                field: requiredField,
                message: `Required field "${requiredField}" is not mapped to any CSV column`
            });
        }
    }

    // Validate each row
    csvData.forEach((row, rowIndex) => {
        // Check for empty rows
        const isEmpty = Object.values(row).every(val => !val || val.trim() === '');
        if (isEmpty) {
            errors.push({
                type: 'empty_row',
                rowIndex,
                message: `Row ${rowIndex + 1} is empty`
            });
            return;
        }

        // Check each mapped field
        Object.entries(fieldMapping).forEach(([templateField, csvColumn]) => {
            const value = row[csvColumn];

            // Check required fields have values
            if (requiredFields.includes(templateField) && (!value || value.trim() === '')) {
                errors.push({
                    type: 'missing_required_field',
                    rowIndex,
                    field: csvColumn,
                    message: `Required field "${csvColumn}" is missing in row ${rowIndex + 1}`
                });
            }

            if (!value) return;

            // Validate image URLs (fields starting with 'image')
            if (templateField.toLowerCase().includes('image')) {
                const urlValidation = validateImageUrl(value);
                if (!urlValidation.valid) {
                    if (urlValidation.severity === 'error') {
                        errors.push({
                            type: 'invalid_url',
                            rowIndex,
                            field: csvColumn,
                            message: `Invalid image URL in row ${rowIndex + 1}: ${urlValidation.message}`
                        });
                    } else {
                        warnings.push({
                            type: 'suspicious_url',
                            rowIndex,
                            field: csvColumn,
                            message: urlValidation.message,
                            value: value.substring(0, 50) + (value.length > 50 ? '...' : '')
                        });
                    }
                }
            }

            // Check text length
            if (!templateField.toLowerCase().includes('image') && value.length > 500) {
                warnings.push({
                    type: 'text_too_long',
                    rowIndex,
                    field: csvColumn,
                    message: `Text in "${csvColumn}" is very long (${value.length} characters) in row ${rowIndex + 1}`,
                    value: value.substring(0, 50) + '...'
                });
            }

            // Check for suspicious characters
            const suspiciousChars = /[<>{}]/g;
            if (suspiciousChars.test(value) && !templateField.toLowerCase().includes('url')) {
                warnings.push({
                    type: 'special_characters',
                    rowIndex,
                    field: csvColumn,
                    message: `Special characters detected in "${csvColumn}" in row ${rowIndex + 1}`,
                    value: value.substring(0, 50) + (value.length > 50 ? '...' : '')
                });
            }
        });
    });

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Validate image URL format and accessibility
 */
function validateImageUrl(url: string): { valid: boolean; severity: 'error' | 'warning'; message: string } {
    // Check basic URL pattern
    const urlPattern = /^https?:\/\/.+/i;
    if (!urlPattern.test(url)) {
        return {
            valid: false,
            severity: 'error',
            message: 'URL must start with http:// or https://'
        };
    }

    // Check for common image extensions
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i;
    const hasImageExtension = imageExtensions.test(url);

    // Warn if no image extension but might still be valid (APIs, CDNs)
    if (!hasImageExtension) {
        return {
            valid: false,
            severity: 'warning',
            message: 'URL does not end with a common image extension (.jpg, .png, etc.)'
        };
    }

    // Check for suspicious domains (optional, can be extended)
    const suspiciousDomains = ['localhost', '127.0.0.1', '192.168.'];
    const hasSuspiciousDomain = suspiciousDomains.some(domain => url.toLowerCase().includes(domain));

    if (hasSuspiciousDomain) {
        return {
            valid: false,
            severity: 'warning',
            message: 'URL contains a local/development domain'
        };
    }

    return {
        valid: true,
        severity: 'warning',
        message: 'OK'
    };
}

/**
 * Get a summary of validation results
 */
export function getValidationSummary(result: CSVValidationResult): string {
    if (result.valid && result.warnings.length === 0) {
        return '✓ All validations passed';
    }

    const parts: string[] = [];

    if (result.errors.length > 0) {
        parts.push(`${result.errors.length} error${result.errors.length > 1 ? 's' : ''}`);
    }

    if (result.warnings.length > 0) {
        parts.push(`${result.warnings.length} warning${result.warnings.length > 1 ? 's' : ''}`);
    }

    return parts.join(', ');
}

/**
 * Group errors and warnings by type for display
 */
export function groupValidationIssues(result: CSVValidationResult): {
    errors: Map<string, ValidationError[]>;
    warnings: Map<string, ValidationWarning[]>;
} {
    const errorGroups = new Map<string, ValidationError[]>();
    const warningGroups = new Map<string, ValidationWarning[]>();

    result.errors.forEach(error => {
        const key = error.type;
        if (!errorGroups.has(key)) {
            errorGroups.set(key, []);
        }
        errorGroups.get(key)!.push(error);
    });

    result.warnings.forEach(warning => {
        const key = warning.type;
        if (!warningGroups.has(key)) {
            warningGroups.set(key, []);
        }
        warningGroups.get(key)!.push(warning);
    });

    return { errors: errorGroups, warnings: warningGroups };
}
