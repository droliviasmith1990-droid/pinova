'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Upload } from 'lucide-react';
import { useTemplateStore } from '@/stores/templateStore';
import { useCanvasStore } from '@/stores/canvasStore';
import { useElementsStore } from '@/stores/elementsStore';
import { useEditorStore } from '@/stores/editorStore';
import { useStageRef } from '@/hooks/useStageRef';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { saveTemplate as saveTemplateToDb, checkTemplateNameExists } from '@/lib/db/templates';
import { generateThumbnail, uploadThumbnail } from '@/lib/canvasUtils';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import { CanvaImportModal } from '@/components/import/CanvaImportModal';
import { useAutoSave } from '@/hooks/useAutoSave';
import { AutoSaveIndicator } from '@/components/ui/AutoSaveIndicator';

export function Header() {
    // Template state from templateStore
    const templateName = useTemplateStore((s) => s.templateName);
    const setTemplateName = useTemplateStore((s) => s.setTemplateName);
    const templateId = useTemplateStore((s) => s.templateId);
    const isNewTemplate = useTemplateStore((s) => s.isNewTemplate);
    const setIsNewTemplate = useTemplateStore((s) => s.setIsNewTemplate);
    const isSaving = useTemplateStore((s) => s.isSaving);
    const setIsSaving = useTemplateStore((s) => s.setIsSaving);
    const setTemplateId = useTemplateStore((s) => s.setTemplateId);

    // Canvas state from canvasStore
    const backgroundColor = useCanvasStore((s) => s.backgroundColor);
    const canvasSize = useCanvasStore((s) => s.canvasSize);

    // Elements from elementsStore
    const elements = useElementsStore((s) => s.elements);

    // Keep some state in editorStore for now (will migrate later)
    const previewMode = useEditorStore((s) => s.previewMode);
    const setPreviewMode = useEditorStore((s) => s.setPreviewMode);

    const stageRef = useStageRef();
    const stage = stageRef?.current;

    const router = useRouter();
    const { currentUser, signOut } = useAuth();
    const userId = currentUser?.id;

    const [isCanvaImportOpen, setIsCanvaImportOpen] = useState(false);
    const [nameError, setNameError] = useState(false);
    const nameInputRef = useRef<HTMLInputElement>(null);

    // Auto-save hook (Finding #4)
    const autoSave = useAutoSave({
        debounceMs: 30000, // 30 seconds after last change
        enabled: true,
    });

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

        // Check for duplicate name (only for new templates)
        if (isNewTemplate) {
            const { exists } = await checkTemplateNameExists(templateName);
            if (exists) {
                // Show error - require unique name
                setNameError(true);
                nameInputRef.current?.focus();
                toast.error(`A template named "${templateName}" already exists. Please choose a different name.`);
                setTimeout(() => setNameError(false), 600);
                return;
            }
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
                    // Don't call loadTemplate - elements are already in stores
                    // Just sync the template ID across stores
                    
                    // Update editorStore's templateId and isNewTemplate
                    // (without resetting elements - they're already correct!)
                    useEditorStore.setState({
                        templateId: savedTemplate.id,
                        isNewTemplate: false
                    });
                    
                    // Sync templateStore with the saved template
                    setTemplateId(savedTemplate.id);
                    setIsNewTemplate(false);
                    
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
            <header className="h-16 px-6 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md flex items-center justify-between z-50 flex-shrink-0 transition-all">
                {/* Left: Back & Title */}
                <div className="flex items-center gap-4 flex-1">
                    <a
                        href="/dashboard"
                        className="group flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="Back to Dashboard"
                    >
                        <span className="material-symbols-outlined text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white transition-colors">arrow_back</span>
                    </a>

                    <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-2 hidden md:block"></div>

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
                                "w-full text-lg font-bold bg-transparent px-2 py-1 -ml-2 rounded-lg outline-none transition-all duration-200 placeholder-gray-400",
                                "focus:bg-gray-100 dark:focus:bg-gray-800 focus:ring-2 focus:ring-primary-creative/20",
                                nameError ? "text-red-500" : "text-gray-900 dark:text-white"
                            )}
                            placeholder="Untitled Template"
                        />
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3">
                     {/* Preview Toggle */}
                     <label className="hidden lg:flex items-center gap-2 cursor-pointer select-none px-3 py-1.5 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <input
                            type="checkbox"
                            checked={previewMode}
                            onChange={(e) => setPreviewMode(e.target.checked)}
                            className="sr-only peer"
                        />
                         <span className="material-symbols-outlined text-gray-400 peer-checked:text-primary-creative transition-colors text-xl">visibility</span>
                        <span className={cn("text-sm font-medium transition-colors", previewMode ? "text-primary-creative" : "text-gray-500")}>Preview</span>
                    </label>

                    {/* Import Canva */}
                    <button
                        onClick={() => setIsCanvaImportOpen(true)}
                        className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        <Upload className="w-4 h-4" />
                        <span>Import</span>
                    </button>

                    {/* Auto-save indicator */}
                    <div className="hidden xl:block">
                        <AutoSaveIndicator
                            status={autoSave.status}
                            lastSavedAt={autoSave.lastSavedAt}
                            isDirty={autoSave.isDirty}
                            errorMessage={autoSave.errorMessage}
                        />
                    </div>

                    <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>

                    {/* Save Button */}
                     <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2.5 rounded-full font-heading font-medium text-sm transition-all shadow-lg shadow-purple-500/20 active:scale-95",
                            "bg-gradient-to-r from-primary-creative to-secondary-creative text-white hover:opacity-90",
                            isSaving && "opacity-70 cursor-not-allowed"
                        )}
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Saving...' : 'Save Template'}
                    </button>

                    {/* User Menu */}
                     <div className="pl-1">
                        <button className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-white dark:border-gray-900 shadow-sm cursor-pointer flex items-center justify-center text-white font-bold text-xs transition-transform hover:scale-105 active:scale-95">
                                {currentUser?.email?.[0].toUpperCase() || 'G'}
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
