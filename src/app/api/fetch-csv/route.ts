import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to fetch CSV from URL (bypasses CORS)
 */
export async function POST(request: NextRequest) {
    try {
        const { url, originalUrl, urlType } = await request.json();

        if (!url) {
            return NextResponse.json(
                { success: false, error: 'URL is required' },
                { status: 400 }
            );
        }

        console.log('[fetch-csv] Fetching from:', url);
        console.log('[fetch-csv] URL type:', urlType);

        // Fetch with timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        let response: Response;
        try {
            response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'Accept': 'text/csv, text/plain, application/csv, */*',
                    'User-Agent': 'PinterestPinGenerator/1.0',
                },
                redirect: 'follow',
            });
        } catch (fetchError) {
            clearTimeout(timeout);
            if (fetchError instanceof Error && fetchError.name === 'AbortError') {
                return NextResponse.json({
                    success: false,
                    error: 'Request timed out after 30 seconds',
                    suggestion: 'The server took too long to respond. Try again or download the file manually.'
                }, { status: 408 });
            }
            throw fetchError;
        }

        clearTimeout(timeout);

        // Handle HTTP errors with helpful messages
        if (!response.ok) {
            const { error, suggestion } = getErrorWithSuggestion(
                response.status,
                response.statusText,
                originalUrl || url
            );
            console.error('[fetch-csv] HTTP error:', response.status, response.statusText);
            return NextResponse.json({ success: false, error, suggestion }, { status: 400 });
        }

        const csvText = await response.text();
        console.log('[fetch-csv] Received', csvText.length, 'bytes');

        // Check if response is HTML instead of CSV
        if (csvText.includes('<!DOCTYPE html') || csvText.includes('<html')) {
            const isGoogleSheets = url.includes('docs.google.com');
            return NextResponse.json({
                success: false,
                error: 'URL returned HTML instead of CSV',
                suggestion: isGoogleSheets
                    ? `Please use File → Share → Publish to web in Google Sheets, then select "Comma-separated values (.csv)" format.`
                    : `Make sure the URL points directly to a CSV file, not a webpage.`
            }, { status: 400 });
        }

        // Check for empty content
        if (!csvText || csvText.trim().length === 0) {
            return NextResponse.json({
                success: false,
                error: 'CSV file is empty',
                suggestion: 'The file exists but contains no data. Check that your spreadsheet has content.'
            }, { status: 400 });
        }

        // Parse CSV
        const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');

        if (lines.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No data found in CSV',
                suggestion: 'The file appears to be empty or incorrectly formatted.'
            }, { status: 400 });
        }

        // Parse headers
        const headers = parseCSVRow(lines[0]);

        if (headers.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No columns found in CSV',
                suggestion: 'The first row should contain column headers separated by commas.'
            }, { status: 400 });
        }

        // Parse data rows
        const data: Record<string, string>[] = [];
        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVRow(lines[i]);
            const row: Record<string, string> = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            data.push(row);
        }

        console.log('[fetch-csv] Parsed', data.length, 'rows with', headers.length, 'columns');

        return NextResponse.json({
            success: true,
            headers,
            data,
            rowCount: data.length
        });

    } catch (error) {
        console.error('[fetch-csv] Error:', error);

        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch CSV',
            suggestion: 'An unexpected error occurred. Please try again or use the file upload option.'
        }, { status: 500 });
    }
}

/**
 * Get helpful error message with suggestions based on HTTP status
 */
function getErrorWithSuggestion(status: number, statusText: string, url: string): { error: string; suggestion: string } {
    const isGoogleSheets = url.includes('docs.google.com');

    if (status === 404) {
        return {
            error: `Cannot access CSV file (404 Not Found)`,
            suggestion: isGoogleSheets
                ? `Please check:\n• Your Google Sheet is published to the web (File → Share → Publish to web)\n• Select "Comma-separated values (.csv)" when publishing\n• Copy the complete published URL`
                : `The URL could not be found. Please verify the URL is correct.`
        };
    }

    if (status === 403) {
        return {
            error: `Access denied (403 Forbidden)`,
            suggestion: isGoogleSheets
                ? `The sheet requires authentication. Please:\n1. Go to File → Share → Publish to web\n2. Select your sheet and "Comma-separated values"\n3. Click "Publish"\n4. Copy and use the new URL`
                : `You don't have permission to access this file. Make it publicly accessible.`
        };
    }

    if (status === 401) {
        return {
            error: `Authentication required`,
            suggestion: `This file requires login. Please publish it publicly or download and upload it instead.`
        };
    }

    return {
        error: `HTTP ${status}: ${statusText}`,
        suggestion: `Please check the URL and try again, or download the file and use Upload instead.`
    };
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
