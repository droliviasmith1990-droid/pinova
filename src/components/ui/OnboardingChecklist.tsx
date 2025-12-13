'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    X,
    Check,
    ChevronRight,
    Sparkles,
    Layout,
    Zap,
    Upload,
    Rocket
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'pinterest-editor-onboarding';

interface OnboardingStep {
    id: string;
    title: string;
    description: string;
    href: string;
    icon: React.ReactNode;
    checkAction?: string; // localStorage key to check if completed
}

const steps: OnboardingStep[] = [
    {
        id: 'create-template',
        title: 'Create a template',
        description: 'Design your first pin layout',
        href: '/editor',
        icon: <Layout className="w-5 h-5" />,
        checkAction: 'template-created',
    },
    {
        id: 'add-dynamic',
        title: 'Add dynamic fields',
        description: 'Make elements replaceable',
        href: '/editor',
        icon: <Zap className="w-5 h-5" />,
        checkAction: 'dynamic-field-added',
    },
    {
        id: 'upload-data',
        title: 'Upload your data',
        description: 'Import a CSV file',
        href: '/dashboard/campaigns/new',
        icon: <Upload className="w-5 h-5" />,
        checkAction: 'csv-uploaded',
    },
    {
        id: 'generate-pins',
        title: 'Generate pins',
        description: 'Create bulk content',
        href: '/dashboard/campaigns/new',
        icon: <Rocket className="w-5 h-5" />,
        checkAction: 'pins-generated',
    },
];

interface OnboardingState {
    dismissed: boolean;
    completedSteps: string[];
    minimized: boolean;
}

const defaultState: OnboardingState = {
    dismissed: false,
    completedSteps: [],
    minimized: false,
};

export function OnboardingChecklist() {
    const [state, setState] = useState<OnboardingState>(defaultState);
    const [mounted, setMounted] = useState(false);

    // Load state from localStorage
    useEffect(() => {
        setMounted(true);
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                setState(JSON.parse(stored));
            } catch {
                setState(defaultState);
            }
        }
    }, []);

    // Save state to localStorage
    useEffect(() => {
        if (mounted) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }
    }, [state, mounted]);

    // Check for completed actions
    useEffect(() => {
        if (!mounted) return;

        const newCompleted: string[] = [];
        steps.forEach(step => {
            if (step.checkAction && localStorage.getItem(step.checkAction)) {
                newCompleted.push(step.id);
            }
        });

        if (newCompleted.length !== state.completedSteps.length) {
            setState(prev => ({
                ...prev,
                completedSteps: newCompleted,
            }));
        }
    }, [mounted, state.completedSteps.length]);

    const handleDismiss = () => {
        setState(prev => ({ ...prev, dismissed: true }));
    };

    const handleToggleMinimize = () => {
        setState(prev => ({ ...prev, minimized: !prev.minimized }));
    };

    const completedCount = state.completedSteps.length;
    const totalSteps = steps.length;
    const progress = (completedCount / totalSteps) * 100;
    const allComplete = completedCount === totalSteps;

    // Don't render on server or if dismissed
    if (!mounted || state.dismissed || allComplete) {
        return null;
    }

    // Minimized state
    if (state.minimized) {
        return (
            <button
                onClick={handleToggleMinimize}
                className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-blue-600 to-indigo-600 text-white pl-4 pr-5 py-3 rounded-full shadow-xl hover:shadow-2xl transition-all flex items-center gap-3"
            >
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                </div>
                <span className="font-medium">
                    {completedCount}/{totalSteps} complete
                </span>
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 z-40 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-fade-in-up">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        <h3 className="font-bold">Getting Started</h3>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleToggleMinimize}
                            className="p-1 hover:bg-white/20 rounded transition-colors"
                            aria-label="Minimize"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="p-1 hover:bg-white/20 rounded transition-colors"
                            aria-label="Dismiss onboarding"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-white/30 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-white rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-sm font-medium">{completedCount}/{totalSteps}</span>
                </div>
            </div>

            {/* Steps */}
            <div className="divide-y divide-gray-100">
                {steps.map((step, index) => {
                    const isCompleted = state.completedSteps.includes(step.id);

                    return (
                        <Link
                            key={step.id}
                            href={step.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 transition-colors group",
                                isCompleted ? "bg-green-50" : "hover:bg-gray-50"
                            )}
                        >
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                                isCompleted
                                    ? "bg-green-500 text-white"
                                    : "bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600"
                            )}>
                                {isCompleted ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    step.icon
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={cn(
                                    "font-medium text-sm",
                                    isCompleted ? "text-green-700 line-through" : "text-gray-900"
                                )}>
                                    {step.title}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                    {step.description}
                                </p>
                            </div>
                            {!isCompleted && (
                                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                            )}
                        </Link>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                <button
                    onClick={handleDismiss}
                    className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                    Don&apos;t show again
                </button>
            </div>
        </div>
    );
}

// Helper functions to mark steps as complete (call these from other components)
export const onboardingActions = {
    templateCreated: () => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('template-created', 'true');
            window.dispatchEvent(new Event('onboarding-update'));
        }
    },
    dynamicFieldAdded: () => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('dynamic-field-added', 'true');
            window.dispatchEvent(new Event('onboarding-update'));
        }
    },
    csvUploaded: () => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('csv-uploaded', 'true');
            window.dispatchEvent(new Event('onboarding-update'));
        }
    },
    pinsGenerated: () => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('pins-generated', 'true');
            window.dispatchEvent(new Event('onboarding-update'));
        }
    },
    reset: () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem('template-created');
            localStorage.removeItem('dynamic-field-added');
            localStorage.removeItem('csv-uploaded');
            localStorage.removeItem('pins-generated');
        }
    },
};
