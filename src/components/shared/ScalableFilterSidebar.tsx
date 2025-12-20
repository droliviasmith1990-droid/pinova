'use client';

import React, { useEffect, useMemo } from 'react';
import { 
    Filter, 
    Folder, 
    Tag, 
    Star, 
    ImageIcon, 
    Type, 
    Minus, 
    Plus, 
    X,
    ChevronDown,
    ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCategoryStore } from '@/stores/categoryStore';
import { useTagStore } from '@/stores/tagStore';
import { SearchableSelect, SelectOption } from '@/components/ui/SearchableSelect';
import { SearchableMultiSelect, MultiSelectOption } from '@/components/ui/SearchableMultiSelect';

export type FilterLogic = 'exactly' | 'at_least' | 'at_most';

export interface DynamicDataFilter {
    images?: number;
    texts?: number;
    logic: FilterLogic;
}

interface ScalableFilterSidebarProps {
    // Visibility
    isOpen: boolean;
    onToggle?: () => void;
    // Category filter
    selectedCategoryId: string | null;
    onCategoryChange: (id: string | null) => void;
    // Tags filter
    selectedTagIds: string[];
    onTagsChange: (ids: string[]) => void;
    // Featured filter
    isFeatured: boolean;
    onFeaturedChange: (featured: boolean) => void;
    // Dynamic data filter
    dynamicDataFilter: DynamicDataFilter | null;
    onDynamicDataFilterChange: (filter: DynamicDataFilter | null) => void;
    // Actions
    onClearAll: () => void;
    // Style
    className?: string;
    // Collapsible sections
    showDynamicData?: boolean;
}

// Collapsible section component
function FilterSection({ 
    title, 
    icon: Icon, 
    children, 
    defaultOpen = true,
    badge
}: { 
    title: string; 
    icon: React.ElementType;
    children: React.ReactNode;
    defaultOpen?: boolean;
    badge?: React.ReactNode;
}) {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);

    return (
        <div className="border-b border-gray-100 last:border-0">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between py-3 text-left hover:bg-gray-50 transition-colors px-1 -mx-1 rounded"
            >
                <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Icon className="w-4 h-4 text-gray-500" />
                    {title}
                    {badge}
                </span>
                {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
            </button>
            {isOpen && (
                <div className="pb-4 animate-in slide-in-from-top-1 duration-150">
                    {children}
                </div>
            )}
        </div>
    );
}

export function ScalableFilterSidebar({
    isOpen,
    onToggle,
    selectedCategoryId,
    onCategoryChange,
    selectedTagIds,
    onTagsChange,
    isFeatured,
    onFeaturedChange,
    dynamicDataFilter,
    onDynamicDataFilterChange,
    onClearAll,
    className,
    showDynamicData = true,
}: ScalableFilterSidebarProps) {
    // Stores
    const { categories, fetchCategories, isLoading: loadingCategories } = useCategoryStore();
    const { tags, fetchTags, isLoading: loadingTags } = useTagStore();
    
    // Fetch categories and tags on mount
    useEffect(() => {
        fetchCategories(true);
        fetchTags(true);
    }, [fetchCategories, fetchTags]);

    // Convert categories to SelectOption format
    const categoryOptions: SelectOption[] = useMemo(() => {
        const allOption: SelectOption = {
            value: '__all__',
            label: 'All Categories',
            icon: <Folder className="w-4 h-4 text-gray-400" />,
        };
        
        const catOptions = categories.map(cat => ({
            value: cat.id,
            label: cat.name,
            icon: cat.icon ? <span>{cat.icon}</span> : <Folder className="w-4 h-4 text-gray-400" />,
            count: cat.template_count ?? undefined,
        }));

        return [allOption, ...catOptions];
    }, [categories]);

    // Convert tags to MultiSelectOption format
    const tagOptions: MultiSelectOption[] = useMemo(() => {
        return tags.map(tag => ({
            value: tag.id,
            label: tag.name,
        }));
    }, [tags]);

    // Handle category change (convert __all__ to null)
    const handleCategoryChange = (value: string | null) => {
        onCategoryChange(value === '__all__' ? null : value);
    };

    // Handle dynamic data filter changes
    const updateDynamicFilter = (
        field: 'images' | 'texts' | 'logic',
        value: number | FilterLogic
    ) => {
        const current = dynamicDataFilter || { logic: 'exactly' as FilterLogic };
        
        if (field === 'logic') {
            onDynamicDataFilterChange({
                ...current,
                logic: value as FilterLogic,
            });
        } else {
            const numValue = value as number;
            const newFilter = { ...current };
            
            if (numValue >= 0) {
                newFilter[field] = numValue;
            } else {
                delete newFilter[field];
            }
            
            // If no filters set, clear
            if (newFilter.images === undefined && newFilter.texts === undefined) {
                onDynamicDataFilterChange(null);
            } else {
                onDynamicDataFilterChange(newFilter);
            }
        }
    };

    // Count active filters
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (selectedCategoryId) count++;
        if (selectedTagIds.length > 0) count++;
        if (isFeatured) count++;
        if (dynamicDataFilter) count++;
        return count;
    }, [selectedCategoryId, selectedTagIds, isFeatured, dynamicDataFilter]);

    // Get active filter pills data
    const activeFilters = useMemo(() => {
        const filters: { key: string; label: string; onRemove: () => void }[] = [];

        if (selectedCategoryId) {
            const cat = categories.find(c => c.id === selectedCategoryId);
            filters.push({
                key: 'category',
                label: cat?.name || 'Category',
                onRemove: () => onCategoryChange(null),
            });
        }

        selectedTagIds.forEach(tagId => {
            const tag = tags.find(t => t.id === tagId);
            if (tag) {
                filters.push({
                    key: `tag-${tagId}`,
                    label: tag.name,
                    onRemove: () => onTagsChange(selectedTagIds.filter(id => id !== tagId)),
                });
            }
        });

        if (isFeatured) {
            filters.push({
                key: 'featured',
                label: 'Featured',
                onRemove: () => onFeaturedChange(false),
            });
        }

        if (dynamicDataFilter) {
            const parts: string[] = [];
            if (dynamicDataFilter.images !== undefined) {
                parts.push(`${dynamicDataFilter.images} images`);
            }
            if (dynamicDataFilter.texts !== undefined) {
                parts.push(`${dynamicDataFilter.texts} texts`);
            }
            if (parts.length > 0) {
                filters.push({
                    key: 'dynamic',
                    label: parts.join(', '),
                    onRemove: () => onDynamicDataFilterChange(null),
                });
            }
        }

        return filters;
    }, [categories, tags, selectedCategoryId, selectedTagIds, isFeatured, dynamicDataFilter, onCategoryChange, onTagsChange, onFeaturedChange, onDynamicDataFilterChange]);

    if (!isOpen) return null;

    return (
        <div className={cn(
            "w-72 shrink-0 bg-white border border-gray-200 rounded-xl p-4 space-y-2",
            "animate-in slide-in-from-left-2 duration-200",
            className
        )}>
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filters
                    {activeFilterCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                            {activeFilterCount}
                        </span>
                    )}
                </h3>
                {activeFilterCount > 0 && (
                    <button
                        onClick={onClearAll}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                        Clear all
                    </button>
                )}
            </div>

            {/* Active Filter Pills */}
            {activeFilters.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pb-2 border-b border-gray-100">
                    {activeFilters.map(filter => (
                        <span
                            key={filter.key}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md"
                        >
                            {filter.label}
                            <button
                                onClick={filter.onRemove}
                                className="hover:bg-blue-100 rounded-full p-0.5"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* Category Filter */}
            <FilterSection title="Category" icon={Folder}>
                {loadingCategories ? (
                    <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                ) : (
                    <SearchableSelect
                        options={categoryOptions}
                        value={selectedCategoryId || '__all__'}
                        onChange={handleCategoryChange}
                        placeholder="Select category"
                        searchPlaceholder="Search categories..."
                        allowClear={false}
                    />
                )}
            </FilterSection>

            {/* Tags Filter */}
            <FilterSection 
                title="Tags" 
                icon={Tag}
                badge={selectedTagIds.length > 0 ? (
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {selectedTagIds.length}
                    </span>
                ) : undefined}
            >
                {loadingTags ? (
                    <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                ) : tagOptions.length === 0 ? (
                    <p className="text-sm text-gray-500">No tags available</p>
                ) : (
                    <SearchableMultiSelect
                        options={tagOptions}
                        values={selectedTagIds}
                        onChange={onTagsChange}
                        placeholder="Select tags..."
                        searchPlaceholder="Search tags..."
                    />
                )}
            </FilterSection>

            {/* Dynamic Data Filter */}
            {showDynamicData && (
                <FilterSection title="Dynamic Data" icon={ImageIcon} defaultOpen={!!dynamicDataFilter}>
                    <div className="space-y-3">
                        {/* Images */}
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-1 text-xs text-gray-600">
                                <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                                Images
                            </label>
                            <div className="flex items-center">
                                <button
                                    type="button"
                                    onClick={() => updateDynamicFilter('images', (dynamicDataFilter?.images ?? 0) - 1)}
                                    disabled={(dynamicDataFilter?.images ?? 0) <= 0}
                                    className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-l-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Minus className="w-3.5 h-3.5" />
                                </button>
                                <input
                                    type="number"
                                    min="0"
                                    value={dynamicDataFilter?.images ?? ''}
                                    onChange={(e) => updateDynamicFilter('images', parseInt(e.target.value) || -1)}
                                    placeholder="-"
                                    className="w-12 h-8 text-center border-y border-gray-200 text-sm focus:outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => updateDynamicFilter('images', (dynamicDataFilter?.images ?? -1) + 1)}
                                    className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-r-lg transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                        
                        {/* Texts */}
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-1 text-xs text-gray-600">
                                <Type className="w-3.5 h-3.5 text-gray-500" />
                                Texts
                            </label>
                            <div className="flex items-center">
                                <button
                                    type="button"
                                    onClick={() => updateDynamicFilter('texts', (dynamicDataFilter?.texts ?? 0) - 1)}
                                    disabled={(dynamicDataFilter?.texts ?? 0) <= 0}
                                    className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-l-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Minus className="w-3.5 h-3.5" />
                                </button>
                                <input
                                    type="number"
                                    min="0"
                                    value={dynamicDataFilter?.texts ?? ''}
                                    onChange={(e) => updateDynamicFilter('texts', parseInt(e.target.value) || -1)}
                                    placeholder="-"
                                    className="w-12 h-8 text-center border-y border-gray-200 text-sm focus:outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => updateDynamicFilter('texts', (dynamicDataFilter?.texts ?? -1) + 1)}
                                    className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-r-lg transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                        
                        {/* Logic Selector */}
                        {dynamicDataFilter && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Match:</span>
                                <select
                                    value={dynamicDataFilter.logic}
                                    onChange={(e) => updateDynamicFilter('logic', e.target.value as FilterLogic)}
                                    className="text-xs bg-white border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="exactly">Exactly</option>
                                    <option value="at_least">At least</option>
                                    <option value="at_most">At most</option>
                                </select>
                            </div>
                        )}
                    </div>
                </FilterSection>
            )}

            {/* Featured Filter */}
            <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer group px-1 py-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <input
                        type="checkbox"
                        checked={isFeatured}
                        onChange={(e) => onFeaturedChange(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700 group-hover:text-gray-900">
                        <Star className="w-4 h-4 text-amber-500" />
                        Featured Only
                    </span>
                </label>
            </div>
        </div>
    );
}
