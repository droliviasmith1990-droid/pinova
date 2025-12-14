'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, X, Eye, AlertCircle, Check, Link2, Loader2, HelpCircle, ChevronDown, ChevronUp, FileText, Table } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCampaignWizard } from '@/lib/campaigns/CampaignWizardContext';
import { parseCSVFile, getPreviewRows } from '@/lib/utils/csvParser';
import { fetchCsvFromUrl, validateCsvUrl } from '@/lib/utils/csvUrlParser';

// Shimmer loading skeleton component
function ShimmerSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn("shimmer rounded", className)} />
    );
}

// Convert technical errors to friendly messages
function humanizeError(error: string): string {
    const errorMap: Record<string, string> = {
        'Failed to parse CSV': 'We couldn\'t read your file. Make sure it\'s a valid CSV file with comma-separated values.',
        'Failed to read file': 'We couldn\'t open your file. Please try uploading it again.',
        'Failed to import CSV from URL': 'We couldn\'t fetch the data from that URL. Check that the link is public and accessible.',
        'Network error': 'We couldn\'t connect to the server. Please check your internet connection and try again.',
        'File too large': 'Your file is too big (max 5MB). Try splitting it into smaller files.',
        'Invalid URL': 'That doesn\'t look like a valid URL. Please check the link and try again.',
    };

    for (const [key, value] of Object.entries(errorMap)) {
        if (error.toLowerCase().includes(key.toLowerCase())) {
            return value;
        }
    }
    return error;
}

type UploadTab = 'file' | 'url';

export function StepUploadCSV() {
    const { csvData, setCSVData } = useCampaignWizard();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [activeTab, setActiveTab] = useState<UploadTab>('file');
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    // URL import state
    const [urlInput, setUrlInput] = useState('');
    const [urlValid, setUrlValid] = useState<boolean | null>(null);
    const [showHelp, setShowHelp] = useState(false);

    // Validate URL as user types
    const handleUrlChange = useCallback((value: string) => {
        setUrlInput(value);
        if (value.trim()) {
            const result = validateCsvUrl(value);
            setUrlValid(result.valid);
        } else {
            setUrlValid(null);
        }
    }, []);

    // Handle file upload
    const handleFile = useCallback(async (file: File) => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await parseCSVFile(file);

            if (result.success) {
                setCSVData({
                    headers: result.headers,
                    rows: result.data,
                    fileName: file.name,
                    rowCount: result.rowCount,
                });
                setShowPreview(true);
            } else {
                setError(result.error || 'Failed to parse CSV');
                setCSVData(null);
            }
        } catch {
            setError('Failed to read file');
            setCSVData(null);
        } finally {
            setIsLoading(false);
        }
    }, [setCSVData]);

    // Handle URL import
    const handleUrlImport = useCallback(async () => {
        if (!urlInput.trim() || !urlValid) return;

        setIsLoading(true);
        setError(null);

        try {
            const result = await fetchCsvFromUrl(urlInput);

            if (result.success) {
                setCSVData({
                    headers: result.headers,
                    rows: result.data,
                    fileName: `Imported from URL`,
                    rowCount: result.rowCount,
                    sourceUrl: result.sourceUrl,
                });
                setShowPreview(true);
            } else {
                setError(result.error || 'Failed to import CSV from URL');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to import CSV');
        } finally {
            setIsLoading(false);
        }
    }, [urlInput, urlValid, setCSVData]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFile(file);
        }
    }, [handleFile]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }
    }, [handleFile]);

    const handleRemove = useCallback(() => {
        setCSVData(null);
        setShowPreview(false);
        setError(null);
        setUrlInput('');
        setUrlValid(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [setCSVData]);

    const previewRows = csvData ? getPreviewRows(csvData.rows, 5) : [];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold text-gray-900">Upload Your CSV</h2>
                <p className="text-gray-600 mt-1">
                    Upload a CSV file or import from a URL. Each row will become a pin.
                </p>
            </div>

            {/* Tab Switcher */}
            {!csvData && (
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('file')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors",
                            activeTab === 'file'
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <Upload className="w-4 h-4" />
                        Upload File
                    </button>
                    <button
                        onClick={() => setActiveTab('url')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors",
                            activeTab === 'url'
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <Link2 className="w-4 h-4" />
                        Import from URL
                    </button>
                </div>
            )}

            {/* File Upload Tab */}
            {!csvData && activeTab === 'file' && (
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => !isLoading && fileInputRef.current?.click()}
                    className={cn(
                        "relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300",
                        isLoading
                            ? "border-blue-300 bg-blue-50 cursor-wait"
                            : isDragging
                                ? "border-blue-500 bg-blue-50 scale-[1.02] shadow-lg"
                                : "border-gray-300 hover:border-blue-400 hover:bg-gray-50 cursor-pointer"
                    )}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={isLoading}
                    />

                    {isLoading ? (
                        // Shimmer Loading State
                        <div className="space-y-4">
                            <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 flex items-center justify-center animate-pulse">
                                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-lg font-medium text-blue-700">Analyzing your data...</p>
                                <p className="text-sm text-blue-500">This may take a moment</p>
                            </div>
                            <div className="max-w-xs mx-auto space-y-2">
                                <ShimmerSkeleton className="h-3 w-full" />
                                <ShimmerSkeleton className="h-3 w-4/5" />
                                <ShimmerSkeleton className="h-3 w-3/5" />
                            </div>
                        </div>
                    ) : (
                        // Default/Drag State
                        <>
                            <div className={cn(
                                "w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 transition-all duration-300",
                                isDragging ? "bg-blue-100 scale-110" : "bg-gray-100"
                            )}>
                                <Upload className={cn(
                                    "w-8 h-8 transition-colors duration-300",
                                    isDragging ? "text-blue-500" : "text-gray-400"
                                )} />
                            </div>
                            <p className={cn(
                                "text-lg font-medium transition-colors",
                                isDragging ? "text-blue-700" : "text-gray-700"
                            )}>
                                {isDragging ? '✨ Drop your file here!' : 'Drag and drop your CSV file here'}
                            </p>
                            <p className="text-gray-500 mt-1">or click to browse</p>
                            <div className="flex items-center justify-center gap-4 mt-6 text-sm text-gray-400">
                                <span className="flex items-center gap-1">
                                    <FileText className="w-4 h-4" />
                                    .csv format
                                </span>
                                <span>•</span>
                                <span>Max 5MB</span>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* URL Import Tab */}
            {!csvData && activeTab === 'url' && (
                <div className="space-y-4">
                    {/* URL Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            CSV File URL
                        </label>
                        <div className="relative">
                            <input
                                type="url"
                                value={urlInput}
                                onChange={(e) => handleUrlChange(e.target.value)}
                                placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
                                className={cn(
                                    "w-full px-4 py-3 pr-10 border rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                                    urlValid === true ? "border-green-400" : urlValid === false ? "border-red-400" : "border-gray-300"
                                )}
                                disabled={isLoading}
                            />
                            {urlValid !== null && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    {urlValid ? (
                                        <Check className="w-5 h-5 text-green-500" />
                                    ) : (
                                        <X className="w-5 h-5 text-red-500" />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Import Button */}
                    <button
                        onClick={handleUrlImport}
                        disabled={!urlInput.trim() || !urlValid || isLoading}
                        className={cn(
                            "w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium transition-colors",
                            (!urlInput.trim() || !urlValid || isLoading)
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:bg-blue-700"
                        )}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Importing...
                            </>
                        ) : (
                            <>
                                <Link2 className="w-5 h-5" />
                                Import from URL
                            </>
                        )}
                    </button>

                    {/* Supported Sources */}
                    <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm font-medium text-blue-800 mb-2">Supported Sources:</p>
                        <ul className="text-sm text-blue-700 space-y-1">
                            <li>• Google Sheets (publish to web as CSV)</li>
                            <li>• Dropbox public links</li>
                            <li>• Any direct CSV file URL</li>
                        </ul>
                    </div>

                    {/* Help Accordion */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setShowHelp(!showHelp)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-left"
                        >
                            <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                <HelpCircle className="w-4 h-4" />
                                How to get CSV URL from Google Sheets
                            </span>
                            {showHelp ? (
                                <ChevronUp className="w-4 h-4 text-gray-500" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                            )}
                        </button>
                        {showHelp && (
                            <div className="px-4 py-3 text-sm text-gray-600 space-y-2 bg-white">
                                <ol className="list-decimal list-inside space-y-2">
                                    <li>Open your Google Sheet</li>
                                    <li>Click: <strong>File → Share → Publish to web</strong></li>
                                    <li>Select your sheet and choose <strong>&quot;Comma-separated values (.csv)&quot;</strong></li>
                                    <li>Click <strong>&quot;Publish&quot;</strong></li>
                                    <li>Copy the generated URL and paste it above</li>
                                </ol>
                                <p className="text-gray-500 mt-3 text-xs">
                                    Note: Changes to your Google Sheet require re-publishing to update the CSV.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* File Selected / CSV Loaded - Enhanced Success State */}
            {csvData && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-200">
                                <FileSpreadsheet className="w-7 h-7 text-white" />
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <p className="font-semibold text-gray-900">{csvData.fileName}</p>
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 rounded-full text-green-700 text-xs font-medium">
                                        <Check className="w-3 h-3" />
                                        Valid
                                    </span>
                                </div>

                                {/* Stats Grid */}
                                <div className="flex items-center gap-4 mt-2">
                                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                        <Table className="w-4 h-4 text-gray-400" />
                                        <span><strong>{csvData.rowCount}</strong> rows</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Your CSV file should have columns for each variable field in your template
                                        (e.g., &quot;Title&quot;, &quot;Description&quot;, &quot;Image URL&quot;).
                                    </p>
                                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                        <FileText className="w-4 h-4 text-gray-400" />
                                        <span><strong>{csvData.headers.length}</strong> columns</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {csvData.headers.slice(0, 6).map((header, i) => (
                                        <span
                                            key={i}
                                            className="px-2 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-600"
                                        >
                                            {header}
                                        </span>
                                    ))}
                                    {csvData.headers.length > 6 && (
                                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-500">
                                            +{csvData.headers.length - 6} more
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowPreview(!showPreview)}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                            >
                                <Eye className="w-4 h-4" />
                                {showPreview ? 'Hide' : 'Preview'}
                            </button>
                            <button
                                onClick={handleRemove}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4" />
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Message - Humanized */}
            {error && (
                <div className="flex items-start gap-4 p-5 bg-red-50 border border-red-200 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold text-red-800">Oops! Something went wrong</p>
                        <p className="text-sm text-red-600 mt-1">{humanizeError(error)}</p>
                        <button
                            onClick={handleRemove}
                            className="mt-3 text-sm font-medium text-red-700 hover:text-red-800 underline"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            )}

            {/* Preview Table */}
            {showPreview && csvData && previewRows.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <p className="font-medium text-gray-700">
                            Showing first {previewRows.length} of {csvData.rowCount} rows
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600 border-b">#</th>
                                    {csvData.headers.map((header, headerIndex) => (
                                        <th
                                            key={`header-${headerIndex}-${header}`}
                                            className="px-4 py-3 text-left font-semibold text-gray-600 border-b whitespace-nowrap"
                                        >
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {previewRows.map((row, rowIndex) => (
                                    <tr key={rowIndex} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-500 border-b">{rowIndex + 1}</td>
                                        {csvData.headers.map((header, headerIndex) => (
                                            <td
                                                key={`cell-${rowIndex}-${headerIndex}`}
                                                className="px-4 py-3 text-gray-700 border-b max-w-xs truncate"
                                                title={row[header]}
                                            >
                                                {row[header] || <span className="text-gray-400 italic">empty</span>}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
