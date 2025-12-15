'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Upload, User, LogOut } from 'lucide-react';
import { useTemplateStore } from '@/stores/templateStore';
import { useCanvasStore } from '@/stores/canvasStore';
import { useElementsStore } from '@/stores/elementsStore';
import { useEditorStore } from '@/stores/editorStore'; // Keep for previewMode, loadTemplate
import { useStageRef } from '@/hooks/useStageRef';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { saveTemplate as saveTemplateToDb } from '@/lib/db/templates';
import { generateThumbnail, uploadThumbnail } from '@/lib/canvasUtils';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import { CanvaImportModal } from '@/components/import/CanvaImportModal';

export function Header() {
    // Template state from templateStore
    const templateName = useTemplateStore((s) => s.templateName);
    const setTemplateName = useTemplateStore((s) => s.setTemplateName);
    const templateId = useTemplateStore((s) => s.templateId);
    const isNewTemplate = useTemplateStore((s) => s.isNewTemplate);
    const isSaving = useTemplateStore((s) => s.isSaving);
    const setIsSaving = useTemplateStore((s) => s.setIsSaving);

    // Canvas state from canvasStore
    const backgroundColor = useCanvasStore((s) => s.backgroundColor);
    const canvasSize = useCanvasStore((s) => s.canvasSize);

    // Elements from elementsStore
    const elements = useElementsStore((s) => s.elements);

    // Keep some state in editorStore for now (will migrate later)
    const previewMode = useEditorStore((s) => s.previewMode);
    const setPreviewMode = useEditorStore((s) => s.setPreviewMode);
    const loadTemplate = useEditorStore((s) => s.loadTemplate);

    const stageRef = useStageRef();
    const stage = stageRef?.current;

    const router = useRouter();
    const { currentUser, signOut } = useAuth();
    const userId = currentUser?.id;

    const [isCanvaImportOpen, setIsCanvaImportOpen] = useState(false);
    const [nameError, setNameError] = useState(false);
    const nameInputRef = useRef<HTMLInputElement>(null);

    const handleSave = async () => {
        if (!templateName.trim() || templateName === 'Untitled Template') {
            setNameError(true);
            nameInputRef.current?.focus();
            toast.error('Please name your template before saving');
            setTimeout(() => setNameError(false), 600);
            return;
        }

        if (elements.length === 0) {
            toast.error('Add at least one element before saving');
            return;
        }

        if (!userId) {
            toast.error('Please sign in to save templates');
            return;
        }

        setIsSaving(true);

        try {
            let thumbnailUrl: string | undefined;

            if (stage) {
                try {
                    const thumbnailDataUrl = generateThumbnail(stage, {
                        maxWidth: 300,
                        maxHeight: 450,
                    });

                    if (thumbnailDataUrl) {
                        const uploadedUrl = await uploadThumbnail(
                            templateId,
                            userId,
                            thumbnailDataUrl
                        );
                        if (uploadedUrl) {
                            thumbnailUrl = uploadedUrl;
                        }
                    }
                } catch (thumbnailError) {
                    console.warn('Failed to generate/upload thumbnail:', thumbnailError);
                }
            }

            if (isSupabaseConfigured()) {
                const savedTemplate = await saveTemplateToDb({
                    id: isNewTemplate ? undefined : templateId,
                    name: templateName,
                    canvas_size: canvasSize,
                    background_color: backgroundColor,
                    elements: elements,
                    thumbnail_url: thumbnailUrl,
                });

                if (savedTemplate) {
                    loadTemplate({
                        id: savedTemplate.id,
                        name: savedTemplate.name,
                        elements: savedTemplate.elements,
                        background_color: savedTemplate.background_color,
                        canvas_size: savedTemplate.canvas_size,
                    });
                    toast.success('Template saved successfully!');
                } else {
                    throw new Error('Failed to save to database');
                }
            } else {
                const templateData = {
                    id: templateId,
                    name: templateName,
                    canvas_size: canvasSize,
                    background_color: backgroundColor,
                    elements: elements,
                    thumbnail_url: thumbnailUrl,
                    updated_at: new Date().toISOString()
                };

                console.log('📦 Template data (offline mode):', templateData);
                toast.success('Template saved locally (database not configured)');
            }
        } catch (error) {
            console.error('Failed to save template:', error);
            toast.error('Failed to save template');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = async () => {
        await signOut();
        toast.success('Logged out successfully');
        router.push('/login');
    };

    return (
        <>
            <header className="h-14 bg-white border-b border-gray-200 flex items-center gap-6 px-6 z-50 flex-shrink-0">
                {/* Logo */}
                <a
                    href="/dashboard"
                    className="flex items-center gap-2 text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors"
                    title="Back to Dashboard"
                >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white">
                            <path d="M8 12L11 15L16 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <span className="hidden md:inline">Editor</span>
                </a>

                {/* Template Name */}
                <div className="flex-1 max-w-md">
                    <input
                        ref={nameInputRef}
                        type="text"
                        value={templateName}
                        onChange={(e) => {
                            setTemplateName(e.target.value);
                            if (nameError) setNameError(false);
                        }}
                        maxLength={50}
                        className={cn(
                            "w-full text-base font-semibold px-3 py-2 rounded-lg outline-none transition-all duration-200",
                            nameError && "animate-[shake_0.5s_ease-in-out] border-2 border-red-500 bg-red-50",
                            !nameError && templateName && templateName !== 'Untitled Template'
                                ? "border-2 border-transparent bg-white hover:border-gray-200 focus:border-blue-500"
                                : "border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-white"
                        )}
                        placeholder="Untitled Template"
                    />
                </div>

                {/* Import Canva Button */}
                <button
                    onClick={() => setIsCanvaImportOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all hover:opacity-90 shadow-sm"
                    style={{
                        background: 'linear-gradient(135deg, #8B3DFF, #00C4CC)',
                        color: 'white'
                    }}
                    title="Import your Canva design"
                >
                    <Upload className="w-4 h-4" />
                    <span className="hidden md:inline">Import Canva</span>
                </button>

                {/* Preview Toggle */}
                <label className="hidden lg:flex items-center gap-2 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={previewMode}
                        onChange={(e) => setPreviewMode(e.target.checked)}
                        className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-gray-200 peer-checked:bg-blue-600 rounded-full relative transition-colors">
                        <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
                    </div>
                    <span className="text-sm text-gray-700">Preview</span>
                </label>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={cn(
                            "flex items-center gap-2 px-5 py-2 rounded-lg font-medium text-sm transition-all shadow-sm",
                            "bg-blue-600 text-white hover:bg-blue-700 active:scale-95",
                            isSaving && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>

                    {/* User Menu */}
                    <div className="flex items-center gap-2 pl-2 ml-2 border-l border-gray-200">
                        <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
                            <User className="w-4 h-4" />
                            <span className="max-w-[120px] truncate">
                                {currentUser?.email?.split('@')[0] || 'Guest'}
                            </span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Logout"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Canva Import Modal */}
            <CanvaImportModal
                isOpen={isCanvaImportOpen}
                onClose={() => setIsCanvaImportOpen(false)}
                onImportComplete={() => {
                    toast.success('Now add dynamic text and image fields on top of your design!');
                }}
            />
        </>
    );
}
