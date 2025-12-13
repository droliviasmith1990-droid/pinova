'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Link2, ChevronDown, AlertCircle, Check, Plus, Trash2, Image, Type, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCampaignWizard } from '@/lib/campaigns/CampaignWizardContext';
import { autoMapFields } from '@/lib/utils/csvParser';
import { getTemplate } from '@/lib/db/templates';
import { Element, TextElement, ImageElement, TemplateField } from '@/types/editor';
import { validateCSV, getValidationSummary } from '@/lib/utils/csvValidator';

interface DynamicField {
    name: string;
    type: 'text' | 'image';
    layerName: string;
    required: boolean;
    isAdditional?: boolean;
}

// Extract dynamic fields from template - checks both dynamic_fields array and elements
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

export function StepMapFields() {
    const { csvData, selectedTemplate, fieldMapping, setFieldMapping, updateFieldMapping } = useCampaignWizard();

    const [templateFields, setTemplateFields] = useState<DynamicField[]>([]);
    const [additionalFields, setAdditionalFields] = useState<DynamicField[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [nextTextNumber, setNextTextNumber] = useState(1);
    const [nextImageNumber, setNextImageNumber] = useState(1);
    const [showValidation, setShowValidation] = useState(false);

    // Combine template fields and additional fields
    const allFields = [...templateFields, ...additionalFields];
    const textFields = allFields.filter(f => f.type === 'text');
    const imageFields = allFields.filter(f => f.type === 'image');

    // Validate CSV on field mapping changes (wrapped in try-catch to prevent errors from breaking UI)
    let validationResult = null;
    try {
        if (csvData && csvData.rows && csvData.rows.length > 0) {
            const requiredFieldNames = allFields.filter(f => f.required).map(f => f.name);
            validationResult = validateCSV(csvData.rows, fieldMapping, requiredFieldNames);
        }
    } catch (error) {
        console.error('CSV validation error:', error);
        validationResult = null;
    }

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
                const fullTemplate = await getTemplate(selectedTemplate.id) as { elements?: Element[]; dynamic_fields?: TemplateField[] };
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
            const fieldNames = allFields.map(f => f.name);
            const autoMapping = autoMapFields(csvData.headers, fieldNames);
            if (Object.keys(autoMapping).length > 0) {
                setFieldMapping(autoMapping);
            }
        }
    }, [templateFields, additionalFields, csvData, fieldMapping, setFieldMapping, allFields]);

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
        // Remove from additional fields
        setAdditionalFields(prev => prev.filter(f => f.name !== fieldName));
        // Remove from mapping - create new object without the field
        const newMapping = { ...fieldMapping };
        delete newMapping[fieldName];
        setFieldMapping(newMapping);
    }, [fieldMapping, setFieldMapping]);

    if (!csvData) {
        return (
            <div className="text-center py-12 text-gray-500">
                Please upload a CSV file first.
            </div>
        );
    }

    const getPreviewValue = (columnName: string): string => {
        if (!csvData.rows[0] || !columnName) return '';
        const value = csvData.rows[0][columnName] || '';
        return value.length > 50 ? value.substring(0, 50) + '...' : value;
    };

    const isMapped = (field: string): boolean => {
        return field in fieldMapping && fieldMapping[field] !== '';
    };

    const mappedCount = allFields.filter(f => isMapped(f.name)).length;
    const requiredUnmapped = allFields.filter(f => f.required && !isMapped(f.name));

    // Close dropdown when clicking outside - using ref instead of blur
    const dropdownRef = React.useRef<HTMLDivElement>(null);

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

    const renderFieldRow = (field: DynamicField) => (
        <div
            key={field.name}
            className={cn(
                "bg-white border rounded-xl p-4 transition-all",
                isMapped(field.name)
                    ? "border-green-300 bg-green-50/30"
                    : field.required
                        ? "border-amber-300 bg-amber-50/30"
                        : "border-gray-200"
            )}
        >
            <div className="flex items-center justify-between gap-4">
                {/* Field Label */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        {field.type === 'image' ? (
                            <Image className="w-4 h-4 text-green-600" />
                        ) : (
                            <Type className="w-4 h-4 text-blue-600" />
                        )}
                        <span className="font-medium text-gray-900 capitalize">
                            {field.name.replace(/(\d+)$/, ' $1').replace(/_/g, ' ')}
                        </span>
                        {field.required && (
                            <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">Required</span>
                        )}
                        {isMapped(field.name) && (
                            <Check className="w-4 h-4 text-green-600" />
                        )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Template field: <code className="bg-gray-100 px-1 rounded">{`{{${field.name}}}`}</code>
                    </p>
                </div>

                {/* Column Dropdown */}
                <div ref={dropdownRef} className="relative flex-1 max-w-xs">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenDropdown(openDropdown === field.name ? null : field.name);
                        }}
                        className={cn(
                            "w-full flex items-center justify-between gap-2 px-4 py-2.5 border rounded-lg text-left transition-colors",
                            isMapped(field.name)
                                ? "border-green-300 bg-white"
                                : "border-gray-300 bg-white hover:border-blue-400"
                        )}
                    >
                        <span className={cn(
                            "truncate",
                            fieldMapping[field.name] ? "text-gray-900" : "text-gray-400"
                        )}>
                            {fieldMapping[field.name] || 'Select column...'}
                        </span>
                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </button>

                    {/* Dropdown Menu */}
                    {openDropdown === field.name && (
                        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            <button
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    updateFieldMapping(field.name, '');
                                    setOpenDropdown(null);
                                }}
                                className="w-full px-4 py-2 text-left text-gray-400 hover:bg-gray-50 text-sm"
                            >
                                -- Clear selection --
                            </button>
                            {csvData.headers.map((header, headerIndex) => (
                                <button
                                    type="button"
                                    key={`dropdown-${field.name}-${headerIndex}`}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        updateFieldMapping(field.name, header);
                                        setOpenDropdown(null);
                                    }}
                                    className={cn(
                                        "w-full px-4 py-2 text-left hover:bg-blue-50 text-sm flex items-center justify-between",
                                        fieldMapping[field.name] === header && "bg-blue-50 text-blue-600"
                                    )}
                                >
                                    <span className="truncate">{header}</span>
                                    {fieldMapping[field.name] === header && (
                                        <Check className="w-4 h-4 flex-shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Delete Button (only for additional/optional) */}
                {(field.isAdditional || !field.required) && (
                    <button
                        onClick={() => handleDeleteField(field.name)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove field"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Preview */}
            {isMapped(field.name) && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-sm text-gray-600">
                        <span className="text-gray-400">Preview: </span>
                        {field.type === 'image' ? (
                            <span className="text-blue-600 underline truncate block">
                                {getPreviewValue(fieldMapping[field.name]) || <span className="italic text-gray-400">empty</span>}
                            </span>
                        ) : (
                            <span className="font-medium">
                                {getPreviewValue(fieldMapping[field.name]) || <span className="italic text-gray-400">empty</span>}
                            </span>
                        )}
                    </p>
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold text-gray-900">Map Your Fields</h2>
                <p className="text-gray-600 mt-1">
                    Connect each template field to a column from your CSV file.
                </p>
            </div>

            {/* Info Banner */}
            <div className="flex items-start gap-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Info className="w-5 h-5 text-blue-600" />
                </div>
                <div className="space-y-1">
                    <p className="font-medium text-blue-900">How Field Mapping Works</p>
                    <p className="text-sm text-blue-700">
                        Template fields like <code className="bg-blue-100 px-1 rounded">{"{{text1}}"}</code> are placeholders in your design.
                        Connect them to CSV columns to replace placeholders with real data for each pin.
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-blue-600">
                        <span className="px-2 py-0.5 bg-white rounded border border-blue-200">Template Field</span>
                        <span>→</span>
                        <span className="px-2 py-0.5 bg-white rounded border border-blue-200">CSV Column</span>
                        <span>=</span>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded border border-green-200">Data in Pin</span>
                    </div>
                </div>
            </div>

            {/* Summary Badge */}
            <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                    <Type className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-700">
                        <strong>{textFields.length}</strong> text fields
                    </span>
                </div>
                <div className="w-px h-4 bg-gray-300" />
                <div className="flex items-center gap-2">
                    <Image className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-700">
                        <strong>{imageFields.length}</strong> image fields
                    </span>
                </div>
                <div className="ml-auto flex items-center gap-1">
                    <span className={cn(
                        "text-sm font-medium",
                        mappedCount === allFields.length ? "text-green-600" : "text-gray-600"
                    )}>
                        {mappedCount} of {allFields.length} mapped
                    </span>
                    {mappedCount === allFields.length && <Check className="w-4 h-4 text-green-600" />}
                </div>
            </div>

            {/* Validation Results */}
            {validationResult && (validationResult.errors.length > 0 || validationResult.warnings.length > 0) && (
                <div className="bg-white border rounded-xl overflow-hidden">
                    <button
                        onClick={() => setShowValidation(!showValidation)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            {validationResult.errors.length > 0 ? (
                                <AlertCircle className="w-5 h-5 text-red-500" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-amber-500" />
                            )}
                            <div className="text-left">
                                <p className="font-medium text-gray-900">Validation Results</p>
                                <p className="text-sm text-gray-500">
                                    {getValidationSummary(validationResult)}
                                </p>
                            </div>
                        </div>
                        <ChevronDown className={cn(
                            "w-5 h-5 text-gray-400 transition-transform",
                            showValidation && "transform rotate-180"
                        )} />
                    </button>

                    {showValidation && (
                        <div className="border-t border-gray-200 p-4 space-y-3">
                            {validationResult.errors.map((error, idx) => (
                                <div key={`error-${idx}`} className="flex items-start gap-2 text-sm text-red-700 bg-red-50 p-3 rounded-lg">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <span>{error.message}</span>
                                </div>
                            ))}
                            {validationResult.warnings.map((warning, idx) => (
                                <div key={`warning-${idx}`} className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <span>{warning.message}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {isLoading ? (
                <div className="text-center py-8 text-gray-500">Loading template fields...</div>
            ) : allFields.length === 0 ? (
                <div className="text-center py-8">
                    <div className="flex items-center justify-center gap-2 text-gray-500 mb-4">
                        <Info className="w-5 h-5" />
                        <span>No dynamic fields found in template</span>
                    </div>
                    <p className="text-sm text-gray-400 mb-4">
                        Add fields below to map CSV columns to your pins.
                    </p>
                    <div className="flex justify-center gap-3">
                        <button
                            onClick={handleAddTextField}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Add Text Field
                        </button>
                        <button
                            onClick={handleAddImageField}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Add Image Field
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Image Fields Section */}
                    {imageFields.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-medium text-gray-700 flex items-center gap-2">
                                    <Image className="w-4 h-4 text-green-600" />
                                    Image Fields
                                </h3>
                            </div>
                            {imageFields.map(renderFieldRow)}
                        </div>
                    )}

                    {/* Add Image Button */}
                    <button
                        onClick={handleAddImageField}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-green-400 hover:text-green-600 hover:bg-green-50/50 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Image Field
                    </button>

                    <hr className="border-gray-200" />

                    {/* Text Fields Section */}
                    {textFields.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-medium text-gray-700 flex items-center gap-2">
                                    <Type className="w-4 h-4 text-blue-600" />
                                    Text Fields
                                </h3>
                            </div>
                            {textFields.map(renderFieldRow)}
                        </div>
                    )}

                    {/* Add Text Button */}
                    <button
                        onClick={handleAddTextField}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Text Field
                    </button>

                    {/* Validation Messages */}
                    {requiredUnmapped.length > 0 && (
                        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-amber-800">Required fields not mapped</p>
                                <p className="text-sm text-amber-700 mt-1">
                                    Please map: {requiredUnmapped.map(f => f.name).join(', ')}
                                </p>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
