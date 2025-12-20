'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { 
    ChevronDown, 
    AlertCircle, 
    Check, 
    Plus, 
    Trash2, 
    ImageIcon, 
    Type, 
    Info,
    FileSpreadsheet,
    Table,
    FileText,
    Link2,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCampaignWizard } from '@/lib/campaigns/CampaignWizardContext';
import { autoMapFields } from '@/lib/utils/csvParser';
import { getTemplate } from '@/lib/db/templates';
import { Element, TextElement, ImageElement, TemplateField } from '@/types/editor';

interface DynamicField {
    name: string;
    type: 'text' | 'image';
    layerName: string;
    required: boolean;
    isAdditional?: boolean;
}

// Extract dynamic fields from template
function extractDynamicFields(
    elements: Element[],
    templateFields?: TemplateField[]
): DynamicField[] {
    const fields: DynamicField[] = [];
    const seen = new Set<string>();

    // First, use pre-saved template fields if available
    if (templateFields && templateFields.length > 0) {
        templateFields.forEach(tf => {
            if (!seen.has(tf.name)) {
                seen.add(tf.name);
                fields.push({
                    name: tf.name,
                    type: tf.type,
                    layerName: tf.layerName || tf.name,
                    required: tf.required
                });
            }
        });
        return fields.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'image' ? -1 : 1;
            return a.name.localeCompare(b.name, undefined, { numeric: true });
        });
    }

    // Fallback: scan elements for dynamic fields
    elements.forEach((element) => {
        if (element.type === 'text') {
            const textEl = element as TextElement;
            if (textEl.isDynamic && textEl.dynamicField && !seen.has(textEl.dynamicField)) {
                seen.add(textEl.dynamicField);
                fields.push({
                    name: textEl.dynamicField,
                    type: 'text',
                    layerName: element.name,
                    required: fields.filter(f => f.type === 'text').length === 0
                });
            }
            // Also check for {{field}} patterns in text content
            const textContent = textEl.text || '';
            const matches = textContent.match(/\{\{(\w+)\}\}/g);
            if (matches) {
                matches.forEach((match) => {
                    const fieldName = match.replace(/\{\{|\}\}/g, '');
                    if (!seen.has(fieldName)) {
                        seen.add(fieldName);
                        fields.push({
                            name: fieldName,
                            type: 'text',
                            layerName: element.name,
                            required: false
                        });
                    }
                });
            }
        } else if (element.type === 'image') {
            const imgEl = element as ImageElement;
            if (imgEl.isDynamic && imgEl.dynamicSource && !seen.has(imgEl.dynamicSource)) {
                seen.add(imgEl.dynamicSource);
                fields.push({
                    name: imgEl.dynamicSource,
                    type: 'image',
                    layerName: element.name,
                    required: fields.filter(f => f.type === 'image').length === 0
                });
            }
        }
    });

    return fields.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'image' ? -1 : 1;
        return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
}

interface FieldMappingSectionProps {
    className?: string;
}

export function FieldMappingSection({ className }: FieldMappingSectionProps) {
    const { 
        csvData, 
        selectedTemplate, 
        fieldMapping, 
        setFieldMapping, 
        updateFieldMapping 
    } = useCampaignWizard();

    const [templateFields, setTemplateFields] = useState<DynamicField[]>([]);
    const [additionalFields, setAdditionalFields] = useState<DynamicField[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [nextTextNumber, setNextTextNumber] = useState(1);
    const [nextImageNumber, setNextImageNumber] = useState(1);
    const [showColumns, setShowColumns] = useState(false);
    
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Combine template fields and additional fields - memoized to prevent useEffect re-runs
    const allFields = useMemo(() => 
        [...templateFields, ...additionalFields], 
        [templateFields, additionalFields]
    );
    const textFields = useMemo(() => 
        allFields.filter(f => f.type === 'text'), 
        [allFields]
    );
    const imageFields = useMemo(() => 
        allFields.filter(f => f.type === 'image'), 
        [allFields]
    );

    // Fetch template and extract dynamic fields
    useEffect(() => {
        const loadTemplateFields = async () => {
            if (!selectedTemplate) {
                setTemplateFields([]);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const fullTemplate = await getTemplate(selectedTemplate.id) as { 
                    elements?: Element[]; 
                    dynamic_fields?: TemplateField[] 
                };
                if (fullTemplate && fullTemplate.elements) {
                    const fields = extractDynamicFields(
                        fullTemplate.elements as Element[],
                        fullTemplate.dynamic_fields
                    );
                    setTemplateFields(fields);

                    // Calculate next field numbers
                    const textNums = fields.filter(f => f.type === 'text' && f.name.match(/^text(\d+)$/))
                        .map(f => parseInt(f.name.replace('text', '')));
                    const imageNums = fields.filter(f => f.type === 'image' && f.name.match(/^image(\d+)$/))
                        .map(f => parseInt(f.name.replace('image', '')));

                    setNextTextNumber(textNums.length > 0 ? Math.max(...textNums) + 1 : 1);
                    setNextImageNumber(imageNums.length > 0 ? Math.max(...imageNums) + 1 : 1);
                } else {
                    setTemplateFields([]);
                }
            } catch (error) {
                console.error('Error loading template:', error);
                setTemplateFields([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadTemplateFields();
    }, [selectedTemplate]);

    // Auto-map fields when template fields are loaded
    useEffect(() => {
        if (allFields.length > 0 && csvData && Object.keys(fieldMapping).length === 0) {
            const fieldNames = allFields.map((f: DynamicField) => f.name);
            const autoMapping = autoMapFields(csvData.headers, fieldNames);
            if (Object.keys(autoMapping).length > 0) {
                setFieldMapping(autoMapping);
            }
        }
    }, [allFields, csvData, fieldMapping, setFieldMapping]);

    // Handle clicks outside dropdown to close it
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenDropdown(null);
            }
        };

        if (openDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [openDropdown]);

    // Add new text field
    const handleAddTextField = useCallback(() => {
        const newField: DynamicField = {
            name: `text${nextTextNumber}`,
            type: 'text',
            layerName: `Text ${nextTextNumber}`,
            required: false,
            isAdditional: true
        };
        setAdditionalFields(prev => [...prev, newField]);
        setNextTextNumber(prev => prev + 1);
    }, [nextTextNumber]);

    // Add new image field
    const handleAddImageField = useCallback(() => {
        const newField: DynamicField = {
            name: `image${nextImageNumber}`,
            type: 'image',
            layerName: `Image ${nextImageNumber}`,
            required: false,
            isAdditional: true
        };
        setAdditionalFields(prev => [...prev, newField]);
        setNextImageNumber(prev => prev + 1);
    }, [nextImageNumber]);

    // Delete field
    const handleDeleteField = useCallback((fieldName: string) => {
        setAdditionalFields(prev => prev.filter(f => f.name !== fieldName));
        const newMapping = { ...fieldMapping };
        delete newMapping[fieldName];
        setFieldMapping(newMapping);
    }, [fieldMapping, setFieldMapping]);

    const getPreviewValue = (columnName: string): string => {
        if (!csvData || !csvData.rows[0] || !columnName) return '';
        const value = csvData.rows[0][columnName] || '';
        return value.length > 50 ? value.substring(0, 50) + '...' : value;
    };

    const isMapped = (field: string): boolean => {
        return field in fieldMapping && fieldMapping[field] !== '';
    };

    const mappedCount = allFields.filter((f: DynamicField) => isMapped(f.name)).length;
    const requiredUnmapped = allFields.filter((f: DynamicField) => f.required && !isMapped(f.name));

    // Don't show if no template selected
    if (!selectedTemplate) {
        return null;
    }

    const renderFieldRow = (field: DynamicField) => (
        <div
            key={field.name}
            className={cn(
                "group bg-surface-light border rounded-xl p-4 transition-all duration-300",
                "hover:shadow-creative-sm",
                isMapped(field.name)
                    ? "border-green-200 bg-green-50/30"
                    : field.required
                        ? "border-amber-200 bg-amber-50/30 shadow-none"
                        : "border-gray-200 hover:border-blue-200"
            )}
        >
            <div className="flex items-center justify-between gap-4">
                {/* Status Icon */}
                <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105",
                    isMapped(field.name) 
                        ? "bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-green-200" 
                        : field.required 
                            ? "bg-white border-2 border-amber-300 text-amber-500" 
                            : "bg-gray-100 text-gray-400"
                )}>
                    {isMapped(field.name) ? (
                        <Check className="w-5 h-5 stroke-[3]" />
                    ) : field.required ? (
                        <AlertCircle className="w-5 h-5" />
                    ) : (
                        <div className="w-2 h-2 rounded-full bg-gray-300" />
                    )}
                </div>
                
                {/* Field Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        {field.type === 'image' ? (
                            <ImageIcon className="w-4 h-4 text-primary-creative" />
                        ) : (
                            <Type className="w-4 h-4 text-accent-1" />
                        )}
                        <span className="font-heading font-semibold text-gray-900">
                            {field.name.replace(/(\d+)$/, ' $1').replace(/_/g, ' ')}
                        </span>
                        {field.required && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-bold uppercase tracking-wider">
                                Required
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 font-mono">
                        {`{{${field.name}}}`}
                    </p>
                </div>

                {/* Column Dropdown */}
                <div ref={openDropdown === field.name ? dropdownRef : null} className="relative w-56">
                    <button
                        type="button"
                        onClick={() => setOpenDropdown(openDropdown === field.name ? null : field.name)}
                        className={cn(
                            "w-full flex items-center justify-between gap-2 px-4 py-2.5 border rounded-xl text-left text-sm transition-all",
                            isMapped(field.name)
                                ? "border-green-200 bg-white text-gray-900 font-medium shadow-sm"
                                : field.required
                                    ? "border-amber-300 bg-white text-gray-700"
                                    : "border-gray-200 bg-white text-gray-500 hover:border-primary-creative/50 hover:text-gray-900"
                        )}
                    >
                        <span className="truncate">
                            {fieldMapping[field.name] || 'Select column...'}
                        </span>
                        <ChevronDown className={cn(
                            "w-4 h-4 transition-transform duration-200",
                            openDropdown === field.name ? "rotate-180 text-primary-creative" : "text-gray-400"
                        )} />
                    </button>

                    {/* Dropdown Menu */}
                    {openDropdown === field.name && (
                        <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-creative-lg max-h-56 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
                            <button
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    updateFieldMapping(field.name, '');
                                    setOpenDropdown(null);
                                }}
                                className="w-full px-4 py-2.5 text-left text-gray-400 hover:bg-gray-50 text-xs uppercase tracking-wider font-bold"
                            >
                                Clear selection
                            </button>
                            {csvData?.headers.map((header, idx) => (
                                <button
                                    type="button"
                                    key={`dropdown-${field.name}-${idx}`}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        updateFieldMapping(field.name, header);
                                        setOpenDropdown(null);
                                    }}
                                    className={cn(
                                        "w-full px-4 py-2.5 text-left text-sm flex items-center justify-between transition-colors",
                                        fieldMapping[field.name] === header 
                                            ? "bg-primary-creative/5 text-primary-creative font-medium" 
                                            : "hover:bg-gray-50 text-gray-700"
                                    )}
                                >
                                    <span className="truncate">{header}</span>
                                    {fieldMapping[field.name] === header && (
                                        <Check className="w-4 h-4 shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Delete Button */}
                {field.isAdditional && (
                    <button
                        onClick={() => handleDeleteField(field.name)}
                        className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all hover:scale-105"
                        title="Remove field"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Preview */}
            {isMapped(field.name) && (
                <div className="mt-3 pt-3 border-t border-gray-100/50 flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">Preview</span>
                    <div className="text-sm px-2 py-1 bg-white/50 rounded-md border border-gray-100 max-w-full truncate text-gray-700">
                        {field.type === 'image' ? (
                            <span className="flex items-center gap-1.5 text-blue-600">
                                <Link2 className="w-3 h-3" />
                                {getPreviewValue(fieldMapping[field.name]) || 'empty'}
                            </span>
                        ) : (
                            getPreviewValue(fieldMapping[field.name]) || <span className="italic text-gray-400">empty</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <section className={cn(
            "bg-white/80 backdrop-blur-md border border-white/40 rounded-2xl p-8 space-y-8 shadow-creative-sm",
            "animate-in slide-in-from-bottom-4 duration-500",
            className
        )}>
            {/* Section Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <Link2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="font-heading font-semibold text-gray-900 text-lg">Map Variables</h2>
                        <div className="text-sm text-gray-500 font-medium mt-0.5">
                            <span className={cn(
                                "font-bold",
                                mappedCount === allFields.length ? "text-green-600" : "text-primary-creative"
                            )}>{mappedCount}</span>
                            <span className="text-gray-400 mx-1">/</span>
                            {allFields.length} fields mapped
                        </div>
                    </div>
                </div>
                
                {requiredUnmapped.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-full border border-amber-100">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-semibold text-amber-700">Action Required</span>
                    </div>
                )}
            </div>

            {/* Info Banner */}
            <div className="relative overflow-hidden p-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 border border-blue-100/50">
                 <div className="p-5 flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm text-primary-creative">
                        <Info className="w-4 h-4" />
                    </div>
                    <div className="space-y-2">
                        <p className="font-semibold text-gray-900 text-sm">Mapping Guide</p>
                        <p className="text-xs text-gray-500 leading-relaxed max-w-xl">
                            Connect your spreadsheet headers to the design template variables. 
                            For example, map the <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 font-mono text-gray-700">{'{{ProductName}}'}</code> variable 
                            to your CSV&apos;s &quot;Product Title&quot; column.
                        </p>
                    </div>
                </div>
            </div>

            {/* CSV Preview Card */}
            {csvData && (
                <div className="bg-surface-light border border-gray-100 rounded-xl p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center shrink-0 shadow-sm">
                                <FileSpreadsheet className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-900">{csvData.fileName}</span>
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wide rounded-full">
                                        Active Source
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <Table className="w-3 h-3" /> {csvData.rowCount} rows
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                                    <span className="flex items-center gap-1">
                                        <FileText className="w-3 h-3" /> {csvData.headers.length} columns
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Column Pills */}
                    <div className="flex flex-wrap gap-2">
                        {csvData.headers.slice(0, showColumns ? undefined : 8).map((header, i) => (
                            <span
                                key={i}
                                className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 shadow-sm"
                            >
                                {header}
                            </span>
                        ))}
                        {csvData.headers.length > 8 && !showColumns && (
                            <button
                                onClick={() => setShowColumns(true)}
                                className="px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-200 transition-colors"
                            >
                                +{csvData.headers.length - 8} more
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Loading State */}
            {isLoading ? (
                <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 text-primary-creative animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Scanning template for variables...</p>
                </div>
            ) : allFields.length === 0 ? (
                // No fields state
                <div className="text-center py-12 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Type className="w-6 h-6 text-gray-300" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">No dynamic fields detected</h3>
                    <p className="text-xs text-gray-500 mb-6 max-w-xs mx-auto">
                        This template doesn&apos;t seem to have any named variables. You can manually add fields below.
                    </p>
                    <div className="flex justify-center gap-3">
                        <button
                            onClick={handleAddTextField}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-sm font-medium shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add Text Variable
                        </button>
                        <button
                            onClick={handleAddImageField}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-sm font-medium shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add Image Variable
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Image Fields */}
                    {imageFields.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                                <ImageIcon className="w-4 h-4 text-gray-400" />
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    Image Variables
                                </h3>
                            </div>
                            <div className="space-y-3">
                                {imageFields.map(renderFieldRow)}
                            </div>
                        </div>
                    )}

                    {/* Text Fields */}
                    {textFields.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                                <Type className="w-4 h-4 text-gray-400" />
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    Text Variables
                                </h3>
                            </div>
                            <div className="space-y-3">
                                {textFields.map(renderFieldRow)}
                            </div>
                        </div>
                    )}
                    
                    {/* Manual Add Buttons */}
                     <div className="flex items-center justify-center gap-4 pt-4 opacity-0 hover:opacity-100 transition-opacity duration-300">
                        <button onClick={handleAddTextField} className="text-xs text-gray-400 hover:text-primary-creative flex items-center gap-1 transition-colors">
                            <Plus className="w-3 h-3" /> Add Text Field
                        </button>
                         <button onClick={handleAddImageField} className="text-xs text-gray-400 hover:text-green-600 flex items-center gap-1 transition-colors">
                            <Plus className="w-3 h-3" /> Add Image Field
                        </button>
                     </div>
                </>
            )}
        </section>
    );
}
