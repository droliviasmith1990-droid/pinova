'use client';

import React, { useState, useEffect } from 'react';
import { Layout, Loader2, Check, Plus, Sparkles, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCampaignWizard } from '@/lib/campaigns/CampaignWizardContext';
import { getTemplates, TemplateListItem } from '@/lib/db/templates';
import { isSupabaseConfigured } from '@/lib/supabase';
import Link from 'next/link';

// Demo templates for when database is not configured
const demoTemplates: TemplateListItem[] = [
    { id: 'demo-1', name: 'Recipe Card', thumbnail_url: null, category: 'Food', created_at: '', updated_at: '' },
    { id: 'demo-2', name: 'Quote Post', thumbnail_url: null, category: 'Quote', created_at: '', updated_at: '' },
    { id: 'demo-3', name: 'Product Showcase', thumbnail_url: null, category: 'Product', created_at: '', updated_at: '' },
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

export function StepSelectTemplate() {
    const { selectedTemplate, setSelectedTemplate } = useCampaignWizard();

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

    const handleSelect = (template: TemplateListItem) => {
        if (selectedTemplate?.id === template.id) {
            setSelectedTemplate(null);
        } else {
            setSelectedTemplate(template);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold text-gray-900">Choose a Template</h2>
                <p className="text-gray-600 mt-1">
                    Select the template you want to use for generating pins from your CSV data.
                </p>
            </div>

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
                /* Template Grid - Enhanced */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {templates.map((template) => {
                        const isSelected = selectedTemplate?.id === template.id;
                        const isHovered = hoveredId === template.id;

                        return (
                            <button
                                key={template.id}
                                onClick={() => handleSelect(template)}
                                onMouseEnter={() => setHoveredId(template.id)}
                                onMouseLeave={() => setHoveredId(null)}
                                className={cn(
                                    "group relative bg-white rounded-xl border-2 overflow-hidden text-left transition-all duration-300",
                                    isSelected
                                        ? "border-blue-500 ring-4 ring-blue-100 shadow-lg scale-[1.02]"
                                        : "border-gray-200 hover:border-blue-300 hover:shadow-xl hover:scale-[1.02]"
                                )}
                            >
                                {/* Selected Indicator */}
                                {isSelected && (
                                    <div className="absolute top-3 right-3 z-10 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in-50 duration-200">
                                        <Check className="w-4 h-4 text-white" strokeWidth={3} />
                                    </div>
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
                                            Click to select
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
                                                Selected
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Selected Template Summary */}
            {selectedTemplate && (
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
        </div>
    );
}
