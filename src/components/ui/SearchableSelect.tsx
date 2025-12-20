'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
    value: string;
    label: string;
    icon?: React.ReactNode;
    count?: number;
}

interface SearchableSelectProps {
    options: SelectOption[];
    value: string | null;
    onChange: (value: string | null) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    allowClear?: boolean;
    emptyMessage?: string;
    className?: string;
    disabled?: boolean;
}

export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = 'Select...',
    searchPlaceholder = 'Search...',
    allowClear = true,
    emptyMessage = 'No options found',
    className,
    disabled = false,
}: SearchableSelectProps) {
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

    // Get selected option
    const selectedOption = options.find(opt => opt.value === value);

    const handleSelect = (optionValue: string | null) => {
        onChange(optionValue);
        setIsOpen(false);
        setSearchQuery('');
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(null);
    };

    return (
        <div ref={containerRef} className={cn("relative", className)}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={cn(
                    "w-full flex items-center justify-between gap-2 px-3 py-2",
                    "bg-white border border-gray-300 rounded-lg text-sm",
                    "hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                    "transition-colors",
                    disabled && "opacity-50 cursor-not-allowed",
                    isOpen && "border-blue-500 ring-2 ring-blue-500/20"
                )}
            >
                <span className={cn(
                    "flex items-center gap-2 truncate",
                    !selectedOption && "text-gray-500"
                )}>
                    {selectedOption ? (
                        <>
                            {selectedOption.icon}
                            <span className="truncate">{selectedOption.label}</span>
                            {selectedOption.count !== undefined && (
                                <span className="text-gray-400 text-xs">({selectedOption.count})</span>
                            )}
                        </>
                    ) : (
                        placeholder
                    )}
                </span>
                <div className="flex items-center gap-1">
                    {allowClear && selectedOption && (
                        <button
                            type="button"
                            onClick={handleClear}
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

                    {/* Options List */}
                    <div className="max-h-60 overflow-y-auto">
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-4 text-center text-sm text-gray-500">
                                {emptyMessage}
                            </div>
                        ) : (
                            <div className="py-1">
                                {filteredOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => handleSelect(option.value)}
                                        className={cn(
                                            "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm",
                                            "hover:bg-gray-50 transition-colors",
                                            option.value === value && "bg-blue-50 text-blue-700"
                                        )}
                                    >
                                        <span className="flex items-center gap-2 truncate">
                                            {option.icon}
                                            <span className="truncate">{option.label}</span>
                                            {option.count !== undefined && (
                                                <span className={cn(
                                                    "text-xs",
                                                    option.value === value ? "text-blue-400" : "text-gray-400"
                                                )}>
                                                    ({option.count})
                                                </span>
                                            )}
                                        </span>
                                        {option.value === value && (
                                            <Check className="w-4 h-4 text-blue-600 shrink-0" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
