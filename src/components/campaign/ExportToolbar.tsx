'use client';

import React, { useState } from 'react';
import { Download, Copy, FileSpreadsheet, Loader2, Check } from 'lucide-react';
import JSZip from 'jszip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PinCardData } from './PinCard';

interface ExportToolbarProps {
    pins: PinCardData[];
    campaignName: string;
    csvData?: Record<string, string>[];
}

export function ExportToolbar({ pins, campaignName, csvData }: ExportToolbarProps) {
    const [isZipping, setIsZipping] = useState(false);
    const [zipProgress, setZipProgress] = useState({ current: 0, total: 0 });
    const [isCopied, setIsCopied] = useState(false);

    const completedPins = pins.filter((p) => p.status === 'completed' && p.imageUrl);

    // Download All as ZIP
    const handleDownloadZip = async () => {
        if (completedPins.length === 0) {
            toast.error('No pins to download');
            return;
        }

        setIsZipping(true);
        setZipProgress({ current: 0, total: completedPins.length });

        try {
            const zip = new JSZip();

            for (let i = 0; i < completedPins.length; i++) {
                const pin = completedPins[i];
                setZipProgress({ current: i + 1, total: completedPins.length });

                try {
                    const response = await fetch(pin.imageUrl);
                    const blob = await response.blob();
                    zip.file(`pin-${pin.rowIndex + 1}.png`, blob);
                } catch (error) {
                    console.warn(`Failed to fetch pin ${pin.rowIndex + 1}:`, error);
                }
            }

            const content = await zip.generateAsync({ type: 'blob' });
            const date = new Date().toISOString().split('T')[0];
            const fileName = `${campaignName.replace(/[^a-z0-9]/gi, '-')}-${date}.zip`;

            // Trigger download
            const url = URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.click();
            URL.revokeObjectURL(url);

            toast.success(`Downloaded ${completedPins.length} pins as ZIP`);
        } catch (error) {
            console.error('Error creating ZIP:', error);
            toast.error('Failed to create ZIP file');
        } finally {
            setIsZipping(false);
        }
    };

    // Copy All URLs
    const handleCopyUrls = async () => {
        if (completedPins.length === 0) {
            toast.error('No URLs to copy');
            return;
        }

        const urls = completedPins.map((p) => p.imageUrl).join('\n');

        try {
            await navigator.clipboard.writeText(urls);
            setIsCopied(true);
            toast.success(`${completedPins.length} URLs copied to clipboard`);
            setTimeout(() => setIsCopied(false), 2000);
        } catch {
            toast.error('Failed to copy URLs');
        }
    };

    // Export as CSV
    const handleExportCsv = () => {
        if (!csvData || csvData.length === 0) {
            toast.error('No CSV data available');
            return;
        }

        // Get headers from first row
        const headers = Object.keys(csvData[0]);
        headers.push('generated_image_url');

        // Build CSV content
        const rows = csvData.map((row, index) => {
            const pin = pins.find((p) => p.rowIndex === index);
            const imageUrl = pin?.imageUrl || '';
            const values = headers.map((h) => {
                const value = h === 'generated_image_url' ? imageUrl : row[h] || '';
                // Escape quotes and wrap in quotes if contains comma
                if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            });
            return values.join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${campaignName.replace(/[^a-z0-9]/gi, '-')}-with-urls.csv`;
        link.click();
        URL.revokeObjectURL(url);

        toast.success('CSV exported with image URLs');
    };

    return (
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
            {/* Download ZIP */}
            <button
                onClick={handleDownloadZip}
                disabled={isZipping || completedPins.length === 0}
                className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all",
                    "bg-blue-600 text-white hover:bg-blue-700",
                    (isZipping || completedPins.length === 0) && "opacity-50 cursor-not-allowed"
                )}
            >
                {isZipping ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Zipping {zipProgress.current}/{zipProgress.total}...
                    </>
                ) : (
                    <>
                        <Download className="w-4 h-4" />
                        Download All as ZIP
                    </>
                )}
            </button>

            {/* Copy All URLs */}
            <button
                onClick={handleCopyUrls}
                disabled={completedPins.length === 0}
                className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all",
                    "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50",
                    completedPins.length === 0 && "opacity-50 cursor-not-allowed"
                )}
            >
                {isCopied ? (
                    <>
                        <Check className="w-4 h-4 text-green-600" />
                        Copied!
                    </>
                ) : (
                    <>
                        <Copy className="w-4 h-4" />
                        Copy All URLs
                    </>
                )}
            </button>

            {/* Export CSV */}
            <button
                onClick={handleExportCsv}
                disabled={!csvData}
                className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all",
                    "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50",
                    !csvData && "opacity-50 cursor-not-allowed"
                )}
            >
                <FileSpreadsheet className="w-4 h-4" />
                Export CSV with URLs
            </button>

            {/* Stats */}
            <div className="ml-auto text-sm text-gray-500">
                {completedPins.length} of {pins.length} pins ready
            </div>
        </div>
    );
}
