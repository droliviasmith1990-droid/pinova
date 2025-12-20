'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Font, getFonts } from '@/lib/db/fonts';
import { FontUploader } from './components/FontUploader';
import { FontGrid } from './components/FontGrid';

export default function FontsPage() {
    const [fonts, setFonts] = useState<Font[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showUploader, setShowUploader] = useState(false);
    const [activeTab, setActiveTab] = useState<'fonts' | 'templates'>('fonts');

    // Load fonts function
    const loadFonts = useCallback(async () => {
        setLoading(true);
        const data = await getFonts();
        setFonts(data);
        setLoading(false);
    }, []);

    // Load fonts on mount
    useEffect(() => {
        // eslint-disable-next-line react-compiler/react-compiler
        loadFonts();
    }, [loadFonts]);

    // Filter fonts by search
    const filteredFonts = fonts.filter(font =>
        font.family.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Group by category
    const fontsByCategory: Record<string, Font[]> = {
        'SANS SERIF': filteredFonts.filter(f => f.category === 'sans-serif'),
        'SERIF': filteredFonts.filter(f => f.category === 'serif'),
        'DISPLAY': filteredFonts.filter(f => f.category === 'display'),
        'SCRIPT': filteredFonts.filter(f => f.category === 'script'),
    };

    const totalFonts = fonts.length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-heading font-bold text-gray-900">
                            My Fonts
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Upload and manage custom fonts for your designs
                        </p>
                    </div>
                    <button
                        onClick={() => setShowUploader(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:shadow-lg transition-all hover:scale-105 font-medium"
                    >
                        <Plus className="w-5 h-5" />
                        Upload Font
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-8 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('fonts')}
                        className={cn(
                            'flex items-center gap-2 pb-3 border-b-2 transition-all font-medium',
                            activeTab === 'fonts'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        )}
                    >
                        <span className="material-symbols-outlined text-xl">text_fields</span>
                        Fonts
                        {totalFonts > 0 && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                {totalFonts}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('templates')}
                        className={cn(
                            'flex items-center gap-2 pb-3 border-b-2 transition-all font-medium',
                            activeTab === 'templates'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        )}
                    >
                        <span className="material-symbols-outlined text-xl">dashboard</span>
                        Templates
                    </button>
                </div>

                {/* Search Bar */}
                {activeTab === 'fonts' && (
                    <>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search fonts..."
                                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                        </div>

                        {/* Upload Font Button (alternate position) */}
                        <button
                            onClick={() => setShowUploader(true)}
                            className="w-full flex items-center justify-center gap-3 py-4 bg-white border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
                        >
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                <Plus className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                            </div>
                            <span className="text-gray-700 font-medium group-hover:text-blue-600">
                                Upload Font (TTF/OTF/WOFF)
                            </span>
                        </button>

                        {/* Loading State */}
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                                <p className="text-sm text-gray-500">Loading fonts...</p>
                            </div>
                        ) : filteredFonts.length === 0 ? (
                            <div className="text-center py-20">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="material-symbols-outlined text-4xl text-gray-400">
                                        text_fields
                                    </span>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    {searchQuery ? 'No fonts found' : 'No custom fonts yet'}
                                </h3>
                                <p className="text-sm text-gray-500 mb-6">
                                    {searchQuery
                                        ? 'Try a different search term'
                                        : 'Upload your first custom font to get started'}
                                </p>
                            </div>
                        ) : (
                            /* Font Grid by Category */
                            <div className="space-y-8">
                                {Object.entries(fontsByCategory).map(([category, categoryFonts]) => 
                                    categoryFonts.length > 0 ? (
                                        <div key={category}>
                                            <div className="flex items-center justify-between mb-4">
                                                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                                    {category}
                                                </h2>
                                                <span className="text-xs text-gray-500">
                                                    {categoryFonts.length}
                                                </span>
                                            </div>
                                            <FontGrid 
                                                fonts={categoryFonts} 
                                                onFontDeleted={loadFonts}
                                            />
                                        </div>
                                    ) : null
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* Templates Tab (Placeholder) */}
                {activeTab === 'templates' && (
                    <div className="text-center py-20">
                        <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">
                            dashboard
                        </span>
                        <h3 className="text-lg font-semibold text-gray-600">
                            Templates coming soon
                        </h3>
                    </div>
                )}
            </div>

            {/* Font Uploader Modal */}
            {showUploader && (
                <FontUploader
                    onClose={() => setShowUploader(false)}
                    onUploadSuccess={loadFonts}
                />
            )}
        </div>
    );
}
