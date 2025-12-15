'use client';

import React from 'react';
import { Cloud, CloudOff, Check, Loader2, AlertCircle } from 'lucide-react';
import { AutoSaveStatus, formatRelativeTime } from '@/hooks/useAutoSave';
import { cn } from '@/lib/utils';

interface AutoSaveIndicatorProps {
    status: AutoSaveStatus;
    lastSavedAt: Date | null;
    isDirty: boolean;
    errorMessage?: string | null;
    className?: string;
}

/**
 * Visual indicator for auto-save status
 * Shows: idle, pending changes, saving in progress, saved, error
 */
export function AutoSaveIndicator({
    status,
    lastSavedAt,
    isDirty,
    errorMessage,
    className,
}: AutoSaveIndicatorProps) {
    const getStatusConfig = () => {
        switch (status) {
            case 'idle':
                return {
                    icon: isDirty ? Cloud : Check,
                    text: isDirty ? 'Unsaved changes' : formatRelativeTime(lastSavedAt),
                    color: isDirty ? 'text-amber-500' : 'text-gray-400',
                    bgColor: isDirty ? 'bg-amber-50' : 'bg-gray-50',
                    animate: false,
                };
            case 'pending':
                return {
                    icon: Cloud,
                    text: 'Saving soon...',
                    color: 'text-blue-500',
                    bgColor: 'bg-blue-50',
                    animate: false,
                };
            case 'saving':
                return {
                    icon: Loader2,
                    text: 'Auto-saving...',
                    color: 'text-blue-600',
                    bgColor: 'bg-blue-50',
                    animate: true,
                };
            case 'saved':
                return {
                    icon: Check,
                    text: formatRelativeTime(lastSavedAt),
                    color: 'text-green-600',
                    bgColor: 'bg-green-50',
                    animate: false,
                };
            case 'error':
                return {
                    icon: AlertCircle,
                    text: errorMessage || 'Save failed',
                    color: 'text-red-500',
                    bgColor: 'bg-red-50',
                    animate: false,
                };
            default:
                return {
                    icon: Cloud,
                    text: 'Ready',
                    color: 'text-gray-400',
                    bgColor: 'bg-gray-50',
                    animate: false,
                };
        }
    };

    const config = getStatusConfig();
    const Icon = config.icon;

    return (
        <div
            className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all duration-200',
                config.bgColor,
                config.color,
                className
            )}
            title={errorMessage || `Status: ${status}`}
            data-testid="autosave-indicator"
        >
            <Icon
                className={cn(
                    'w-3.5 h-3.5',
                    config.animate && 'animate-spin'
                )}
            />
            <span className="hidden sm:inline">{config.text}</span>
        </div>
    );
}

/**
 * Dirty state dot indicator (minimal)
 * Just shows a colored dot when there are unsaved changes
 */
export function DirtyIndicator({ isDirty }: { isDirty: boolean }) {
    if (!isDirty) return null;

    return (
        <div
            className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"
            title="Unsaved changes"
        />
    );
}
