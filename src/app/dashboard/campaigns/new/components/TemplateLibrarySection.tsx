'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    Search, 
    Star, 
    RefreshCw,
    Layout,
    X,
    Filter,
    PanelLeftClose,
    PanelLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TemplateListItem, getTemplatesWithElements, TemplateWithElements } from '@/lib/db/templates';
import { CompactTemplateCard } from '@/components/campaign/CompactTemplateCard';
import { ScalableFilterSidebar } from '@/components/shared/ScalableFilterSidebar';
import { useCampaignWizard } from '@/lib/campaigns/CampaignWizardContext';
import { extractDynamicData, DynamicDataSummary, DynamicDataFilter, matchesDynamicDataFilter } from '@/lib/utils/extractDynamicData';

interface TemplateLibrarySectionProps {
    onTemplateSelect?: () => void;
}

export function TemplateLibrarySection({ onTemplateSelect }: TemplateLibrarySectionProps) {
    const { selectedTemplate, setSelectedTemplate } = useCampaignWizard();
    
    // Data state
    const [templates, setTemplates] = useState<TemplateWithElements[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Filter state
    const [showFilters, setShowFilters] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    const [isFeatured, setIsFeatured] = useState(false);
    const [dynamicDataFilter, setDynamicDataFilter] = useState<DynamicDataFilter | null>(null);

    // Debounced search
    const [debouncedSearch, setDebouncedSearch] = useState('');
    
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch templates - optimized single query
    const fetchTemplates = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Use optimized function that fetches elements in one query
            const data = await getTemplatesWithElements({
                categoryId: selectedCategoryId || undefined,
                tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
                isFeatured: isFeatured || undefined,
                search: debouncedSearch || undefined,
            });
            
            setTemplates(data);
        } catch (err) {
            console.error('Failed to load templates:', err);
            setError('Failed to load templates. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [selectedCategoryId, selectedTagIds, isFeatured, debouncedSearch]);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    // Memoized dynamic data map - computed once from templates
    const dynamicDataMap = useMemo(() => {
        const map = new Map<string, DynamicDataSummary>();
        for (const template of templates) {
            const summary = extractDynamicData(template.elements || []);
            map.set(template.id, summary);
        }
        return map;
    }, [templates]);

    const handleSelect = useCallback((template: TemplateListItem) => {
        // Toggle selection - if already selected, deselect
        if (selectedTemplate?.id === template.id) {
            setSelectedTemplate(null);
        } else {
            setSelectedTemplate(template);
            onTemplateSelect?.();
        }
    }, [selectedTemplate, setSelectedTemplate, onTemplateSelect]);

    // Apply client-side dynamic data filter (can't do this server-side easily)
    const filteredTemplates = useMemo(() => {
        if (!dynamicDataFilter) return templates;
        
        return templates.filter(template => {
            const dynamicData = dynamicDataMap.get(template.id);
            if (!dynamicData) return false;
            return matchesDynamicDataFilter(dynamicData, dynamicDataFilter);
        });
    }, [templates, dynamicDataFilter, dynamicDataMap]);

    // Count active filters
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (selectedCategoryId) count++;
        if (selectedTagIds.length > 0) count++;
        if (isFeatured) count++;
        if (dynamicDataFilter) count++;
        return count;
    }, [selectedCategoryId, selectedTagIds, isFeatured, dynamicDataFilter]);

    // Clear all filters
    const clearAllFilters = useCallback(() => {
        setSearchQuery('');
        setSelectedCategoryId(null);
        setSelectedTagIds([]);
        setIsFeatured(false);
        setDynamicDataFilter(null);
    }, []);

    return (
        <section className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <Layout className="w-5 h-5 text-primary-creative" />
                        Select Template
                    </h2>
                    <p className="text-sm text-gray-500">Choose a design to start your campaign</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    {/* Filter Toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                            showFilters
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                        )}
                    >
                        {showFilters ? (
                            <PanelLeftClose className="w-4 h-4" />
                        ) : (
                            <PanelLeft className="w-4 h-4" />
                        )}
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full min-w-[20px] text-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                    
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search templates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-creative/20 focus:border-primary-creative w-full sm:w-56 transition-all"
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
                    
                    {/* Refresh */}
                    <button
                        onClick={fetchTemplates}
                        disabled={isLoading}
                        className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                        title="Refresh templates"
                    >
                        <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                    </button>
                </div>
            </div>

            {/* Main Content: Sidebar + Grid */}
            <div className="flex gap-6">
                {/* Filter Sidebar */}
                <ScalableFilterSidebar
                    isOpen={showFilters}
                    selectedCategoryId={selectedCategoryId}
                    onCategoryChange={setSelectedCategoryId}
                    selectedTagIds={selectedTagIds}
                    onTagsChange={setSelectedTagIds}
                    isFeatured={isFeatured}
                    onFeaturedChange={setIsFeatured}
                    dynamicDataFilter={dynamicDataFilter}
                    onDynamicDataFilterChange={setDynamicDataFilter}
                    onClearAll={clearAllFilters}
                    showDynamicData={true}
                />

                {/* Template Grid */}
                <div className="flex-1 min-w-0">
                    {/* Results count */}
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-gray-500">
                            {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
                            {activeFilterCount > 0 && ' (filtered)'}
                        </p>
                        {selectedTemplate && (
                            <p className="text-sm text-blue-600 font-medium flex items-center gap-1">
                                <Star className="w-4 h-4" />
                                Selected: {selectedTemplate.name}
                            </p>
                        )}
                    </div>

                    {isLoading ? (
                        // Loading skeleton - 5 columns
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                                <div key={i} className="bg-white border border-gray-100 rounded-xl overflow-hidden animate-pulse">
                                    <div className="aspect-2/3 bg-gray-100" />
                                    <div className="p-2.5 space-y-2">
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
                    ) : filteredTemplates.length === 0 ? (
                        // Empty state
                        <div className="text-center py-16 bg-gray-50/50 rounded-2xl border border-gray-100 border-dashed">
                            <Filter className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 mb-4">No templates found matching your criteria.</p>
                            <button
                                onClick={clearAllFilters}
                                className="text-primary-creative font-medium hover:underline"
                            >
                                Clear all filters
                            </button>
                        </div>
                    ) : (
                        // Template grid - 5 columns on large screens
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {filteredTemplates.map(template => (
                                <CompactTemplateCard
                                    key={template.id}
                                    template={template}
                                    dynamicData={dynamicDataMap.get(template.id)}
                                    isSelected={selectedTemplate?.id === template.id}
                                    onSelect={handleSelect}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
