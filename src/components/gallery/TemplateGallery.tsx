'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Layout, ChefHat, Quote, ShoppingBag, BarChart3, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getPublicTemplates, getTemplate, TemplateListItem } from '@/lib/db/templates';
import { useEditorStore } from '@/stores/editorStore';
import { isSupabaseConfigured } from '@/lib/supabase';
import { generateId } from '@/lib/utils';

interface TemplateGalleryProps {
    isOpen: boolean;
    onClose: () => void;
}

// Category icons mapping
const categoryIcons: Record<string, React.ReactNode> = {
    'Food': <ChefHat className="w-4 h-4" />,
    'Quote': <Quote className="w-4 h-4" />,
    'Product': <ShoppingBag className="w-4 h-4" />,
    'Infographic': <BarChart3 className="w-4 h-4" />,
    'Info': <BarChart3 className="w-4 h-4" />,
};

// Demo templates for when database is not configured
const demoGalleryTemplates: TemplateListItem[] = [
    { id: 'demo-1', name: 'Recipe Card', thumbnail_url: null, category: 'Food', created_at: '', updated_at: '' },
    { id: 'demo-2', name: 'Inspirational Quote', thumbnail_url: null, category: 'Quote', created_at: '', updated_at: '' },
    { id: 'demo-3', name: 'Product Showcase', thumbnail_url: null, category: 'Product', created_at: '', updated_at: '' },
    { id: 'demo-4', name: 'Stats Infographic', thumbnail_url: null, category: 'Infographic', created_at: '', updated_at: '' },
    { id: 'demo-5', name: 'Step-by-Step Guide', thumbnail_url: null, category: 'Info', created_at: '', updated_at: '' },
    { id: 'demo-6', name: 'Before & After', thumbnail_url: null, category: 'Product', created_at: '', updated_at: '' },
];

export function TemplateGallery({ isOpen, onClose }: TemplateGalleryProps) {
    const loadTemplate = useEditorStore((s) => s.loadTemplate);

    const [templates, setTemplates] = useState<TemplateListItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingTemplate, setIsLoadingTemplate] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Fetch public templates
    const fetchTemplates = useCallback(async () => {
        if (!isSupabaseConfigured()) {
            setTemplates(demoGalleryTemplates);
            return;
        }

        setIsLoading(true);
        try {
            const publicTemplates = await getPublicTemplates();
            setTemplates(publicTemplates.length > 0 ? publicTemplates : demoGalleryTemplates);
        } catch (error) {
            console.error('Error fetching public templates:', error);
            setTemplates(demoGalleryTemplates);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchTemplates();
        }
    }, [isOpen, fetchTemplates]);

    // Get unique categories
    const categories = Array.from(new Set(templates.map(t => t.category).filter(Boolean))) as string[];

    // Filter templates by category
    const filteredTemplates = selectedCategory
        ? templates.filter(t => t.category === selectedCategory)
        : templates;

    // Handle "Use Template" click
    const handleUseTemplate = async (template: TemplateListItem) => {
        setIsLoadingTemplate(template.id);

        try {
            // Try to fetch full template data
            const fullTemplate = await getTemplate(template.id);

            if (fullTemplate) {
                // Load template as a copy (with new ID so it saves as new)
                loadTemplate({
                    id: generateId(), // New ID for the copy
                    name: `${fullTemplate.name} (Copy)`,
                    elements: fullTemplate.elements,
                    background_color: fullTemplate.background_color,
                    canvas_size: fullTemplate.canvas_size,
                });
                toast.success(`Loaded "${template.name}" as a new template`);
            } else {
                // Fallback for demo templates
                loadTemplate({
                    id: generateId(),
                    name: `${template.name} (Copy)`,
                    elements: [],
                    background_color: '#FFFFFF',
                });
                toast.info(`Created "${template.name}" template (demo)`);
            }

            onClose();
        } catch (error) {
            console.error('Error loading template:', error);
            toast.error('Failed to load template');
        } finally {
            setIsLoadingTemplate(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col m-4">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Template Gallery</h2>
                        <p className="text-sm text-gray-500">Choose a template to get started quickly</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Category Filters */}
                <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-2 overflow-x-auto">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                            selectedCategory === null
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        )}
                    >
                        <Layout className="w-4 h-4" />
                        All Templates
                    </button>
                    {categories.map((category) => (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                                selectedCategory === category
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            )}
                        >
                            {categoryIcons[category] || <Layout className="w-4 h-4" />}
                            {category}
                        </button>
                    ))}
                </div>

                {/* Template Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                    ) : filteredTemplates.length === 0 ? (
                        <div className="text-center py-16 text-gray-500">
                            <Layout className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>No templates found in this category</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            {filteredTemplates.map((template) => (
                                <div
                                    key={template.id}
                                    className="group relative bg-white rounded-xl border-2 border-gray-200 overflow-hidden hover:border-blue-500 hover:shadow-lg transition-all"
                                >
                                    {/* Thumbnail */}
                                    <div className="aspect-[2/3] bg-gradient-to-br from-pink-400 via-purple-400 to-blue-500 relative">
                                        {template.thumbnail_url ? (
                                            <img
                                                src={template.thumbnail_url}
                                                alt={template.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Layout className="w-12 h-12 text-white/50" />
                                            </div>
                                        )}

                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                onClick={() => handleUseTemplate(template)}
                                                disabled={isLoadingTemplate === template.id}
                                                className={cn(
                                                    "px-6 py-2.5 bg-white text-gray-900 rounded-lg font-medium text-sm",
                                                    "hover:bg-blue-600 hover:text-white transition-colors",
                                                    "flex items-center gap-2",
                                                    isLoadingTemplate === template.id && "opacity-50 cursor-not-allowed"
                                                )}
                                            >
                                                {isLoadingTemplate === template.id ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Loading...
                                                    </>
                                                ) : (
                                                    'Use Template'
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="p-3">
                                        <p className="font-medium text-gray-900 truncate">{template.name}</p>
                                        {template.category && (
                                            <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                                                {categoryIcons[template.category] || <Layout className="w-3 h-3" />}
                                                {template.category}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
