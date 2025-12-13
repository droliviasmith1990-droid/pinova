import Papa from 'papaparse';

// ============================================
// Types
// ============================================
export interface CSVParseResult {
    success: boolean;
    headers: string[];
    data: Record<string, string>[];
    rowCount: number;
    error?: string;
}

export interface CSVValidationError {
    type: 'format' | 'empty' | 'no_headers' | 'too_few_columns' | 'size';
    message: string;
}

// ============================================
// Parse CSV File
// ============================================
export function parseCSVFile(file: File): Promise<CSVParseResult> {
    return new Promise((resolve) => {
        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            resolve({
                success: false,
                headers: [],
                data: [],
                rowCount: 0,
                error: 'File size exceeds 5MB limit',
            });
            return;
        }

        // Validate file type
        if (!file.name.toLowerCase().endsWith('.csv')) {
            resolve({
                success: false,
                headers: [],
                data: [],
                rowCount: 0,
                error: 'Please upload a CSV file',
            });
            return;
        }

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim(),
            complete: (results) => {
                const headers = results.meta.fields || [];
                const data = results.data as Record<string, string>[];

                // Validate headers exist
                if (headers.length === 0) {
                    resolve({
                        success: false,
                        headers: [],
                        data: [],
                        rowCount: 0,
                        error: 'CSV must have a header row with column names',
                    });
                    return;
                }

                // Validate minimum columns
                if (headers.length < 2) {
                    resolve({
                        success: false,
                        headers,
                        data: [],
                        rowCount: 0,
                        error: 'CSV must have at least 2 columns',
                    });
                    return;
                }

                // Validate data rows exist
                if (data.length === 0) {
                    resolve({
                        success: false,
                        headers,
                        data: [],
                        rowCount: 0,
                        error: 'CSV must have at least 1 data row',
                    });
                    return;
                }

                // Filter out completely empty rows
                const validData = data.filter((row) => {
                    return Object.values(row).some((value) => value && value.trim() !== '');
                });

                if (validData.length === 0) {
                    resolve({
                        success: false,
                        headers,
                        data: [],
                        rowCount: 0,
                        error: 'All data rows are empty',
                    });
                    return;
                }

                resolve({
                    success: true,
                    headers,
                    data: validData,
                    rowCount: validData.length,
                });
            },
            error: (error) => {
                resolve({
                    success: false,
                    headers: [],
                    data: [],
                    rowCount: 0,
                    error: `Failed to parse CSV: ${error.message}`,
                });
            },
        });
    });
}

// ============================================
// Get Preview Rows
// ============================================
export function getPreviewRows(data: Record<string, string>[], count: number = 5): Record<string, string>[] {
    return data.slice(0, count);
}

// ============================================
// Auto-Map Fields with Fuzzy Matching
// ============================================

/**
 * Calculate string similarity score (0-1) using Levenshtein distance
 */
function stringSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    if (s1 === s2) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;

    const matrix: number[][] = [];

    for (let i = 0; i <= s2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= s1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= s2.length; i++) {
        for (let j = 1; j <= s1.length; j++) {
            if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    const distance = matrix[s2.length][s1.length];
    const maxLength = Math.max(s1.length, s2.length);
    return 1 - (distance / maxLength);
}

/**
 * Common field name aliases for better matching
 */
const FIELD_ALIASES: Record<string, string[]> = {
    'title': ['name', 'heading', 'product_name', 'item_name', 'product_title'],
    'description': ['desc', 'details', 'content', 'body', 'text'],
    'price': ['cost', 'amount', 'value'],
    'url': ['link', 'href', 'source', 'src'],
    'image': ['img', 'photo', 'picture', 'thumbnail', 'image_url', 'img_url'],
    'text': ['content', 'message', 'copy'],
};

/**
 * Enhanced auto-mapping with fuzzy matching and semantic understanding
 */
export function autoMapFields(
    csvHeaders: string[],
    templateFields: string[]
): Record<string, string> {
    const mapping: Record<string, string> = {};
    const usedHeaders = new Set<string>();

    templateFields.forEach((field) => {
        const fieldLower = field.toLowerCase().trim();
        let bestMatch: string | null = null;
        let bestScore = 0.0;

        csvHeaders.forEach((header) => {
            if (usedHeaders.has(header)) return; // Skip already used headers

            const headerLower = header.toLowerCase().trim();
            let score = 0.0;

            // 1. Exact match (highest priority)
            if (headerLower === fieldLower) {
                score = 1.0;
            }
            // 2. Exact match after removing numbers (e.g., "text1" matches "text")
            else if (headerLower === fieldLower.replace(/\d+$/, '')) {
                score = 0.95;
            }
            // 3. Header contains field name or vice versa
            else if (headerLower.includes(fieldLower) || fieldLower.includes(headerLower)) {
                score = 0.85;
            }
            // 4. Check aliases (semantic matching)
            else {
                const fieldBase = fieldLower.replace(/\d+$/, ''); // Remove trailing numbers
                const aliases = FIELD_ALIASES[fieldBase] || [];

                if (aliases.some(alias => headerLower.includes(alias) || alias.includes(headerLower))) {
                    score = 0.75;
                }
                // 5. Fuzzy string matching (fallback)
                else {
                    score = stringSimilarity(fieldLower, headerLower);
                    // Only consider if similarity is above threshold
                    if (score < 0.6) score = 0.0;
                }
            }

            // Update best match if this score is higher
            if (score > bestScore) {
                bestScore = score;
                bestMatch = header;
            }
        });

        // Only map if we found a reasonable match (>= 60% similarity)
        if (bestMatch && bestScore >= 0.6) {
            mapping[field] = bestMatch;
            usedHeaders.add(bestMatch); // Mark as used to avoid duplicate mappings
        }
    });

    return mapping;
}
