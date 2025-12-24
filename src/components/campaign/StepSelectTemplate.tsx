'use client';

import React, { useState, useEffect } from 'react';
import { Layout, Check, Plus, Sparkles, Eye, X, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCampaignWizard, MAX_TEMPLATES } from '@/lib/campaigns/CampaignWizardContext';
import { getTemplates, TemplateListItem } from '@/lib/db/templates';
import { isSupabaseConfigured } from '@/lib/supabase';
import Link from 'next/link';
import { TemplateModeSelector } from './TemplateModeSelector';
import { DistributionModeSelector } from './DistributionModeSelector';

// Demo templates for when database is not configured
const demoTemplates: TemplateListItem[] = [
    { id: 'demo-1', short_id: 'demo-1', name: 'Recipe Card', thumbnail_url: null, category: 'Food', category_id: null, is_featured: false, view_count: 0, created_at: '', updated_at: '' },
    { id: 'demo-2', short_id: 'demo-2', name: 'Quote Post', thumbnail_url: null, category: 'Quote', category_id: null, is_featured: false, view_count: 0, created_at: '', updated_at: '' },
    { id: 'demo-3', short_id: 'demo-3', name: 'Product Showcase', thumbnail_url: null, category: 'Product', category_id: null, is_featured: false, view_count: 0, created_at: '', updated_at: '' },
];

// Skeleton loading card
function TemplateCardSkeleton() {
    return (
        <div className="bg-white rounded-xl border-2 border-gray-100 overflow-hidden animate-pulse">
            <div className="aspect-[2/3] bg-gray-200 shimmer" />
            <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4 shimmer" />
                <div className="h-3 bg-gray-100 rounded w-1/2 shimmer" />
            </div>
        </div>
    );
}

// Selected template chip for multi-select summary
function SelectedTemplateChip({ 
    template, 
    index,
    onRemove 
}: { 
    template: TemplateListItem; 
    index: number;
    onRemove: () => void;
}) {
    const colors = [
        'bg-purple-100 text-purple-700 border-purple-200',
        'bg-pink-100 text-pink-700 border-pink-200',
        'bg-blue-100 text-blue-700 border-blue-200',
        'bg-green-100 text-green-700 border-green-200',
        'bg-amber-100 text-amber-700 border-amber-200',
    ];
    const colorClass = colors[index % colors.length];
    const letter = String.fromCharCode(65 + index); // A, B, C...

    return (
        <div className={cn(
            "flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg border text-sm font-medium",
            colorClass
        )}>
            <GripVertical className="w-3 h-3 opacity-50 cursor-grab" />
            <span className="w-5 h-5 rounded bg-white/50 flex items-center justify-center text-xs font-bold">
                {letter}
            </span>
            <span className="truncate max-w-[120px]">{template.name}</span>
            <button
                type="button"
                onClick={onRemove}
                className="p-1 rounded-md hover:bg-white/50 transition-colors"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

export function StepSelectTemplate() {
    const { 
        selectedTemplate, 
        setSelectedTemplate,
        selectedTemplates,
        selectionMode,
        setSelectionMode,
        addTemplate,
        removeTemplate,
        distributionMode,
        setDistributionMode,
    } = useCampaignWizard();

    const [templates, setTemplates] = useState<TemplateListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    useEffect(() => {
        const fetchTemplates = async () => {
            setIsLoading(true);
            try {
                if (isSupabaseConfigured()) {
                    const userTemplates = await getTemplates();
                    setTemplates(userTemplates.length > 0 ? userTemplates : demoTemplates);
                } else {
                    setTemplates(demoTemplates);
                }
            } catch (error) {
                console.error('Error fetching templates:', error);
                setTemplates(demoTemplates);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTemplates();
    }, []);

    // Handle template selection based on current mode
    const handleSelect = (template: TemplateListItem) => {
        if (selectionMode === 'single') {
            // Single mode - toggle selection
            if (selectedTemplate?.id === template.id) {
                setSelectedTemplate(null);
            } else {
                setSelectedTemplate(template);
            }
        } else {
            // Multi mode - toggle in array
            const isAlreadySelected = selectedTemplates.some(t => t.id === template.id);
            if (isAlreadySelected) {
                removeTemplate(template.id);
            } else {
                addTemplate(template);
            }
        }
    };

    // Check if template is selected (either mode)
    const isTemplateSelected = (templateId: string): boolean => {
        if (selectionMode === 'single') {
            return selectedTemplate?.id === templateId;
        }
        return selectedTemplates.some(t => t.id === templateId);
    };

    // Get selection index for multi-mode (for badge letter)
    const getSelectionIndex = (templateId: string): number => {
        return selectedTemplates.findIndex(t => t.id === templateId);
    };

    return (
        <div className="space-y-6">
            {/* Header with Mode Selector */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Choose Templates</h2>
                    <p className="text-gray-600 mt-1">
                        {selectionMode === 'single' 
                            ? 'Select a template to use for all your pins.'
                            : `Select up to ${MAX_TEMPLATES} templates for variety in your pins.`}
                    </p>
                </div>
                
                <TemplateModeSelector
                    mode={selectionMode}
                    onModeChange={setSelectionMode}
                    selectedCount={selectedTemplates.length}
                />
            </div>

            {/* Distribution Mode Selector (only visible in multi-mode with 2+ templates) */}
            {selectionMode === 'multiple' && (
                <DistributionModeSelector
                    mode={distributionMode}
                    onModeChange={setDistributionMode}
                    templateCount={selectedTemplates.length}
                />
            )}

            {/* Loading State - Skeleton Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <TemplateCardSkeleton key={i} />
                    ))}
                </div>
            ) : templates.length === 0 ? (
                /* Empty State */
                <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gray-200 flex items-center justify-center mb-4">
                        <Layout className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Templates Yet</h3>
                    <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                        Create your first template in the editor before launching a campaign.
                    </p>
                    <Link
                        href="/editor"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 hover:shadow-xl hover:-translate-y-0.5"
                    >
                        <Plus className="w-5 h-5" />
                        Create Template
                    </Link>
                </div>
            ) : (
                /* Template Grid - Enhanced for multi-select */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {templates.map((template) => {
                        const isSelected = isTemplateSelected(template.id);
                        const isHovered = hoveredId === template.id;
                        const selectionIndex = getSelectionIndex(template.id);
                        const isAtMax = selectionMode === 'multiple' && 
                                        selectedTemplates.length >= MAX_TEMPLATES && 
                                        !isSelected;

                        return (
                            <button
                                key={template.id}
                                onClick={() => handleSelect(template)}
                                onMouseEnter={() => setHoveredId(template.id)}
                                onMouseLeave={() => setHoveredId(null)}
                                disabled={isAtMax}
                                className={cn(
                                    "group relative bg-white rounded-xl border-2 overflow-hidden text-left transition-all duration-300",
                                    isSelected
                                        ? "border-blue-500 ring-4 ring-blue-100 shadow-lg scale-[1.02]"
                                        : isAtMax
                                        ? "border-gray-200 opacity-50 cursor-not-allowed"
                                        : "border-gray-200 hover:border-blue-300 hover:shadow-xl hover:scale-[1.02]"
                                )}
                            >
                                {/* Selection Indicator */}
                                {isSelected && (
                                    <div className="absolute top-3 right-3 z-10">
                                        {selectionMode === 'multiple' ? (
                                            // Multi-mode: show letter badge
                                            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in-50 duration-200">
                                                <span className="text-white text-sm font-bold">
                                                    {String.fromCharCode(65 + selectionIndex)}
                                                </span>
                                            </div>
                                        ) : (
                                            // Single-mode: show checkmark
                                            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in-50 duration-200">
                                                <Check className="w-4 h-4 text-white" strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Multi-mode Checkbox Overlay */}
                                {selectionMode === 'multiple' && !isSelected && !isAtMax && (
                                    <div className={cn(
                                        "absolute top-3 right-3 z-10 w-6 h-6 border-2 rounded-md bg-white/90 shadow-sm transition-opacity",
                                        isHovered ? "opacity-100 border-blue-400" : "opacity-0 group-hover:opacity-100 border-gray-300"
                                    )} />
                                )}

                                {/* Thumbnail */}
                                <div className="aspect-[2/3] bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 relative overflow-hidden">
                                    {template.thumbnail_url ? (
                                        <img
                                            src={template.thumbnail_url}
                                            alt={template.name}
                                            className={cn(
                                                "w-full h-full object-cover transition-transform duration-500",
                                                isHovered && "scale-110"
                                            )}
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Layout className="w-12 h-12 text-white/50" />
                                        </div>
                                    )}

                                    {/* Hover Overlay */}
                                    <div className={cn(
                                        "absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center transition-opacity duration-300",
                                        isHovered && !isSelected ? "opacity-100" : "opacity-0"
                                    )}>
                                        <div className="flex items-center gap-2 px-4 py-2 bg-white/90 rounded-full text-sm font-medium text-gray-800">
                                            <Eye className="w-4 h-4" />
                                            {selectionMode === 'multiple' 
                                                ? (isAtMax ? 'Max reached' : 'Click to add')
                                                : 'Click to select'}
                                        </div>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="p-4">
                                    <h3 className="font-semibold text-gray-900 truncate">{template.name}</h3>
                                    <div className="flex items-center gap-2 mt-2">
                                        {template.category && (
                                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                                {template.category}
                                            </span>
                                        )}
                                        {isSelected && (
                                            <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                                                <Sparkles className="w-3 h-3" />
                                                {selectionMode === 'multiple' 
                                                    ? `#${selectionIndex + 1}` 
                                                    : 'Selected'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Selected Template(s) Summary */}
            {selectionMode === 'single' && selectedTemplate && (
                <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Check className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">{selectedTemplate.name}</p>
                            <p className="text-sm text-gray-600">Template ready for pin generation</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setSelectedTemplate(null)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                        Change
                    </button>
                </div>
            )}

            {/* Multi-mode Selected Templates Summary */}
            {selectionMode === 'multiple' && selectedTemplates.length > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl animate-in slide-in-from-bottom-2 duration-300 space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-900">
                                {selectedTemplates.length} Template{selectedTemplates.length !== 1 ? 's' : ''} Selected
                            </p>
                            <p className="text-sm text-gray-600">
                                {distributionMode === 'sequential' && 'Templates will cycle in order'}
                                {distributionMode === 'random' && 'Templates will be assigned randomly'}
                                {distributionMode === 'equal' && 'Rows will be split evenly between templates'}
                                {distributionMode === 'csv_column' && 'Template assigned via CSV "template" column'}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {selectedTemplates.map((template, index) => (
                            <SelectedTemplateChip
                                key={template.id}
                                template={template}
                                index={index}
                                onRemove={() => removeTemplate(template.id)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

