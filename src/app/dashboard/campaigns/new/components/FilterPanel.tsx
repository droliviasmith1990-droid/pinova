'use client';

import React, { useEffect } from 'react';
import { Folder, Tag, Star, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCategoryStore } from '@/stores/categoryStore';
import { useTagStore } from '@/stores/tagStore';

interface FilterPanelProps {
    isOpen: boolean;
    // Filter values
    selectedCategoryId: string | null;
    onCategoryChange: (id: string | null) => void;
    selectedTagIds: string[];
    onTagsChange: (ids: string[]) => void;
    isFeatured: boolean;
    onFeaturedChange: (featured: boolean) => void;
    onClearAll: () => void;
}

export function FilterPanel({
    isOpen,
    selectedCategoryId,
    onCategoryChange,
    selectedTagIds,
    onTagsChange,
    isFeatured,
    onFeaturedChange,
    onClearAll,
}: FilterPanelProps) {
    // Stores
    const { categories, fetchCategories, isLoading: loadingCategories } = useCategoryStore();
    const { tags, fetchTags, isLoading: loadingTags } = useTagStore();
    
    // Fetch categories and tags on mount
    useEffect(() => {
        fetchCategories(true); // with counts
        fetchTags(true); // with counts
    }, [fetchCategories, fetchTags]);
    
    // Toggle tag selection
    const toggleTag = (tagId: string) => {
        if (selectedTagIds.includes(tagId)) {
            onTagsChange(selectedTagIds.filter(id => id !== tagId));
        } else {
            onTagsChange([...selectedTagIds, tagId]);
        }
    };
    
    if (!isOpen) return null;
    
    const hasActiveFilters = selectedCategoryId || selectedTagIds.length > 0 || isFeatured;

    return (
        <div className="bg-surface-light border border-white/20 rounded-2xl p-5 space-y-6 shadow-creative-sm animate-in slide-in-from-top-2 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                <h3 className="font-heading font-semibold text-gray-900">Filter Templates</h3>
                {hasActiveFilters && (
                    <button
                        onClick={onClearAll}
                        className="text-xs text-primary-creative hover:text-primary-creative/80 font-bold uppercase tracking-wide transition-colors"
                    >
                        Clear all
                    </button>
                )}
            </div>
            
            {/* Category Filter */}
            <div className="space-y-3">
                <h4 className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <Folder className="w-3 h-3" />
                    Category
                </h4>
                <div className="flex flex-wrap gap-2">
                    {/* All button */}
                    <button
                        onClick={() => onCategoryChange(null)}
                        className={cn(
                            "px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                            selectedCategoryId === null
                                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                                : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:shadow-sm"
                        )}
                    >
                        <span className="flex items-center gap-1.5">
                            <Folder className="w-3.5 h-3.5" />
                            All
                        </span>
                    </button>
                    
                    {loadingCategories ? (
                        <div className="flex gap-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-20 h-8 bg-gray-100 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        categories.map(category => (
                            <button
                                key={category.id}
                                onClick={() => onCategoryChange(category.id)}
                                className={cn(
                                    "px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                                    selectedCategoryId === category.id
                                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                                        : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:shadow-sm"
                                )}
                            >
                                <span className="flex items-center gap-1.5">
                                    {category.icon && <span>{category.icon}</span>}
                                    {category.name}
                                    {(category.template_count ?? 0) > 0 && (
                                        <span className={cn(
                                            "text-xs ml-0.5",
                                            selectedCategoryId === category.id 
                                                ? "text-blue-100/80" 
                                                : "text-gray-400"
                                        )}>
                                            {category.template_count}
                                        </span>
                                    )}
                                </span>
                            </button>
                        ))
                    )}
                </div>
            </div>
            
            {/* Tags Filter */}
            <div className="space-y-3">
                <h4 className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <Tag className="w-3 h-3" />
                    Tags
                    {selectedTagIds.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full">
                            {selectedTagIds.length}
                        </span>
                    )}
                </h4>
                
                {/* Selected tags */}
                {selectedTagIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 pb-1">
                        {tags
                            .filter(tag => selectedTagIds.includes(tag.id))
                            .map(tag => (
                                <button
                                    key={tag.id}
                                    onClick={() => toggleTag(tag.id)}
                                    className="flex items-center gap-1.5 px-3 py-1 bg-blue-600/10 border border-blue-200 text-blue-700 rounded-full text-xs font-semibold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all group"
                                >
                                    <Check className="w-3 h-3 group-hover:hidden" />
                                    <X className="w-3 h-3 hidden group-hover:block" />
                                    {tag.name}
                                </button>
                            ))
                        }
                    </div>
                )}
                
                {/* Available tags */}
                <div className="flex flex-wrap gap-2">
                    {loadingTags ? (
                        <div className="flex gap-2">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="w-16 h-8 bg-gray-100 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : tags.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">No tags available</p>
                    ) : (
                        tags
                            .filter(tag => !selectedTagIds.includes(tag.id))
                            .map(tag => (
                                <button
                                    key={tag.id}
                                    onClick={() => toggleTag(tag.id)}
                                    className="px-2.5 py-1 bg-white border border-gray-200 text-gray-600 rounded-full text-xs font-medium hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 transition-all"
                                >
                                    {tag.name}
                                    {(tag.template_count ?? 0) > 0 && (
                                        <span className="ml-1 text-gray-400 text-[10px]">
                                            {tag.template_count}
                                        </span>
                                    )}
                                </button>
                            ))
                    )}
                </div>
            </div>
            
            {/* Featured Filter */}
            <div className="pt-4 border-t border-gray-100/50">
                <label className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-amber-50/50 rounded-lg transition-colors">
                    <div className="relative flex items-center">
                        <input
                            type="checkbox"
                            checked={isFeatured}
                            onChange={(e) => onFeaturedChange(e.target.checked)}
                            className="peer sr-only"
                        />
                         <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-400"></div>
                    </div>
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 group-hover:text-amber-700 transition-colors">
                        <Star className={cn(
                            "w-4 h-4 transition-colors",
                            isFeatured ? "fill-amber-400 text-amber-400" : "text-gray-400 group-hover:text-amber-400"
                        )} />
                        Show Featured Only
                    </span>
                </label>
            </div>
        </div>
    );
}
