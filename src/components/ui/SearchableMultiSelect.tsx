'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MultiSelectOption {
    value: string;
    label: string;
    color?: string;
}

interface SearchableMultiSelectProps {
    options: MultiSelectOption[];
    values: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    className?: string;
    disabled?: boolean;
    maxDisplayed?: number;
}

export function SearchableMultiSelect({
    options,
    values,
    onChange,
    placeholder = 'Select tags...',
    searchPlaceholder = 'Search tags...',
    emptyMessage = 'No tags found',
    className,
    disabled = false,
    maxDisplayed = 3,
}: SearchableMultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    // Filter options based on search query
    const filteredOptions = useMemo(() => {
        if (!searchQuery.trim()) return options;
        const query = searchQuery.toLowerCase();
        return options.filter(opt => 
            opt.label.toLowerCase().includes(query)
        );
    }, [options, searchQuery]);

    // Get selected options
    const selectedOptions = options.filter(opt => values.includes(opt.value));

    const handleToggle = (optionValue: string) => {
        if (values.includes(optionValue)) {
            onChange(values.filter(v => v !== optionValue));
        } else {
            onChange([...values, optionValue]);
        }
    };

    const handleClearAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange([]);
    };

    const handleRemoveTag = (e: React.MouseEvent, value: string) => {
        e.stopPropagation();
        onChange(values.filter(v => v !== value));
    };

    return (
        <div ref={containerRef} className={cn("relative", className)}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={cn(
                    "w-full flex items-center justify-between gap-2 px-3 py-2 min-h-[38px]",
                    "bg-white border border-gray-300 rounded-lg text-sm",
                    "hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                    "transition-colors",
                    disabled && "opacity-50 cursor-not-allowed",
                    isOpen && "border-blue-500 ring-2 ring-blue-500/20"
                )}
            >
                <div className="flex-1 flex items-center gap-1 flex-wrap overflow-hidden">
                    {selectedOptions.length === 0 ? (
                        <span className="text-gray-500">{placeholder}</span>
                    ) : (
                        <>
                            {selectedOptions.slice(0, maxDisplayed).map(opt => (
                                <span
                                    key={opt.value}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-md"
                                >
                                    {opt.label}
                                    <button
                                        type="button"
                                        onClick={(e) => handleRemoveTag(e, opt.value)}
                                        className="hover:bg-blue-200 rounded-full p-0.5"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                            {selectedOptions.length > maxDisplayed && (
                                <span className="text-xs text-gray-500">
                                    +{selectedOptions.length - maxDisplayed} more
                                </span>
                            )}
                        </>
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {selectedOptions.length > 0 && (
                        <button
                            type="button"
                            onClick={handleClearAll}
                            className="p-0.5 hover:bg-gray-100 rounded"
                        >
                            <X className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                    )}
                    <ChevronDown className={cn(
                        "w-4 h-4 text-gray-400 transition-transform",
                        isOpen && "rotate-180"
                    )} />
                </div>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    {/* Search Input */}
                    <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Selected count */}
                    {values.length > 0 && (
                        <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                                {values.length} selected
                            </span>
                            <button
                                type="button"
                                onClick={() => onChange([])}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Clear all
                            </button>
                        </div>
                    )}

                    {/* Options List */}
                    <div className="max-h-60 overflow-y-auto">
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-4 text-center text-sm text-gray-500">
                                {emptyMessage}
                            </div>
                        ) : (
                            <div className="py-1">
                                {filteredOptions.map((option) => {
                                    const isSelected = values.includes(option.value);
                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => handleToggle(option.value)}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-3 py-2 text-sm",
                                                "hover:bg-gray-50 transition-colors",
                                                isSelected && "bg-blue-50"
                                            )}
                                        >
                                            {/* Checkbox */}
                                            <div className={cn(
                                                "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                                                isSelected 
                                                    ? "bg-blue-600 border-blue-600" 
                                                    : "border-gray-300 bg-white"
                                            )}>
                                                {isSelected && (
                                                    <Check className="w-3 h-3 text-white" />
                                                )}
                                            </div>
                                            
                                            {/* Label */}
                                            <span className={cn(
                                                "truncate",
                                                isSelected && "text-blue-700 font-medium"
                                            )}>
                                                {option.label}
                                            </span>

                                            {/* Color indicator */}
                                            {option.color && (
                                                <span 
                                                    className="w-3 h-3 rounded-full shrink-0 ml-auto"
                                                    style={{ backgroundColor: option.color }}
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
