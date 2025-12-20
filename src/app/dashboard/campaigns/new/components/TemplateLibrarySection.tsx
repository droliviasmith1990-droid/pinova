'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    Search, 
    SlidersHorizontal, 
    Star, 
    Check, 
    ExternalLink,
    RefreshCw,
    Layout,
    X,
    Loader2,
    Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TemplateListItem, getTemplates } from '@/lib/db/templates';
import { SelectableTemplateCard } from '@/components/dashboard/SelectableTemplateCard';
import { useCampaignWizard } from '@/lib/campaigns/CampaignWizardContext';

interface TemplateLibrarySectionProps {
    onTemplateSelect?: () => void;
}

export function TemplateLibrarySection({ onTemplateSelect }: TemplateLibrarySectionProps) {
    const { selectedTemplate, setSelectedTemplate } = useCampaignWizard();
    const [templates, setTemplates] = useState<TemplateListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewFilter, setViewFilter] = useState<'all' | 'featured'>('all');

    const fetchTemplates = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Using getTemplates for now, could use getTemplatesFiltered if we implemented server-side filtering
            // But client-side filtering is often smoother for small lists
            const data = await getTemplates();
            setTemplates(data);
        } catch (err) {
            console.error('Failed to load templates:', err);
            setError('Failed to load templates. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const handleSelect = (template: TemplateListItem) => {
        setSelectedTemplate(template);
        if (onTemplateSelect) {
            onTemplateSelect();
        }
    };

    const sortedTemplates = useMemo(() => {
        let filtered = [...templates];
        
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(t => 
                t.name.toLowerCase().includes(query) || 
                t.category?.toLowerCase().includes(query)
            );
        }

        if (viewFilter === 'featured') {
            filtered = filtered.filter(t => t.is_featured);
        }

        return filtered;
    }, [templates, searchQuery, viewFilter]);

    return (
        <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <Layout className="w-5 h-5 text-primary-creative" />
                        Select Template
                    </h2>
                    <p className="text-sm text-gray-500">Choose a design to start your campaign</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search templates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-creative/20 focus:border-primary-creative w-full sm:w-64 transition-all"
                        />
                         {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Filters */}
             <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                    onClick={() => setViewFilter('all')}
                    className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                        viewFilter === 'all' 
                            ? "bg-primary-creative text-white shadow-md shadow-primary-creative/25" 
                            : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-100"
                    )}
                >
                    All Templates
                </button>
                <button
                    onClick={() => setViewFilter('featured')}
                    className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2",
                        viewFilter === 'featured' 
                            ? "bg-amber-100 text-amber-700 border border-amber-200" 
                            : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-100"
                    )}
                >
                    <Star className="w-3.5 h-3.5 fill-current" />
                    Featured
                </button>
            </div>

            {/* Template Grid */}
            {isLoading ? (
                // Loading skeleton
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="bg-white border border-gray-100 rounded-2xl overflow-hidden animate-pulse shadow-sm">
                            <div className="aspect-[2/3] bg-gray-100" />
                            <div className="p-4 space-y-3">
                                <div className="h-4 bg-gray-100 rounded w-3/4" />
                                <div className="h-3 bg-gray-100 rounded w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : error ? (
                // Error state
                <div className="text-center py-16 bg-red-50/50 rounded-2xl border border-red-100">
                    <p className="text-red-500 mb-4 font-medium">{error}</p>
                    <button
                        onClick={fetchTemplates}
                        className="px-6 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all flex items-center gap-2 mx-auto"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Try Again
                    </button>
                </div>
            ) : sortedTemplates.length === 0 ? (
                // Empty state
                <div className="text-center py-16 bg-gray-50/50 rounded-2xl border border-gray-100 border-dashed">
                    <p className="text-gray-500 mb-4">No templates found matching your criteria.</p>
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setViewFilter('all');
                        }}
                        className="text-primary-creative font-medium hover:underline"
                    >
                        Clear all filters
                    </button>
                </div>
            ) : (
                // Template grid
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {sortedTemplates.map(template => (
                        <SelectableTemplateCard
                            key={template.id}
                            template={template}
                            isSelected={selectedTemplate?.id === template.id}
                            onSelect={handleSelect}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
