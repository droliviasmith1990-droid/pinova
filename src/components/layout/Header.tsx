'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Eye, Plus, LogOut, User, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { useStageRef } from '@/hooks/useStageRef';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { saveTemplate as saveTemplateToDb } from '@/lib/db/templates';
import { generateThumbnail, uploadThumbnail } from '@/lib/canvasUtils';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import { CanvaImportModal } from '@/components/import/CanvaImportModal';

export function Header() {
    const templateName = useEditorStore((s) => s.templateName);
    const setTemplateName = useEditorStore((s) => s.setTemplateName);
    const previewMode = useEditorStore((s) => s.previewMode);
    const setPreviewMode = useEditorStore((s) => s.setPreviewMode);
    const isSaving = useEditorStore((s) => s.isSaving);
    const setIsSaving = useEditorStore((s) => s.setIsSaving);
    const elements = useEditorStore((s) => s.elements);
    const templateId = useEditorStore((s) => s.templateId);
    const backgroundColor = useEditorStore((s) => s.backgroundColor);
    const canvasSize = useEditorStore((s) => s.canvasSize);
    const isNewTemplate = useEditorStore((s) => s.isNewTemplate);
    const loadTemplate = useEditorStore((s) => s.loadTemplate);
    const resetToNewTemplate = useEditorStore((s) => s.resetToNewTemplate);

    // Access stage for thumbnail generation
    const stageRef = useStageRef();
    const stage = stageRef?.current;

    // Auth context
    const router = useRouter();
    const { currentUser, signOut } = useAuth();
    const userId = currentUser?.id;

    // Canva import modal state
    const [isCanvaImportOpen, setIsCanvaImportOpen] = useState(false);

    // Template name validation state
    const [nameError, setNameError] = useState(false);
    const [isNameFocused, setIsNameFocused] = useState(false);
    const nameInputRef = useRef<HTMLInputElement>(null);

    const handleSave = async () => {
        // Validate template name
        if (!templateName.trim() || templateName === 'Untitled Template') {
            setNameError(true);
            nameInputRef.current?.focus();
            toast.error('Please name your template before saving');
            // Remove error state after animation
            setTimeout(() => setNameError(false), 600);
            return;
        }

        // Validate template has elements
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

            // Generate and upload thumbnail if stage is available
            if (stage) {
                try {
                    // Generate thumbnail from canvas
                    const thumbnailDataUrl = generateThumbnail(stage, {
                        maxWidth: 300,
                        maxHeight: 450,
                    });

                    if (thumbnailDataUrl) {
                        // Upload to S3
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
                    // Continue without thumbnail
                }
            }

            // Save to database if Supabase is configured
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
                    // Update store with saved template info
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
                // Fallback: Log data for demo/offline mode
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

    const handleNewTemplate = () => {
        // Ask for confirmation if there are unsaved changes
        if (elements.length > 0) {
            const confirmed = window.confirm(
                'Create a new template? Any unsaved changes will be lost.'
            );
            if (!confirmed) return;
        }

        resetToNewTemplate();
        toast.success('New template created');
    };

    const handleLogout = async () => {
        await signOut();
        toast.success('Logged out successfully');
        router.push('/login');
    };

    const handlePreview = () => {
        toast.info('Preview feature coming soon!');
    };

    return (
        <>
            <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50 flex-shrink-0">
                {/* Left Section */}
                <div className="flex items-center gap-4">
                    {/* Logo */}
                    <a
                        href="/dashboard"
                        className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition-all"
                        title="Back to Dashboard"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M8 12L11 15L16 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </a>

                    {/* Template Name - Enhanced styling */}
                    <div className="relative">
                        <input
                            ref={nameInputRef}
                            type="text"
                            value={templateName}
                            onChange={(e) => {
                                setTemplateName(e.target.value);
                                if (nameError) setNameError(false);
                            }}
                            onFocus={() => setIsNameFocused(true)}
                            onBlur={() => setIsNameFocused(false)}
                            maxLength={50}
                            className={cn(
                                "text-lg font-semibold text-gray-900 rounded-lg px-3 py-1.5 min-w-[200px] max-w-[300px] outline-none transition-all duration-200",
                                nameError && "animate-[shake_0.5s_ease-in-out] border-red-500 bg-red-50",
                                !nameError && templateName && templateName !== 'Untitled Template'
                                    ? "border-2 border-blue-500 bg-white pr-10"
                                    : "border-2 border-dashed border-gray-400 bg-[#FFF9E6]"
                            )}
                            placeholder="Click to name your template..."
                        />
                        {/* Status icon */}
                        {templateName && templateName !== 'Untitled Template' && !nameError && (
                            <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                        )}
                        {nameError && (
                            <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                        )}
                    </div>

                    {/* New Template Button */}
                    <button
                        onClick={handleNewTemplate}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title="New Template"
                    >
                        <Plus className="w-4 h-4" />
                        New
                    </button>

                    {/* Import from Canva Button */}
                    <button
                        onClick={() => setIsCanvaImportOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all hover:opacity-90"
                        style={{
                            background: 'linear-gradient(135deg, #8B3DFF, #00C4CC)',
                            color: 'white'
                        }}
                        title="Import your Canva design and add dynamic fields"
                    >
                        <Upload className="w-4 h-4" />
                        Import Canva
                    </button>
                </div>

                {/* Center Section - Preview Toggle */}
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <div className="relative">
                            <input
                                type="checkbox"
                                checked={previewMode}
                                onChange={(e) => setPreviewMode(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </div>
                        <span className="text-sm font-medium text-gray-700">Preview with data</span>
                    </label>
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-sm transition-all",
                            "bg-blue-600 text-white hover:bg-blue-700",
                            isSaving && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Saving...' : 'Save Template'}
                    </button>

                    <button
                        onClick={handlePreview}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm transition-all"
                    >
                        <Eye className="w-4 h-4" />
                        Preview
                    </button>

                    {/* User Info & Logout */}
                    <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User className="w-4 h-4" />
                            <span className="max-w-[150px] truncate">
                                {currentUser?.email || 'Guest'}
                            </span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Logout"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Canva Import Modal */}
            <CanvaImportModal
                isOpen={isCanvaImportOpen}
                onClose={() => setIsCanvaImportOpen(false)}
                onImportComplete={() => {
                    // Modal closes and editor now has the background
                    toast.success('Now add dynamic text and image fields on top of your design!');
                }}
            />
        </>
    );
}

