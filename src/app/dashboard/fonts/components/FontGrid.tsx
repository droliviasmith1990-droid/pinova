'use client';

import React, { useState, useEffect } from 'react';
import { Trash2, Download, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Font, deleteFont, loadCustomFont } from '@/lib/db/fonts';
import { toast } from 'sonner';

interface FontGridProps {
    fonts: Font[];
    onFontDeleted: () => void;
}

export function FontGrid({ fonts, onFontDeleted }: FontGridProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fonts.map((font) => (
                <FontCard 
                    key={font.id} 
                    font={font} 
                    onDeleted={onFontDeleted}
                />
            ))}
        </div>
    );
}

interface FontCardProps {
    font: Font;
    onDeleted: () => void;
}

function FontCard({ font, onDeleted }: FontCardProps) {
    const [deleting, setDeleting] = useState(false);
    const [loaded, setLoaded] = useState(false);

    // Load font on mount
    useEffect(() => {
        loadCustomFont(font).then(() => setLoaded(true));
    }, [font]);

    const handleDelete = async () => {
        if (!confirm(`Delete "${font.family}"? This action cannot be undone.`)) {
            return;
        }

        setDeleting(true);
        try {
            const success = await deleteFont(font.id);
            if (success) {
                toast.success('Font deleted successfully');
                onDeleted();
            } else {
                toast.error('Failed to delete font');
            }
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('An error occurred');
        } finally {
            setDeleting(false);
        }
    };

    const handleDownload = () => {
        window.open(font.file_url, '_blank');
    };

    return (
        <div className="group bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all hover:border-blue-300 relative overflow-hidden">
            {/* Font Preview */}
            <div className="mb-4 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-100">
                <p
                    style={{ fontFamily: loaded ? font.family : 'system-ui' }}
                    className={cn(
                        'text-3xl text-gray-900 text-center transition-opacity',
                        loaded ? 'opacity-100' : 'opacity-50'
                    )}
                >
                    Aa Bb Cc 123
                </p>
            </div>

            {/* Font Info */}
            <div className="space-y-2 mb-4">
                <h3 
                    className="font-heading font-bold text-gray-900 text-lg truncate"
                    title={font.family}
                >
                    {font.family}
                </h3>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium uppercase">
                        {font.format}
                    </span>
                    {font.file_size && (
                        <span>
                            {(font.file_size / 1024).toFixed(1)} KB
                        </span>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={handleDownload}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium text-gray-700"
                    title="Download font file"
                >
                    <Download className="w-4 h-4" />
                    Download
                </button>
                <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
                    title="Delete font"
                >
                    {deleting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Trash2 className="w-4 h-4" />
                    )}
                </button>
            </div>

            {/* Loading Indicator */}
            {!loaded && (
                <div className="absolute top-2 right-2">
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                </div>
            )}

            {loaded && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-green-600" />
                </div>
            )}
        </div>
    );
}
