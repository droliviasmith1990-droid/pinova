'use client';

import React from 'react';
import { 
    CheckCircle, 
    AlertTriangle, 
    XCircle, 
    Loader2, 
    ZoomIn,
    Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PreviewPin, ValidationWarning } from '@/hooks/usePreviewGeneration';

// ============================================
// Types
// ============================================
export interface PreviewCardProps {
    pin: PreviewPin;
    onInspect?: () => void;
}

// ============================================
// Sub-Components
// ============================================

function ValidationBadge({ warnings }: { warnings: ValidationWarning[] }) {
    const errorCount = warnings.filter(w => w.severity === 'error').length;
    const warningCount = warnings.filter(w => w.severity === 'warning').length;
    const infoCount = warnings.filter(w => w.severity === 'info').length;
    
    if (errorCount === 0 && warningCount === 0 && infoCount === 0) {
        return (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                <CheckCircle className="w-3 h-3" />
                <span>Valid</span>
            </div>
        );
    }
    
    if (errorCount > 0) {
        return (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
                <XCircle className="w-3 h-3" />
                <span>{errorCount} error{errorCount > 1 ? 's' : ''}</span>
            </div>
        );
    }
    
    if (warningCount > 0) {
        return (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                <AlertTriangle className="w-3 h-3" />
                <span>{warningCount} warning{warningCount > 1 ? 's' : ''}</span>
            </div>
        );
    }
    
    return (
        <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
            <Info className="w-3 h-3" />
            <span>{infoCount} note{infoCount > 1 ? 's' : ''}</span>
        </div>
    );
}

// ============================================
// Main Component
// ============================================
export function PreviewCard({ pin, onInspect }: PreviewCardProps) {
    const { rowIndex, imageDataUrl, status, validationWarnings, generationTimeMs } = pin;
    
    // Get primary display title from CSV data
    const displayTitle = pin.csvRowData.title 
        || pin.csvRowData.name 
        || pin.csvRowData.product_name 
        || `Row ${rowIndex + 1}`;
    
    return (
        <div className={cn(
            "group relative bg-white border rounded-xl overflow-hidden transition-all duration-200",
            "hover:shadow-lg hover:border-blue-300",
            status === 'failed' && "border-red-300 bg-red-50"
        )}>
            {/* Image Container */}
            <div className="relative aspect-[2/3] bg-gray-100 overflow-hidden">
                {status === 'pending' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                        <div className="text-gray-400 text-sm">Waiting...</div>
                    </div>
                )}
                
                {status === 'generating' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                            <span className="text-sm text-gray-500">Generating...</span>
                        </div>
                    </div>
                )}
                
                {status === 'completed' && imageDataUrl && (
                    <>
                        <img
                            src={imageDataUrl}
                            alt={`Preview pin ${rowIndex + 1}`}
                            className="w-full h-full object-cover"
                        />
                        
                        {/* Hover overlay with zoom button */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                                onClick={onInspect}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-lg font-medium text-sm hover:bg-gray-100 transition-colors"
                            >
                                <ZoomIn className="w-4 h-4" />
                                Inspect
                            </button>
                        </div>
                    </>
                )}
                
                {status === 'failed' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-50">
                        <div className="flex flex-col items-center gap-2 p-4 text-center">
                            <XCircle className="w-8 h-8 text-red-500" />
                            <span className="text-sm text-red-700">Failed to generate</span>
                            {pin.error && (
                                <span className="text-xs text-red-500 max-w-full truncate">
                                    {pin.error}
                                </span>
                            )}
                        </div>
                    </div>
                )}
                
                {/* Row number badge */}
                <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded font-medium">
                    #{rowIndex + 1}
                </div>
                
                {/* Validation badge */}
                {status === 'completed' && (
                    <div className="absolute top-2 right-2">
                        <ValidationBadge warnings={validationWarnings} />
                    </div>
                )}
            </div>
            
            {/* Card Footer */}
            <div className="p-3">
                <h4 className="font-medium text-gray-900 text-sm truncate" title={displayTitle}>
                    {displayTitle}
                </h4>
                
                {status === 'completed' && (
                    <p className="text-xs text-gray-500 mt-1">
                        Generated in {generationTimeMs}ms
                    </p>
                )}
                
                {/* Validation warnings preview */}
                {validationWarnings.length > 0 && status === 'completed' && (
                    <div className="mt-2 space-y-1">
                        {validationWarnings.slice(0, 2).map((warning, i) => (
                            <div 
                                key={i}
                                className={cn(
                                    "text-xs px-2 py-1 rounded truncate",
                                    warning.severity === 'error' && "bg-red-50 text-red-700",
                                    warning.severity === 'warning' && "bg-amber-50 text-amber-700",
                                    warning.severity === 'info' && "bg-blue-50 text-blue-700"
                                )}
                                title={warning.message}
                            >
                                {warning.message}
                            </div>
                        ))}
                        {validationWarnings.length > 2 && (
                            <div className="text-xs text-gray-500">
                                +{validationWarnings.length - 2} more
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================
// Preview Grid Component
// ============================================
export interface PreviewGridProps {
    pins: PreviewPin[];
    onInspect?: (pin: PreviewPin) => void;
}

export function PreviewGrid({ pins, onInspect }: PreviewGridProps) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {pins.map((pin) => (
                <PreviewCard
                    key={pin.rowIndex}
                    pin={pin}
                    onInspect={() => onInspect?.(pin)}
                />
            ))}
        </div>
    );
}
