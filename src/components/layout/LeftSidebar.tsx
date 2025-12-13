'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Type,
    Image,
    Square,
    LayoutGrid,
    ChevronDown,
    ChevronUp,
    Grid3X3,
    Keyboard,
    RefreshCw,
    Loader2,
    Layout,
    MoreVertical,
    Trash2,
    Copy,
    Edit2
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
    getTemplates,
    getTemplate,
    deleteTemplate,
    duplicateTemplate,
    TemplateListItem
} from '@/lib/db/templates';
import { deleteTemplateAssets } from '@/lib/canvasUtils';
import { isSupabaseConfigured, getCurrentUserId } from '@/lib/supabase';
import { TemplateGallery } from '@/components/gallery/TemplateGallery';

// Section Header Component
function SectionHeader({ title }: { title: string }) {
    return (
        <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
            {title}
        </h3>
    );
}

// Element Button Component
function ElementButton({
    icon: Icon,
    label,
    onClick,
    isActive = false
}: {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    isActive?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                "hover:scale-[1.02] active:scale-[0.98]",
                isActive
                    ? "bg-blue-50 text-blue-700 border-l-4 border-blue-500"
                    : "text-gray-700 hover:bg-white hover:shadow-sm"
            )}
            style={{ minHeight: '40px' }}
        >
            <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={2} />
            <span>{label}</span>
        </button>
    );
}

export function LeftSidebar() {
    const templateId = useEditorStore((s) => s.templateId);
    const loadTemplate = useEditorStore((s) => s.loadTemplate);
    const setTemplates = useEditorStore((s) => s.setTemplates);
    const storeTemplates = useEditorStore((s) => s.templates);
    const resetToNewTemplate = useEditorStore((s) => s.resetToNewTemplate);
    const addText = useEditorStore((s) => s.addText);
    const addImage = useEditorStore((s) => s.addImage);
    const addShape = useEditorStore((s) => s.addShape);

    const [menuOpen, setMenuOpen] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingTemplate, setIsLoadingTemplate] = useState<string | null>(null);
    const [localTemplates, setLocalTemplates] = useState<TemplateListItem[]>([]);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [isQuickActionsExpanded, setIsQuickActionsExpanded] = useState(true);
    const [isTemplatesExpanded, setIsTemplatesExpanded] = useState(true);

    // Fetch templates from database
    const fetchTemplates = useCallback(async () => {
        if (!isSupabaseConfigured()) {
            setLocalTemplates([]);
            return;
        }

        setIsLoading(true);
        try {
            const templates = await getTemplates();
            setLocalTemplates(templates);
            setTemplates(templates.map(t => ({
                id: t.id,
                name: t.name,
                thumbnail_url: t.thumbnail_url || undefined
            })));
        } catch (error) {
            console.error('Error fetching templates:', error);
            toast.error('Failed to load templates');
        } finally {
            setIsLoading(false);
        }
    }, [setTemplates]);

    // Fetch templates on mount
    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    // Use database templates if available
    const displayTemplates = localTemplates.length > 0 ? localTemplates :
        (storeTemplates.length > 0 ? storeTemplates.map(t => ({
            ...t,
            category: null,
            created_at: '',
            updated_at: '',
            thumbnail_url: t.thumbnail_url || null
        })) : []);

    // Handle template selection
    const handleSelectTemplate = async (template: TemplateListItem) => {
        if (template.id === templateId) return;

        setIsLoadingTemplate(template.id);
        try {
            const fullTemplate = await getTemplate(template.id);

            if (fullTemplate) {
                loadTemplate({
                    id: fullTemplate.id,
                    name: fullTemplate.name,
                    elements: fullTemplate.elements,
                    background_color: fullTemplate.background_color,
                    canvas_size: fullTemplate.canvas_size,
                });
                toast.success(`Loaded "${template.name}"`);
            } else {
                loadTemplate({
                    id: template.id,
                    name: template.name,
                    elements: [],
                    background_color: '#FFFFFF'
                });
            }
        } catch (error) {
            console.error('Error loading template:', error);
            toast.error('Failed to load template');
        } finally {
            setIsLoadingTemplate(null);
        }

        setMenuOpen(null);
    };

    // Handle template deletion
    const handleDelete = async (templateItem: TemplateListItem, e: React.MouseEvent) => {
        e.stopPropagation();

        const confirmed = window.confirm(
            `Delete "${templateItem.name}"? This action cannot be undone.`
        );
        if (!confirmed) return;

        try {
            const userId = await getCurrentUserId();
            const success = await deleteTemplate(templateItem.id);

            if (success) {
                if (userId) {
                    await deleteTemplateAssets(templateItem.id, userId);
                }
                await fetchTemplates();

                if (templateItem.id === templateId) {
                    resetToNewTemplate();
                }

                toast.success(`Deleted "${templateItem.name}"`);
            } else {
                throw new Error('Delete failed');
            }
        } catch (error) {
            console.error('Error deleting template:', error);
            toast.error('Failed to delete template');
        }

        setMenuOpen(null);
    };

    // Handle template duplication
    const handleDuplicate = async (templateItem: TemplateListItem, e: React.MouseEvent) => {
        e.stopPropagation();

        try {
            const duplicated = await duplicateTemplate(templateItem.id);

            if (duplicated) {
                await fetchTemplates();
                toast.success(`Duplicated "${templateItem.name}"`);
            } else {
                throw new Error('Duplicate failed');
            }
        } catch (error) {
            console.error('Error duplicating template:', error);
            toast.error('Failed to duplicate template');
        }

        setMenuOpen(null);
    };

    const handleRename = (templateItem: TemplateListItem, e: React.MouseEvent) => {
        e.stopPropagation();
        toast.info('Rename feature coming soon');
        setMenuOpen(null);
    };

    const handleKeyboardShortcuts = () => {
        toast.info('Press ? to view keyboard shortcuts');
    };

    return (
        <aside className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
            {/* ELEMENTS Section */}
            <div className="p-2">
                <SectionHeader title="Elements" />
                <div className="space-y-1">
                    <ElementButton
                        icon={Type}
                        label="Add Text"
                        onClick={() => {
                            addText();
                            toast.success('Text element added');
                        }}
                    />
                    <ElementButton
                        icon={Image}
                        label="Add Image"
                        onClick={() => {
                            addImage();
                            toast.success('Image placeholder added');
                        }}
                    />
                    <ElementButton
                        icon={Square}
                        label="Add Shape"
                        onClick={() => {
                            addShape('rect');
                            toast.success('Shape added');
                        }}
                    />
                    <ElementButton
                        icon={LayoutGrid}
                        label="Add Frame"
                        onClick={() => {
                            toast.info('Frame feature coming soon');
                        }}
                    />
                </div>
            </div>

            {/* Separator */}
            <div className="mx-3 border-t border-gray-200" />

            {/* QUICK ACTIONS Section */}
            <div className="p-2">
                <button
                    onClick={() => setIsQuickActionsExpanded(!isQuickActionsExpanded)}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        Quick Actions
                    </span>
                    {isQuickActionsExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                </button>

                {isQuickActionsExpanded && (
                    <div className="space-y-1 mt-1">
                        <ElementButton
                            icon={Grid3X3}
                            label="Template Gallery"
                            onClick={() => setIsGalleryOpen(true)}
                        />
                        <button
                            onClick={() => toast.info('Import Canva from header "Import Canva" button')}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
                            style={{
                                background: 'linear-gradient(135deg, rgba(139,61,255,0.1), rgba(0,196,204,0.1))',
                                color: '#7C3AED',
                                minHeight: '40px'
                            }}
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M4.5 3A1.5 1.5 0 003 4.5v15A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5v-15A1.5 1.5 0 0019.5 3h-15zM12 7.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9z" />
                            </svg>
                            <span>Import from Canva</span>
                        </button>
                        <ElementButton
                            icon={Keyboard}
                            label="Keyboard Shortcuts"
                            onClick={handleKeyboardShortcuts}
                        />
                    </div>
                )}
            </div>

            {/* Separator */}
            <div className="mx-3 border-t border-gray-200" />

            {/* MY TEMPLATES Section */}
            <div className="flex-1 flex flex-col min-h-0 p-2">
                <button
                    onClick={() => setIsTemplatesExpanded(!isTemplatesExpanded)}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        My Templates
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                fetchTemplates();
                            }}
                            disabled={isLoading}
                            className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
                        </button>
                        {isTemplatesExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                    </div>
                </button>

                {isTemplatesExpanded && (
                    <div className="flex-1 overflow-y-auto mt-1 space-y-1">
                        {isLoading && displayTemplates.length === 0 ? (
                            <div className="flex items-center justify-center py-6">
                                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                            </div>
                        ) : displayTemplates.length === 0 ? (
                            <div className="text-center py-6 text-gray-400 text-xs">
                                No templates yet
                            </div>
                        ) : (
                            displayTemplates.map((template) => (
                                <div
                                    key={template.id}
                                    onClick={() => handleSelectTemplate(template)}
                                    className={cn(
                                        "relative flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all group",
                                        "hover:bg-white hover:shadow-sm hover:scale-[1.02]",
                                        templateId === template.id
                                            ? "bg-blue-50 border-l-4 border-blue-500"
                                            : "border-l-4 border-transparent",
                                        isLoadingTemplate === template.id && "opacity-50 pointer-events-none"
                                    )}
                                >
                                    {/* Thumbnail */}
                                    <div className="w-8 h-12 rounded bg-gradient-to-br from-pink-400 to-red-500 flex-shrink-0 overflow-hidden">
                                        {template.thumbnail_url && (
                                            <img
                                                src={template.thumbnail_url}
                                                alt={template.name}
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                    </div>

                                    {/* Name */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-700 truncate">
                                            {template.name}
                                        </p>
                                    </div>

                                    {/* Loading indicator */}
                                    {isLoadingTemplate === template.id && (
                                        <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                                    )}

                                    {/* Menu Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setMenuOpen(menuOpen === template.id ? null : template.id);
                                        }}
                                        className="p-1 rounded hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <MoreVertical className="w-3 h-3 text-gray-500" />
                                    </button>

                                    {/* Dropdown Menu */}
                                    {menuOpen === template.id && (
                                        <div
                                            className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button
                                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                                                onClick={(e) => handleRename(template, e)}
                                            >
                                                <Edit2 className="w-3 h-3" />
                                                Rename
                                            </button>
                                            <button
                                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                                                onClick={(e) => handleDuplicate(template, e)}
                                            >
                                                <Copy className="w-3 h-3" />
                                                Duplicate
                                            </button>
                                            <button
                                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                                                onClick={(e) => handleDelete(template, e)}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Action */}
            <div className="p-3 border-t border-gray-200">
                <button
                    onClick={() => {
                        resetToNewTemplate();
                        toast.success('New template created');
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-medium text-sm transition-all shadow-sm hover:shadow-md"
                >
                    <Layout className="w-4 h-4" />
                    New Template
                </button>
            </div>

            {/* Template Gallery Modal */}
            <TemplateGallery
                isOpen={isGalleryOpen}
                onClose={() => setIsGalleryOpen(false)}
            />
        </aside>
    );
}
