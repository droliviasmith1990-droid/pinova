'use client';

import React, { useState, useEffect } from 'react';
import { X, Search, Type, Sparkles, Trash2 } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { cn } from '@/lib/utils';
import { generateId } from '@/lib/utils';
import { TextElement } from '@/types/editor';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from 'sonner';
import { useStageRef } from '@/hooks/useStageRef';

// Font categories with Google Fonts
const FONT_CATEGORIES = {
    'Sans Serif': [
        'Inter',
        'Roboto',
        'Open Sans',
        'Montserrat',
        'Poppins',
        'Lato',
        'Work Sans',
        'Nunito',
        'Raleway',
        'Source Sans Pro'
    ],
    'Serif': [
        'Playfair Display',
        'Merriweather',
        'Lora',
        'Crimson Text',
        'PT Serif',
        'Libre Baskerville',
        'Cormorant Garamond'
    ],
    'Display': [
        'Bebas Neue',
        'Oswald',
        'Archivo Black',
        'Righteous',
        'Russo One',
        'Teko',
        'Anton'
    ],
    'Script': [
        'Pacifico',
        'Dancing Script',
        'Great Vibes',
        'Satisfy',
        'Cookie',
        'Lobster',
        'Sacramento'
    ]
};

// Pre-designed text style templates
const TEXT_TEMPLATES = [
    {
        id: 'buy-now',
        name: 'BUY NOW',
        preview: 'BUY NOW',
        style: {
            text: 'BUY NOW',
            fontFamily: 'Bebas Neue',
            fontSize: 64,
            fill: '#3B82F6',
            stroke: '#1D4ED8',
            strokeWidth: 2,
        }
    },
    {
        id: 'classic',
        name: 'Classic',
        preview: 'CLASSIC',
        style: {
            text: 'CLASSIC',
            fontFamily: 'Playfair Display',
            fontSize: 56,
            fill: '#1F2937',
            stroke: '#9CA3AF',
            strokeWidth: 1,
        }
    },
    {
        id: 'modern',
        name: 'Modern',
        preview: 'MODERN',
        style: {
            text: 'MODERN',
            fontFamily: 'Montserrat',
            fontSize: 48,
            fill: '#000000',
        }
    },
    {
        id: 'elegant',
        name: 'Elegant Script',
        preview: 'Elegant',
        style: {
            text: 'Elegant',
            fontFamily: 'Great Vibes',
            fontSize: 72,
            fill: '#7C3AED',
        }
    },
    {
        id: 'bold-cta',
        name: 'Bold CTA',
        preview: 'CLICK HERE',
        style: {
            text: 'CLICK HERE',
            fontFamily: 'Anton',
            fontSize: 52,
            fill: '#DC2626',
            backgroundEnabled: true,
            backgroundColor: '#FEF2F2',
            backgroundPadding: 16,
            backgroundCornerRadius: 8,
        }
    },
    {
        id: 'minimal',
        name: 'Minimal',
        preview: 'minimal',
        style: {
            text: 'minimal',
            fontFamily: 'Inter',
            fontSize: 36,
            fill: '#6B7280',
        }
    },
    {
        id: 'handwritten',
        name: 'Handwritten',
        preview: 'Handwritten',
        style: {
            text: 'Handwritten',
            fontFamily: 'Dancing Script',
            fontSize: 56,
            fill: '#059669',
        }
    },
    {
        id: 'shadow-text',
        name: 'Shadow',
        preview: 'SHADOW',
        style: {
            text: 'SHADOW',
            fontFamily: 'Oswald',
            fontSize: 60,
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeWidth: 2,
            shadowColor: '#000000',
            shadowBlur: 10,
            shadowOffsetX: 4,
            shadowOffsetY: 4,
            shadowOpacity: 0.5,
        }
    }
];

interface FontLibraryPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function FontLibraryPanel({ isOpen, onClose }: FontLibraryPanelProps) {
    const [activeTab, setActiveTab] = useState<'fonts' | 'templates'>('fonts');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedCategory, setExpandedCategory] = useState<string | null>('My Fonts');
    const [customFonts, setCustomFonts] = useState<Array<{ id: string; name: string; url: string }>>([]);
    const [isUploading, setIsUploading] = useState(false);

    const { currentUser } = useAuth();

    const selectedIds = useEditorStore((s) => s.selectedIds);
    const selectedId = selectedIds[0] || null;
    const elements = useEditorStore((s) => s.elements);
    const updateElement = useEditorStore((s) => s.updateElement);
    const addElement = useEditorStore((s) => s.addElement);
    const selectElement = useEditorStore((s) => s.selectElement);
    const pushHistory = useEditorStore((s) => s.pushHistory);
    const canvasSize = useEditorStore((s) => s.canvasSize);

    const selectedElement = elements.find((el) => el.id === selectedId);
    const isTextSelected = selectedElement?.type === 'text';

    // Get stage ref for forcing canvas redraw after font loads
    const stageRef = useStageRef();
    const stage = stageRef?.current;

    // Load user's saved fonts on mount
    useEffect(() => {
        if (!currentUser || !isSupabaseConfigured()) return;

        const loadUserFonts = async () => {
            try {
                const { data, error } = await supabase
                    .from('custom_fonts')
                    .select('id, name, url')
                    .eq('user_id', currentUser.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                if (data && data.length > 0) {
                    // Register each font with the browser
                    const loadedFonts: Array<{ id: string; name: string; url: string }> = [];
                    for (const font of data) {
                        try {
                            const fontFace = new FontFace(font.name, `url(${font.url})`);
                            await fontFace.load();
                            document.fonts.add(fontFace);
                            loadedFonts.push(font);
                        } catch (fontError) {
                            console.warn(`Failed to load font: ${font.name}`, fontError);
                        }
                    }
                    setCustomFonts(loadedFonts);
                    // Force Konva to redraw with the new fonts
                    stage?.batchDraw();
                }
            } catch (err) {
                console.error('Failed to load saved fonts:', err);
            }
        };

        loadUserFonts();
    }, [currentUser, stage]);

    // Helper: Register custom font using Font Loading API
    const registerCustomFont = async (file: File): Promise<string> => {
        const buffer = await file.arrayBuffer();
        // Clean name: remove extension and special chars
        const fontName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9 ]/g, "");

        const fontFace = new FontFace(fontName, buffer);
        await fontFace.load();
        document.fonts.add(fontFace);
        return fontName;
    };

    // Handle custom font file upload with Supabase persistence
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;

        // Check if user is authenticated for persistence
        if (!currentUser || !isSupabaseConfigured()) {
            // Fall back to session-only upload
            setIsUploading(true);
            try {
                const fontName = await registerCustomFont(e.target.files[0]);
                // For session-only fonts, create a temp object with a random id
                setCustomFonts(prev => [{ id: `temp-${Date.now()}`, name: fontName, url: '' }, ...prev]);
                stage?.batchDraw(); // Force Konva redraw
                if (isTextSelected && selectedId) {
                    updateElement(selectedId, { fontFamily: fontName });
                    pushHistory();
                }
                toast.success('Font loaded (session only - sign in to save permanently)');
            } catch (err) {
                console.error("Failed to load font", err);
                toast.error("Failed to load font. Make sure it's a valid TTF, OTF, or WOFF file.");
            } finally {
                setIsUploading(false);
                e.target.value = '';
            }
            return;
        }

        const file = e.target.files[0];
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "");
        const fileExtension = file.name.split('.').pop();
        const fileName = `${currentUser.id}/${Date.now()}-${cleanName}.${fileExtension}`;

        setIsUploading(true);
        const loadingToast = toast.loading('Uploading font...');

        try {
            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('fonts')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('fonts')
                .getPublicUrl(fileName);

            // 3. Save to Database
            const { error: dbError } = await supabase
                .from('custom_fonts')
                .insert({
                    user_id: currentUser.id,
                    name: cleanName,
                    url: publicUrl
                });

            if (dbError) throw dbError;

            // 4. Register globally with FontFace API
            const fontFace = new FontFace(cleanName, `url(${publicUrl})`);
            await fontFace.load();
            document.fonts.add(fontFace);

            // 5. Update Local State with the new font object
            setCustomFonts(prev => [{ id: Date.now().toString(), name: cleanName, url: publicUrl }, ...prev]);

            // 6. Force Konva to redraw with the new font
            stage?.batchDraw();

            // 7. Auto-apply to selected text if applicable
            if (isTextSelected && selectedId) {
                updateElement(selectedId, { fontFamily: cleanName });
                pushHistory();
            }

            toast.dismiss(loadingToast);
            toast.success('Font uploaded and saved!');

        } catch (error) {
            console.error('Font upload failed:', error);
            toast.dismiss(loadingToast);
            toast.error('Failed to upload font');
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    const handleFontSelect = (fontFamily: string) => {
        if (isTextSelected) {
            updateElement(selectedId!, { fontFamily });
            pushHistory();
        }
    };

    const handleTemplateSelect = (template: typeof TEXT_TEMPLATES[0]) => {
        // Base element properties
        const baseElement = {
            id: generateId(),
            name: `Text ${elements.filter(e => e.type === 'text').length + 1}`,
            type: 'text' as const,
            x: canvasSize.width / 2 - 100,
            y: canvasSize.height / 2 - 25,
            width: 250,
            height: 80,
            rotation: 0,
            opacity: 1,
            locked: false,
            visible: true,
            zIndex: elements.length,
        };

        // Default text properties (will be overridden by template)
        const defaultTextProps = {
            text: 'Text',
            fontFamily: 'Inter',
            fontSize: 32,
            fontStyle: 'normal' as const,
            fill: '#000000',
            align: 'center' as const,
            verticalAlign: 'middle' as const,
            lineHeight: 1.2,
            letterSpacing: 0,
            textDecoration: '' as const,
            isDynamic: false,
        };

        // Merge: base + defaults + template style (template wins)
        const newText: TextElement = {
            ...baseElement,
            ...defaultTextProps,
            ...template.style,
        };

        addElement(newText);
        selectElement(newText.id);
        pushHistory();
    };

    // Filter fonts based on search
    const filteredCategories = Object.entries(FONT_CATEGORIES).reduce((acc, [category, fonts]) => {
        const filtered = fonts.filter(font =>
            font.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (filtered.length > 0) {
            acc[category] = filtered;
        }
        return acc;
    }, {} as Record<string, string[]>);

    if (!isOpen) return null;

    return (
        <div className="absolute left-0 top-0 bottom-0 w-80 bg-white border-r border-gray-200 z-30 flex flex-col shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-900">Font Library</h2>
                <button
                    onClick={onClose}
                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                >
                    <X className="w-5 h-5 text-gray-500" />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('fonts')}
                    className={cn(
                        "flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                        activeTab === 'fonts'
                            ? "text-blue-600 border-b-2 border-blue-600"
                            : "text-gray-500 hover:text-gray-700"
                    )}
                >
                    <Type className="w-4 h-4" />
                    Fonts
                </button>
                <button
                    onClick={() => setActiveTab('templates')}
                    className={cn(
                        "flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                        activeTab === 'templates'
                            ? "text-blue-600 border-b-2 border-blue-600"
                            : "text-gray-500 hover:text-gray-700"
                    )}
                >
                    <Sparkles className="w-4 h-4" />
                    Templates
                </button>
            </div>

            {activeTab === 'fonts' && (
                <>
                    {/* Search */}
                    <div className="p-3 border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search fonts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                            />
                        </div>
                    </div>

                    {/* Upload Custom Font Button */}
                    <div className="p-3 border-b border-gray-100 bg-gray-50">
                        <label className={cn(
                            "flex items-center justify-center w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm cursor-pointer hover:bg-gray-50 transition-colors",
                            isUploading && "opacity-50 cursor-not-allowed"
                        )}>
                            <span className="text-sm font-medium text-gray-700">
                                {isUploading ? 'Loading...' : 'Upload Font (TTF/OTF/WOFF)'}
                            </span>
                            <input
                                type="file"
                                className="hidden"
                                accept=".ttf,.otf,.woff,.woff2"
                                onChange={handleFileUpload}
                                disabled={isUploading}
                            />
                        </label>
                    </div>

                    {/* Font Categories */}
                    <div className="flex-1 overflow-y-auto">
                        {/* Custom Fonts Category (if any) */}
                        {customFonts.length > 0 && (
                            <div className="border-b border-gray-100">
                                <button
                                    onClick={() => setExpandedCategory(expandedCategory === 'Custom' ? null : 'Custom')}
                                    className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                >
                                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                                        My Fonts
                                    </span>
                                    <span className="text-xs text-gray-400">{customFonts.length}</span>
                                </button>

                                {expandedCategory === 'Custom' && (
                                    <div className="pb-2">
                                        {customFonts.map((font) => (
                                            <div key={font.id} className="group relative flex items-center">
                                                <button
                                                    onClick={() => handleFontSelect(font.name)}
                                                    disabled={!isTextSelected}
                                                    className={cn(
                                                        "flex-1 px-4 py-2 flex flex-col items-start hover:bg-blue-50 transition-colors text-left",
                                                        !isTextSelected && "opacity-50 cursor-not-allowed",
                                                        (selectedElement as TextElement)?.fontFamily === font.name && "bg-blue-50"
                                                    )}
                                                >
                                                    <span
                                                        className="text-lg text-gray-800"
                                                        style={{ fontFamily: font.name }}
                                                    >
                                                        Awesome!
                                                    </span>
                                                    <span className="text-xs text-gray-500">{font.name}</span>
                                                </button>
                                                {/* Delete button - only for fonts with URLs (persisted) */}
                                                {font.url && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            if (!confirm('Delete this font?')) return;
                                                            try {
                                                                // Delete from DB
                                                                await supabase.from('custom_fonts').delete().eq('id', font.id);
                                                                // Delete from Storage
                                                                const path = font.url.split('/fonts/')[1];
                                                                if (path) await supabase.storage.from('fonts').remove([path]);
                                                                setCustomFonts(prev => prev.filter(f => f.id !== font.id));
                                                                toast.success('Font deleted');
                                                            } catch (err) {
                                                                toast.error('Failed to delete font');
                                                            }
                                                        }}
                                                        className="absolute right-2 p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Standard Font Categories */}
                        {Object.entries(filteredCategories).map(([category, fonts]) => (
                            <div key={category} className="border-b border-gray-100">
                                <button
                                    onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                                    className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                >
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        {category}
                                    </span>
                                    <span className="text-xs text-gray-400">{fonts.length}</span>
                                </button>

                                {expandedCategory === category && (
                                    <div className="pb-2">
                                        {fonts.map((font) => (
                                            <button
                                                key={font}
                                                onClick={() => handleFontSelect(font)}
                                                disabled={!isTextSelected}
                                                className={cn(
                                                    "w-full px-4 py-2 flex flex-col items-start hover:bg-blue-50 transition-colors text-left",
                                                    !isTextSelected && "opacity-50 cursor-not-allowed",
                                                    (selectedElement as TextElement)?.fontFamily === font && "bg-blue-50"
                                                )}
                                            >
                                                <span
                                                    className="text-lg text-gray-800"
                                                    style={{ fontFamily: font }}
                                                >
                                                    Awesome!
                                                </span>
                                                <span className="text-xs text-gray-500">{font}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {!isTextSelected && (
                        <div className="p-3 bg-amber-50 border-t border-amber-100">
                            <p className="text-xs text-amber-700">
                                Select a text element to change its font
                            </p>
                        </div>
                    )}
                </>
            )}

            {activeTab === 'templates' && (
                <div className="flex-1 overflow-y-auto p-3">
                    <p className="text-xs text-gray-500 mb-3">Click a template to add styled text</p>
                    <div className="grid grid-cols-2 gap-2">
                        {TEXT_TEMPLATES.map((template) => (
                            <button
                                key={template.id}
                                onClick={() => handleTemplateSelect(template)}
                                className="p-3 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all group"
                            >
                                <div
                                    className="text-center mb-1 truncate"
                                    style={{
                                        fontFamily: template.style.fontFamily,
                                        fontSize: Math.min((template.style.fontSize as number) / 3, 20),
                                        color: template.style.fill as string,
                                    }}
                                >
                                    {template.preview}
                                </div>
                                <p className="text-[10px] text-gray-400 truncate">{template.name}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
