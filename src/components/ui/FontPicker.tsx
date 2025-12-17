'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, Search, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    GOOGLE_FONTS,
    SYSTEM_FONTS,
    loadGoogleFont,
    isGoogleFontLoaded,
    GoogleFont,
} from '@/lib/fonts/googleFonts';

interface FontPickerProps {
    value: string;
    onChange: (fontFamily: string, provider: 'system' | 'google' | 'custom') => void;
    className?: string;
}

/**
 * FontPicker - Searchable dropdown for selecting fonts
 * 
 * Features:
 * - Search/filter capability
 * - Font preview in dropdown items
 * - Groups: Google Fonts, System Fonts
 * - Loading state when font is being loaded
 * - Keyboard navigation
 */
export function FontPicker({ value, onChange, className }: FontPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [loadingFont, setLoadingFont] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Filter fonts based on search
    const filteredGoogleFonts = useMemo(() => {
        if (!search.trim()) return GOOGLE_FONTS;
        const query = search.toLowerCase();
        return GOOGLE_FONTS.filter(f => f.family.toLowerCase().includes(query));
    }, [search]);

    const filteredSystemFonts = useMemo(() => {
        if (!search.trim()) return SYSTEM_FONTS;
        const query = search.toLowerCase();
        return SYSTEM_FONTS.filter(f => f.family.toLowerCase().includes(query));
    }, [search]);

    // Handle font selection
    const handleSelect = useCallback(async (font: GoogleFont, isSystem: boolean) => {
        const provider = isSystem ? 'system' : 'google';
        
        // Load Google Font if not already loaded
        if (!isSystem && !isGoogleFontLoaded(font.family)) {
            setLoadingFont(font.family);
            try {
                await loadGoogleFont(font.family);
            } catch (error) {
                console.error('Failed to load font:', error);
            }
            setLoadingFont(null);
        }

        onChange(font.family, provider);
        setIsOpen(false);
        setSearch('');
    }, [onChange]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            // Focus search input when opening
            setTimeout(() => searchInputRef.current?.focus(), 0);
        }

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
        }
    }, []);

    // Load current font if it's a Google Font
    useEffect(() => {
        if (value && GOOGLE_FONTS.some(f => f.family === value) && !isGoogleFontLoaded(value)) {
            loadGoogleFont(value).catch(console.error);
        }
    }, [value]);

    return (
        <div className={cn("relative", className)} ref={dropdownRef} onKeyDown={handleKeyDown}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label="Select font family"
                className={cn(
                    "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border transition-all duration-150",
                    "text-sm text-left bg-white",
                    isOpen
                        ? "border-blue-500 ring-2 ring-blue-100"
                        : "border-gray-200 hover:border-gray-300"
                )}
            >
                <span style={{ fontFamily: value }} className="truncate">
                    {value || 'Select font...'}
                </span>
                <ChevronDown className={cn(
                    "w-4 h-4 text-gray-400 transition-transform",
                    isOpen && "rotate-180"
                )} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-hidden">
                    {/* Search Input */}
                    <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search fonts..."
                                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
                                aria-label="Search fonts"
                            />
                        </div>
                    </div>

                    {/* Font List */}
                    <div className="overflow-y-auto max-h-60" role="listbox">
                        {/* Google Fonts */}
                        {filteredGoogleFonts.length > 0 && (
                            <div>
                                <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">
                                    Google Fonts
                                </div>
                                {filteredGoogleFonts.map((font) => (
                                    <FontOption
                                        key={font.family}
                                        font={font}
                                        isSelected={value === font.family}
                                        isLoading={loadingFont === font.family}
                                        onClick={() => handleSelect(font, false)}
                                    />
                                ))}
                            </div>
                        )}

                        {/* System Fonts */}
                        {filteredSystemFonts.length > 0 && (
                            <div>
                                <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">
                                    System Fonts
                                </div>
                                {filteredSystemFonts.map((font) => (
                                    <FontOption
                                        key={font.family}
                                        font={font}
                                        isSelected={value === font.family}
                                        isLoading={false}
                                        onClick={() => handleSelect(font, true)}
                                    />
                                ))}
                            </div>
                        )}

                        {/* No results */}
                        {filteredGoogleFonts.length === 0 && filteredSystemFonts.length === 0 && (
                            <div className="px-3 py-4 text-sm text-gray-500 text-center">
                                No fonts found for &ldquo;{search}&rdquo;
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

/** Individual font option in dropdown */
function FontOption({
    font,
    isSelected,
    isLoading,
    onClick,
}: {
    font: GoogleFont;
    isSelected: boolean;
    isLoading: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            role="option"
            aria-selected={isSelected}
            className={cn(
                "w-full flex items-center justify-between px-3 py-2 text-left transition-colors",
                isSelected
                    ? "bg-blue-50 text-blue-700"
                    : "hover:bg-gray-50 text-gray-700"
            )}
        >
            <span
                style={{ fontFamily: font.family }}
                className="text-sm truncate"
            >
                {font.family}
            </span>
            {isLoading ? (
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            ) : isSelected ? (
                <Check className="w-4 h-4 text-blue-500" />
            ) : null}
        </button>
    );
}
