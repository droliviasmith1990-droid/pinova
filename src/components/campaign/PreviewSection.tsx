'use client';

import React, { useState, useEffect } from 'react';
import { 
    Eye, 
    RefreshCw, 
    CheckCircle, 
    AlertTriangle, 
    XCircle,
    Loader2,
    ChevronDown,
    ChevronUp,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCampaignWizard } from '@/lib/campaigns/CampaignWizardContext';
import { getTemplate } from '@/lib/db/templates';
import { usePreviewGeneration, PreviewPin, ValidationWarning } from '@/hooks/usePreviewGeneration';
import { PreviewGrid } from './PreviewCard';
import { Element, CanvasSize } from '@/types/editor';

// ============================================
// Types
// ============================================
interface PreviewSectionProps {
    className?: string;
}

interface InspectModalProps {
    pin: PreviewPin | null;
    onClose: () => void;
}

// ============================================
// Inspect Modal Component
// ============================================
function InspectModal({ pin, onClose }: InspectModalProps) {
    if (!pin) return null;
    
    const displayTitle = pin.csvRowData.title 
        || pin.csvRowData.name 
        || pin.csvRowData.product_name 
        || `Row ${pin.rowIndex + 1}`;
    
    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row"
                onClick={e => e.stopPropagation()}
            >
                {/* Image Preview */}
                <div className="flex-1 bg-gray-100 flex items-center justify-center p-6 min-h-[400px]">
                    {pin.imageDataUrl ? (
                        <img
                            src={pin.imageDataUrl}
                            alt={`Preview pin ${pin.rowIndex + 1}`}
                            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                        />
                    ) : (
                        <div className="text-gray-500">No preview available</div>
                    )}
                </div>
                
                {/* Details Panel */}
                <div className="w-full md:w-80 p-6 border-t md:border-t-0 md:border-l border-gray-200 overflow-y-auto max-h-[50vh] md:max-h-[90vh]">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Pin #{pin.rowIndex + 1}
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                    
                    <div className="space-y-4">
                        {/* Title */}
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Title
                            </p>
                            <p className="text-gray-900">{displayTitle}</p>
                        </div>
                        
                        {/* Generation Time */}
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Generation Time
                            </p>
                            <p className="text-gray-900">{pin.generationTimeMs}ms</p>
                        </div>
                        
                        {/* Validation Status */}
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Validation
                            </p>
                            {pin.validationWarnings.length === 0 ? (
                                <div className="flex items-center gap-2 text-green-600">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>All checks passed</span>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {pin.validationWarnings.map((warning, i) => (
                                        <WarningItem key={i} warning={warning} />
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        {/* CSV Data */}
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                CSV Data Used
                            </p>
                            <div className="space-y-2">
                                {Object.entries(pin.csvRowData).slice(0, 10).map(([key, value]) => (
                                    <div key={key} className="text-xs">
                                        <span className="font-medium text-gray-700">{key}:</span>
                                        <span className="text-gray-600 ml-1 truncate block max-w-full" title={value}>
                                            {value || '(empty)'}
                                        </span>
                                    </div>
                                ))}
                                {Object.keys(pin.csvRowData).length > 10 && (
                                    <div className="text-xs text-gray-500">
                                        +{Object.keys(pin.csvRowData).length - 10} more fields
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================
// Warning Item Component
// ============================================
function WarningItem({ warning }: { warning: ValidationWarning }) {
    const icons = {
        error: <XCircle className="w-4 h-4 text-red-500" />,
        warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
        info: <CheckCircle className="w-4 h-4 text-blue-500" />,
    };
    
    const styles = {
        error: 'bg-red-50 border-red-200 text-red-700',
        warning: 'bg-amber-50 border-amber-200 text-amber-700',
        info: 'bg-blue-50 border-blue-200 text-blue-700',
    };
    
    return (
        <div className={cn(
            "flex items-start gap-2 p-2 rounded-lg border text-sm",
            styles[warning.severity]
        )}>
            <div className="flex-shrink-0 mt-0.5">{icons[warning.severity]}</div>
            <span>{warning.message}</span>
        </div>
    );
}

// ============================================
// Main Component
// ============================================
export function PreviewSection({ className }: PreviewSectionProps) {
    const { 
        csvData, 
        selectedTemplate, 
        fieldMapping,
        previewStatus,
        setPreviewStatus,
    } = useCampaignWizard();
    
    const [template, setTemplate] = useState<{
        elements: Element[];
        canvas_size: CanvasSize;
        background_color: string;
    } | null>(null);
    const [templateLoading, setTemplateLoading] = useState(true); // Start as true
    const [inspectPin, setInspectPin] = useState<PreviewPin | null>(null);
    const [isExpanded, setIsExpanded] = useState(true);
    
    // Load template data when selected template changes
    useEffect(() => {
        const loadTemplate = async () => {
            if (!selectedTemplate) {
                setTemplateLoading(false);
                return;
            }
            
            setTemplateLoading(true);
            try {
                const fetchedTemplate = await getTemplate(selectedTemplate.id);
                if (fetchedTemplate) {
                    setTemplate({
                        elements: fetchedTemplate.elements as Element[],
                        canvas_size: fetchedTemplate.canvas_size as CanvasSize,
                        background_color: fetchedTemplate.background_color || '#ffffff',
                    });
                }
            } catch (err) {
                console.error('Failed to load template:', err);
            } finally {
                setTemplateLoading(false);
            }
        };
        
        loadTemplate();
    }, [selectedTemplate]);
    
    // Use preview generation hook
    const {
        previewPins,
        isGenerating,
        error,
        progress,
        generate,
        regenerate,
        totalWarnings,
        totalErrors,
    } = usePreviewGeneration({
        csvRows: csvData?.rows || [],
        templateElements: template?.elements || [],
        canvasSize: template?.canvas_size || { width: 1000, height: 1500 },
        backgroundColor: template?.background_color || '#ffffff',
        fieldMapping: fieldMapping,
        previewCount: 5,
    });
    
    // Update context preview status
    useEffect(() => {
        if (isGenerating) {
            setPreviewStatus('generating');
        } else if (previewPins.length > 0 && previewPins.every(p => p.status === 'completed')) {
            setPreviewStatus('ready');
        } else if (error || previewPins.some(p => p.status === 'failed')) {
            setPreviewStatus('error');
        } else {
            setPreviewStatus('idle');
        }
    }, [isGenerating, previewPins, error, setPreviewStatus]);
    
    // Auto-generate when all requirements are met
    useEffect(() => {
        if (csvData && template && Object.keys(fieldMapping).length > 0 && !isGenerating && previewPins.length === 0) {
            generate();
        }
    }, [csvData, template, fieldMapping, isGenerating, previewPins.length, generate]);
    
    // Show loading state while template loads
    if (templateLoading) {
        return (
            <div className={cn("bg-white border border-gray-200 rounded-xl p-6", className)}>
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin mr-2" />
                    <span className="text-gray-600">Loading template for preview...</span>
                </div>
            </div>
        );
    }
    
    // Don't show until we have all requirements
    if (!csvData || !template || Object.keys(fieldMapping).length === 0) {
        return null;
    }
    
    const completedCount = previewPins.filter(p => p.status === 'completed').length;
    const totalCount = previewPins.length;
    
    return (
        <div className={cn("bg-white border border-gray-200 rounded-xl overflow-hidden", className)}>
            {/* Header */}
            <div 
                className="flex items-center justify-between px-6 py-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-lg",
                        previewStatus === 'ready' ? 'bg-green-100' :
                        previewStatus === 'error' ? 'bg-red-100' :
                        previewStatus === 'generating' ? 'bg-blue-100' :
                        'bg-gray-100'
                    )}>
                        {previewStatus === 'generating' ? (
                            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                        ) : previewStatus === 'ready' ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : previewStatus === 'error' ? (
                            <XCircle className="w-5 h-5 text-red-600" />
                        ) : (
                            <Eye className="w-5 h-5 text-gray-600" />
                        )}
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">
                            Preview Samples
                        </h3>
                        <p className="text-sm text-gray-500">
                            {isGenerating 
                                ? `Generating ${progress} of ${totalCount} previews...`
                                : previewStatus === 'ready'
                                    ? `${completedCount} previews ready • ${csvData.rowCount} total pins`
                                    : previewStatus === 'error'
                                        ? 'Some previews failed to generate'
                                        : 'Inspect sample pins before generating all'
                            }
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    {/* Validation summary */}
                    {previewStatus === 'ready' && (
                        <div className="flex items-center gap-2 mr-4">
                            {totalErrors > 0 ? (
                                <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                                    <XCircle className="w-4 h-4" />
                                    <span>{totalErrors} error{totalErrors > 1 ? 's' : ''}</span>
                                </div>
                            ) : totalWarnings > 0 ? (
                                <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span>{totalWarnings} warning{totalWarnings > 1 ? 's' : ''}</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>All valid</span>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Regenerate button */}
                    {!isGenerating && previewPins.length > 0 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                regenerate();
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Regenerate
                        </button>
                    )}
                    
                    {/* Expand/Collapse */}
                    {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                </div>
            </div>
            
            {/* Content */}
            {isExpanded && (
                <div className="p-6">
                    {/* Error State */}
                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center gap-2 text-red-700">
                                <XCircle className="w-5 h-5" />
                                <span className="font-medium">Preview Generation Failed</span>
                            </div>
                            <p className="mt-1 text-sm text-red-600">{error}</p>
                        </div>
                    )}
                    
                    {/* Preview Grid */}
                    <PreviewGrid
                        pins={previewPins}
                        onInspect={setInspectPin}
                    />
                    
                    {/* Field Mapping Summary */}
                    {Object.keys(fieldMapping).length > 0 && (
                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">
                                Field Mapping Used
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(fieldMapping).map(([templateField, csvColumn]) => (
                                    <div 
                                        key={templateField}
                                        className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs"
                                    >
                                        <span className="font-medium text-gray-700">{templateField}</span>
                                        <span className="text-gray-400">→</span>
                                        <span className="text-gray-600">{csvColumn}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Info about upcoming generation */}
                    {previewStatus === 'ready' && (
                        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start gap-3">
                                <Eye className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm text-blue-800 font-medium">
                                        Ready to generate {csvData.rowCount.toLocaleString()} pins
                                    </p>
                                    <p className="text-sm text-blue-600 mt-1">
                                        These previews show how your first 5 pins will look. 
                                        Click &quot;Create Campaign&quot; below to generate all pins.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {/* Inspect Modal */}
            <InspectModal 
                pin={inspectPin} 
                onClose={() => setInspectPin(null)} 
            />
        </div>
    );
}
