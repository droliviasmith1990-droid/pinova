'use client';

/**
 * Auto-Save Hook
 * 
 * Provides automatic saving functionality for templates.
 * 
 * Features:
 * - Debounced auto-save (every 30 seconds after last change)
 * - Dirty state tracking
 * - Save failure retry with exponential backoff
 * - Browser unload warning when unsaved
 * - Auto-save status indicator
 * 
 * Finding #4 Resolution: Prevents data loss for users
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useElementsStore } from '@/stores/elementsStore';
import { useCanvasStore } from '@/stores/canvasStore';
import { saveTemplate as saveTemplateToDb } from '@/lib/db/templates';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface AutoSaveOptions {
    /** Delay in ms before auto-save triggers after last change */
    debounceMs?: number;
    /** Enable/disable auto-save */
    enabled?: boolean;
    /** Callback when auto-save status changes */
    onStatusChange?: (status: AutoSaveStatus) => void;
}

interface AutoSaveState {
    status: AutoSaveStatus;
    lastSavedAt: Date | null;
    isDirty: boolean;
    errorMessage: string | null;
}

const DEFAULT_DEBOUNCE_MS = 30000; // 30 seconds

export function useAutoSave(options: AutoSaveOptions = {}): AutoSaveState & {
    forceSave: () => Promise<void>;
} {
    const {
        debounceMs = DEFAULT_DEBOUNCE_MS,
        enabled = true,
        onStatusChange,
    } = options;

    // State
    const [status, setStatus] = useState<AutoSaveStatus>('idle');
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Refs for tracking
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastStateRef = useRef<string>('');
    const retryCountRef = useRef(0);
    const maxRetries = 3;

    // Get state from stores
    const templateId = useEditorStore((s) => s.templateId);
    const templateName = useEditorStore((s) => s.templateName);
    const isNewTemplate = useEditorStore((s) => s.isNewTemplate);
    const loadTemplate = useEditorStore((s) => s.loadTemplate);
    const elements = useElementsStore((s) => s.elements);
    const canvasSize = useCanvasStore((s) => s.canvasSize);
    const backgroundColor = useCanvasStore((s) => s.backgroundColor);

    // Update status and notify
    const updateStatus = useCallback((newStatus: AutoSaveStatus) => {
        setStatus(newStatus);
        onStatusChange?.(newStatus);
    }, [onStatusChange]);

    // Compute state hash for change detection
    const computeStateHash = useCallback(() => {
        return JSON.stringify({
            templateId,
            templateName,
            elements: elements.map(e => ({ ...e })), // Shallow copy for comparison
            canvasSize,
            backgroundColor,
        });
    }, [templateId, templateName, elements, canvasSize, backgroundColor]);

    // Perform the actual save
    const performSave = useCallback(async (): Promise<boolean> => {
        // Don't save if:
        // - Template is new and unnamed
        // - No elements
        // - Not configured
        if (templateName === 'Untitled Template' || templateName.trim() === '') {
            return false;
        }

        if (elements.length === 0) {
            return false;
        }

        if (!isSupabaseConfigured()) {
            // localStorage persistence is handled by Zustand's persist
            setLastSavedAt(new Date());
            setIsDirty(false);
            updateStatus('saved');
            return true;
        }

        // Get user
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return false;
        }

        updateStatus('saving');

        try {
            const savedTemplate = await saveTemplateToDb({
                id: isNewTemplate ? undefined : templateId,
                name: templateName,
                canvas_size: canvasSize,
                background_color: backgroundColor,
                elements: elements,
            });

            if (savedTemplate) {
                // Update state with saved template (gets new ID if new)
                if (isNewTemplate && savedTemplate.id !== templateId) {
                    loadTemplate({
                        id: savedTemplate.id,
                        name: savedTemplate.name,
                        elements: savedTemplate.elements,
                        background_color: savedTemplate.background_color,
                        canvas_size: savedTemplate.canvas_size,
                    });
                }

                setLastSavedAt(new Date());
                setIsDirty(false);
                setErrorMessage(null);
                retryCountRef.current = 0;
                lastStateRef.current = computeStateHash();
                updateStatus('saved');
                return true;
            } else {
                throw new Error('Save returned null');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            setErrorMessage(message);
            updateStatus('error');
            return false;
        }
    }, [
        templateId,
        templateName,
        isNewTemplate,
        elements,
        canvasSize,
        backgroundColor,
        loadTemplate,
        computeStateHash,
        updateStatus,
    ]);

    // Force save (public API)
    const forceSave = useCallback(async () => {
        // Clear any pending auto-save
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }
        await performSave();
    }, [performSave]);

    // Schedule auto-save
    const scheduleAutoSave = useCallback(() => {
        if (!enabled) return;

        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        updateStatus('pending');

        // Schedule new save
        saveTimeoutRef.current = setTimeout(async () => {
            const success = await performSave();

            // Retry on failure with exponential backoff
            if (!success && retryCountRef.current < maxRetries) {
                retryCountRef.current++;
                const retryDelay = Math.min(debounceMs * Math.pow(2, retryCountRef.current), 60000);
                saveTimeoutRef.current = setTimeout(() => performSave(), retryDelay);
            }
        }, debounceMs);
    }, [enabled, performSave, debounceMs, updateStatus]);

    // Detect changes and trigger auto-save
    useEffect(() => {
        const currentHash = computeStateHash();

        // Skip if no change
        if (currentHash === lastStateRef.current) {
            return;
        }

        // Skip on initial render
        if (lastStateRef.current === '') {
            lastStateRef.current = currentHash;
            return;
        }

        // Mark as dirty and schedule save
        setIsDirty(true);
        scheduleAutoSave();
    }, [computeStateHash, scheduleAutoSave]);

    // Warn on unload when dirty
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    return {
        status,
        lastSavedAt,
        isDirty,
        errorMessage,
        forceSave,
    };
}

/**
 * Format relative time for "Last saved X minutes ago"
 */
export function formatRelativeTime(date: Date | null): string {
    if (!date) return 'Never saved';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffSec < 10) return 'Just saved';
    if (diffSec < 60) return `Saved ${diffSec}s ago`;
    if (diffMin < 60) return `Saved ${diffMin}m ago`;
    if (diffHour < 24) return `Saved ${diffHour}h ago`;

    return `Saved on ${date.toLocaleDateString()}`;
}
