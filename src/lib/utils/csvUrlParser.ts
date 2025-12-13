/**
 * CSV URL Parser Utility
 * Handles fetching and parsing CSV from URLs including Google Sheets, Dropbox, and direct links
 */

export interface CSVUrlResult {
    success: boolean;
    headers: string[];
    data: Record<string, string>[];
    rowCount: number;
    sourceUrl: string;
    transformedUrl?: string;
    error?: string;
    suggestion?: string;
}

type GoogleSheetsUrlType = 'ALREADY_CSV' | 'PUBHTML' | 'PUB' | 'PUBLISHED_2PACX' | 'EDIT_URL' | 'UNKNOWN';

/**
 * Detect Google Sheets URL type
 */
export function detectGoogleSheetsUrlType(url: string): GoogleSheetsUrlType {
    if (!url.includes('docs.google.com/spreadsheets')) {
        return 'UNKNOWN';
    }

    // Already has CSV output format
    if (url.includes('output=csv') || (url.includes('/export') && url.includes('format=csv'))) {
        return 'ALREADY_CSV';
    }

    // Published HTML format
    if (url.includes('/pubhtml')) {
        return 'PUBHTML';
    }

    // Published format with /pub
    if (url.includes('/pub?') || url.endsWith('/pub')) {
        return 'PUB';
    }

    // Published via 2PACX format (File > Share > Publish to web)
    if (url.includes('/d/e/2PACX-')) {
        return 'PUBLISHED_2PACX';
    }

    // Regular edit URL with spreadsheet ID
    if (url.includes('/edit') || url.match(/\/d\/[a-zA-Z0-9-_]+/)) {
        return 'EDIT_URL';
    }

    return 'UNKNOWN';
}

/**
 * Transform URL to direct CSV download format
 */
export function transformCsvUrl(url: string): { url: string; transformed: boolean; type: string } {
    const trimmedUrl = url.trim();

    // Google Sheets URL transformation
    if (trimmedUrl.includes('docs.google.com/spreadsheets')) {
        const urlType = detectGoogleSheetsUrlType(trimmedUrl);
        console.log('[csvUrlParser] Detected Google Sheets URL type:', urlType);

        switch (urlType) {
            case 'ALREADY_CSV':
                return { url: trimmedUrl, transformed: false, type: urlType };

            case 'PUBHTML':
                // Replace /pubhtml with /pub?output=csv
                const pubhtmlUrl = trimmedUrl.replace('/pubhtml', '/pub?output=csv&single=true');
                return { url: pubhtmlUrl, transformed: true, type: urlType };

            case 'PUB':
                // Add output=csv if not present
                try {
                    const pubUrl = new URL(trimmedUrl);
                    pubUrl.searchParams.set('output', 'csv');
                    pubUrl.searchParams.set('single', 'true');
                    if (!pubUrl.searchParams.has('gid')) {
                        pubUrl.searchParams.set('gid', '0');
                    }
                    return { url: pubUrl.toString(), transformed: true, type: urlType };
                } catch {
                    return { url: trimmedUrl + '?output=csv&single=true&gid=0', transformed: true, type: urlType };
                }

            case 'PUBLISHED_2PACX':
                // Published via "Publish to web" - transform to CSV export
                try {
                    let csvUrl = trimmedUrl;
                    // Remove any existing path endings
                    csvUrl = csvUrl.replace(/\/pubhtml.*$/, '').replace(/\/pub\?.*$/, '').replace(/\/pub$/, '');

                    // Add /pub with CSV parameters
                    const urlObj = new URL(csvUrl + '/pub');
                    urlObj.searchParams.set('output', 'csv');
                    urlObj.searchParams.set('single', 'true');

                    // Preserve gid if it was in the original URL
                    const gidMatch = trimmedUrl.match(/gid=(\d+)/);
                    urlObj.searchParams.set('gid', gidMatch ? gidMatch[1] : '0');

                    return { url: urlObj.toString(), transformed: true, type: urlType };
                } catch {
                    // Fallback: just add pub?output=csv
                    const base = trimmedUrl.split('?')[0].replace(/\/$/, '');
                    return { url: base + '/pub?output=csv&single=true&gid=0', transformed: true, type: urlType };
                }

            case 'EDIT_URL':
                // Regular spreadsheet URL - extract ID and create export URL
                const match = trimmedUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
                if (match) {
                    const spreadsheetId = match[1];
                    const gidMatch = trimmedUrl.match(/gid=(\d+)/);
                    const gid = gidMatch ? gidMatch[1] : '0';
                    return {
                        url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`,
                        transformed: true,
                        type: urlType
                    };
                }
                break;
        }
    }

    // Dropbox URL transformation - change dl=0 to dl=1 for direct download
    if (trimmedUrl.includes('dropbox.com')) {
        const dropboxUrl = trimmedUrl.replace(/dl=0/, 'dl=1');
        return { url: dropboxUrl, transformed: trimmedUrl !== dropboxUrl, type: 'DROPBOX' };
    }

    // Direct URL - return as is
    return { url: trimmedUrl, transformed: false, type: 'DIRECT' };
}

/**
 * Validate URL format
 */
export function validateCsvUrl(url: string): { valid: boolean; error?: string; isGoogleSheets?: boolean } {
    if (!url || url.trim() === '') {
        return { valid: false, error: 'URL is required' };
    }

    const trimmedUrl = url.trim();

    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
        return { valid: false, error: 'URL must start with http:// or https://' };
    }

    try {
        new URL(trimmedUrl);
        const isGoogleSheets = trimmedUrl.includes('docs.google.com/spreadsheets');
        return { valid: true, isGoogleSheets };
    } catch {
        return { valid: false, error: 'Invalid URL format' };
    }
}

/**
 * Get helpful error message with suggestions
 */
function getErrorWithSuggestion(status: number, statusText: string, url: string): { error: string; suggestion: string } {
    const isGoogleSheets = url.includes('docs.google.com');

    if (status === 404) {
        return {
            error: `Cannot access CSV file (404 Not Found)`,
            suggestion: isGoogleSheets
                ? `Please check:\n• Your Google Sheet is published to the web (File → Share → Publish to web)\n• You copied the complete URL\n• The sheet is publicly accessible`
                : `The URL could not be found. Please check that the URL is correct and the file exists.`
        };
    }

    if (status === 403) {
        return {
            error: `Access denied (403 Forbidden)`,
            suggestion: isGoogleSheets
                ? `The file requires authentication. Please:\n• Publish sheet to web (File → Share → Publish to web)\n• Ensure "Anyone with link" can view`
                : `You don't have permission to access this file. Make sure it's publicly accessible.`
        };
    }

    if (status === 401) {
        return {
            error: `Authentication required (401 Unauthorized)`,
            suggestion: `This file requires login. Please make it publicly accessible or use the Upload File option instead.`
        };
    }

    return {
        error: `Failed to fetch CSV: ${status} ${statusText}`,
        suggestion: `Please check the URL and try again. If the problem persists, download the file and use the Upload option.`
    };
}

/**
 * Parse CSV text content into structured data
 */
function parseCSVContent(csvText: string): { headers: string[]; data: Record<string, string>[] } {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');

    if (lines.length === 0) {
        return { headers: [], data: [] };
    }

    const headers = parseCSVRow(lines[0]);
    const data: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVRow(lines[i]);
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        data.push(row);
    }

    return { headers, data };
}

/**
 * Parse a single CSV row, handling quoted fields
 */
function parseCSVRow(row: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        const nextChar = row[i + 1];

        if (inQuotes) {
            if (char === '"' && nextChar === '"') {
                current += '"';
                i++;
            } else if (char === '"') {
                inQuotes = false;
            } else {
                current += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
    }

    result.push(current.trim());
    return result;
}

/**
 * Fetch and parse CSV from a URL
 */
export async function fetchCsvFromUrl(url: string): Promise<CSVUrlResult> {
    // Validate URL
    const validation = validateCsvUrl(url);
    if (!validation.valid) {
        return {
            success: false,
            headers: [],
            data: [],
            rowCount: 0,
            sourceUrl: url,
            error: validation.error
        };
    }

    // Transform URL for direct download
    const { url: transformedUrl, transformed, type } = transformCsvUrl(url);
    console.log('[csvUrlParser] Original URL:', url);
    console.log('[csvUrlParser] Transformed URL:', transformedUrl);
    console.log('[csvUrlParser] URL type:', type, 'transformed:', transformed);

    try {
        // Use our API route to proxy the request (avoids CORS issues)
        const response = await fetch('/api/fetch-csv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: transformedUrl,
                originalUrl: url,
                urlType: type
            }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            return {
                success: false,
                headers: [],
                data: [],
                rowCount: 0,
                sourceUrl: url,
                transformedUrl,
                error: result.error || `Failed to fetch: ${response.status}`,
                suggestion: result.suggestion
            };
        }

        return {
            success: true,
            headers: result.headers,
            data: result.data,
            rowCount: result.rowCount,
            sourceUrl: url,
            transformedUrl
        };

    } catch (error) {
        console.error('[csvUrlParser] Fetch error:', error);
        return {
            success: false,
            headers: [],
            data: [],
            rowCount: 0,
            sourceUrl: url,
            transformedUrl,
            error: error instanceof Error ? error.message : 'Network error',
            suggestion: 'Please check your internet connection and try again.'
        };
    }
}

/**
 * Parse CSV text directly (for server-side use)
 */
export function parseCSVText(csvText: string): { headers: string[]; data: Record<string, string>[]; rowCount: number } {
    const { headers, data } = parseCSVContent(csvText);
    return { headers, data, rowCount: data.length };
}

// Re-export the error helper for use in API
export { getErrorWithSuggestion };
