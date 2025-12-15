'use client';

import React, { useState } from 'react';
import {
    MousePointer2,
    Type,
    Image,
    Square,
    Upload,
    FilePlus,
    LayoutGrid
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TemplateGallery } from '@/components/gallery/TemplateGallery';
import { CanvaImportModal } from '@/components/import/CanvaImportModal';

type ToolType = 'pointer' | 'text' | 'image' | 'shape' | 'templates';

interface ToolButtonProps {
    icon: React.ElementType;
    label: string;
    shortcut?: string;
    isActive?: boolean;
    onClick: () => void;
}

/**
 * Individual tool button with tooltip
 */
function ToolButton({ icon: Icon, label, shortcut, isActive, onClick }: ToolButtonProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "group relative w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200",
                isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                    : "text-gray-600 hover:bg-white hover:shadow-md hover:text-gray-900"
            )}
        >
            <Icon className="w-5 h-5" strokeWidth={1.5} />

            {/* Tooltip */}
            <div className="absolute left-full ml-3 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-xl">
                <span>{label}</span>
                {shortcut && (
                    <span className="ml-2 text-gray-400 text-xs bg-gray-800 px-1.5 py-0.5 rounded">
                        {shortcut}
                    </span>
                )}
                {/* Arrow */}
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
            </div>
        </button>
    );
}

/**
 * Left Sidebar - Clean vertical toolbar
 */
export function LeftSidebar() {
    const [activeTool, setActiveTool] = useState<ToolType>('pointer');
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [isCanvaImportOpen, setIsCanvaImportOpen] = useState(false);

    // Editor actions
    const addText = useEditorStore((s) => s.addText);
    const addShape = useEditorStore((s) => s.addShape);
    const resetToNewTemplate = useEditorStore((s) => s.resetToNewTemplate);

    // Tool handlers
    const handleToolClick = (tool: ToolType) => {
        setActiveTool(tool);

        switch (tool) {
            case 'text':
                addText();
                toast.success('Text added');
                break;
            case 'shape':
                addShape('rect');
                toast.success('Shape added');
                break;
            case 'templates':
                setIsGalleryOpen(true);
                break;
            default:
                break;
        }
    };

    const handleNewTemplate = () => {
        resetToNewTemplate();
        toast.success('New template created');
    };

    const handleImportCanva = () => {
        setIsCanvaImportOpen(true);
    };

    return (
        <>
            <aside
                className="w-[72px] bg-gray-50/80 backdrop-blur-sm border-r border-gray-200/60 flex flex-col h-full"
                aria-label="Editor tools"
            >
                {/* Tools Section */}
                <div className="flex-1 flex flex-col items-center py-4 gap-2">
                    <ToolButton
                        icon={MousePointer2}
                        label="Select"
                        shortcut="V"
                        isActive={activeTool === 'pointer'}
                        onClick={() => handleToolClick('pointer')}
                    />
                    <ToolButton
                        icon={Type}
                        label="Text"
                        shortcut="T"
                        isActive={activeTool === 'text'}
                        onClick={() => handleToolClick('text')}
                    />
                    <ToolButton
                        icon={Square}
                        label="Shape"
                        shortcut="R"
                        isActive={activeTool === 'shape'}
                        onClick={() => handleToolClick('shape')}
                    />
                    <ToolButton
                        icon={LayoutGrid}
                        label="Templates"
                        isActive={activeTool === 'templates'}
                        onClick={() => handleToolClick('templates')}
                    />
                </div>

                {/* Bottom Section - Templates */}
                <div className="p-3 space-y-2">
                    {/* Import Canva Button */}
                    <button
                        onClick={handleImportCanva}
                        className="w-full flex flex-col items-center justify-center gap-1 py-3 rounded-xl text-white text-xs font-semibold transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95 shadow-lg"
                        style={{
                            background: 'linear-gradient(145deg, #A855F7 0%, #7C3AED 100%)'
                        }}
                    >
                        <Upload className="w-5 h-5" />
                        <span>Import</span>
                    </button>

                    {/* New Template Button */}
                    <button
                        onClick={handleNewTemplate}
                        className="relative w-full flex flex-col items-center justify-center gap-1 py-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs font-semibold hover:from-blue-600 hover:to-blue-700 hover:scale-105 hover:shadow-xl active:scale-95 transition-all duration-200 shadow-lg"
                    >
                        {/* Notification Badge */}
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[8px] font-bold border-2 border-white shadow animate-pulse">
                            !
                        </div>
                        <FilePlus className="w-5 h-5" />
                        <span>New</span>
                    </button>
                </div>
            </aside>

            {/* Template Gallery Modal */}
            <TemplateGallery
                isOpen={isGalleryOpen}
                onClose={() => setIsGalleryOpen(false)}
            />

            {/* Canva Import Modal */}
            <CanvaImportModal
                isOpen={isCanvaImportOpen}
                onClose={() => setIsCanvaImportOpen(false)}
            />
        </>
    );
}
