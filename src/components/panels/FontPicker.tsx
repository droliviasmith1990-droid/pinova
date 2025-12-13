'use client';

import React, { useState, useEffect } from 'react';
import { GOOGLE_FONTS, loadFonts } from '@/lib/fonts';
import { Search, Type, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FontPickerProps {
    currentFont: string;
    onFontChange: (font: string) => void;
}

export function FontPicker({ currentFont, onFontChange }: FontPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set(['Inter']));

    // Group fonts by category
    const filteredFonts = GOOGLE_FONTS.filter(font =>
        font.name.toLowerCase().includes(search.toLowerCase())
    );

    const categories = Array.from(new Set(filteredFonts.map(f => f.category)));

    // Load fonts when popover opens or search changes
    useEffect(() => {
        if (isOpen) {
            // Load visible fonts (top 10 matches to save bandwidth)
            const fontsToLoad = filteredFonts.slice(0, 10).map(f => f.name);
            loadFonts(fontsToLoad);

            // Allow time for fonts to load before preview update
            const timer = setTimeout(() => {
                setLoadedFonts(prev => {
                    const next = new Set(prev);
                    fontsToLoad.forEach(f => next.add(f));
                    return next;
                });
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [isOpen, search]);

    // Load current font on mount
    useEffect(() => {
        loadFonts([currentFont]);
    }, [currentFont]);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="h-8 w-40 px-2 flex items-center justify-between border border-gray-300 rounded text-sm hover:bg-gray-50 bg-white"
            >
                <span className="truncate" style={{ fontFamily: currentFont }}>{currentFont}</span>
                <Type className="w-3 h-3 text-gray-400" />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 mt-1 w-60 max-h-96 bg-white rounded-lg shadow-xl border border-gray-200 z-20 flex flex-col font-sans">
                        <div className="p-2 border-b border-gray-100">
                            <div className="relative">
                                <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2" />
                                <input
                                    type="text"
                                    placeholder="Search fonts..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full h-8 pl-8 pr-2 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto overflow-x-hidden p-1">
                            {categories.map(category => {
                                const categoryFonts = filteredFonts.filter(f => f.category === category);
                                if (categoryFonts.length === 0) return null;

                                return (
                                    <div key={category} className="mb-2">
                                        <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                            {category}
                                        </div>
                                        {categoryFonts.map(font => (
                                            <button
                                                key={font.name}
                                                onClick={() => {
                                                    onFontChange(font.name);
                                                    setIsOpen(false);
                                                }}
                                                className={cn(
                                                    "w-full text-left px-3 py-2 rounded flex items-center justify-between hover:bg-blue-50 transition-colors",
                                                    currentFont === font.name && "bg-blue-50 text-blue-600"
                                                )}
                                                onMouseEnter={() => loadFonts([font.name])}
                                            >
                                                <span
                                                    className="text-base truncate"
                                                    style={{ fontFamily: font.name }}
                                                >
                                                    {font.name}
                                                </span>
                                                {currentFont === font.name && (
                                                    <Check className="w-4 h-4" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                );
                            })}

                            {filteredFonts.length === 0 && (
                                <div className="p-4 text-center text-sm text-gray-400">
                                    No fonts found
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
