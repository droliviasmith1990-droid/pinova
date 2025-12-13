'use client';

import React from 'react';
import Link from 'next/link';
import {
    Sparkles,
    Layout,
    Upload,
    Zap,
    ArrowRight,
    Plus,
    FileSpreadsheet,
    Palette
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
    type: 'dashboard' | 'templates' | 'campaigns' | 'pins';
    showGettingStarted?: boolean;
}

// Getting Started Checklist Item
interface ChecklistItem {
    id: string;
    title: string;
    description: string;
    completed: boolean;
    href: string;
    icon: React.ReactNode;
}

const gettingStartedSteps: ChecklistItem[] = [
    {
        id: 'create-template',
        title: 'Create your first template',
        description: 'Design a reusable pin layout',
        completed: false,
        href: '/editor',
        icon: <Layout className="w-5 h-5" />,
    },
    {
        id: 'add-dynamic',
        title: 'Add dynamic fields',
        description: 'Mark text/images as replaceable',
        completed: false,
        href: '/editor',
        icon: <Zap className="w-5 h-5" />,
    },
    {
        id: 'upload-csv',
        title: 'Upload your data',
        description: 'Import a CSV with your content',
        completed: false,
        href: '/dashboard/campaigns/new',
        icon: <Upload className="w-5 h-5" />,
    },
    {
        id: 'generate-pins',
        title: 'Generate pins at scale',
        description: 'Create hundreds of pins instantly',
        completed: false,
        href: '/dashboard/campaigns/new',
        icon: <Sparkles className="w-5 h-5" />,
    },
];

export function DashboardEmptyState({ showGettingStarted = true }: { showGettingStarted?: boolean }) {
    return (
        <div className="space-y-8">
            {/* Hero Empty State */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl border border-blue-100 p-8 md:p-12">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-pink-200/30 to-blue-200/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                <div className="relative flex flex-col md:flex-row items-center gap-8">
                    {/* Illustration */}
                    <div className="flex-shrink-0">
                        <div className="relative w-32 h-32 md:w-40 md:h-40">
                            {/* Layered cards illustration */}
                            <div className="absolute inset-0 bg-white rounded-2xl shadow-xl rotate-6 border border-gray-200" />
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl shadow-lg -rotate-3" />
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-2xl flex items-center justify-center">
                                <Sparkles className="w-12 h-12 md:w-16 md:h-16 text-white" />
                            </div>
                            {/* Floating elements */}
                            <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-bounce" style={{ animationDelay: '0.1s' }}>
                                <Plus className="w-4 h-4 text-yellow-900" />
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 text-center md:text-left">
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                            Welcome to Pin Generator
                        </h2>
                        <p className="text-gray-600 text-lg mb-6 max-w-lg">
                            Create stunning Pinterest pins at scale. Design once, generate hundreds of variations automatically.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            <Link
                                href="/editor"
                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:-translate-y-0.5"
                            >
                                <Plus className="w-5 h-5" />
                                Create First Template
                            </Link>
                            <Link
                                href="/dashboard/campaigns/new"
                                className="flex items-center gap-2 px-6 py-3 bg-white text-gray-700 rounded-xl font-semibold border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                            >
                                <FileSpreadsheet className="w-5 h-5" />
                                Import CSV Data
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Getting Started Checklist */}
            {showGettingStarted && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                                <Zap className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Getting Started</h3>
                                <p className="text-sm text-gray-500">Complete these steps to create your first pins</p>
                            </div>
                        </div>
                        <span className="text-sm font-medium text-gray-400">0 / 4 complete</span>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {gettingStartedSteps.map((step, index) => (
                            <Link
                                key={step.id}
                                href={step.href}
                                className="group flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                            >
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                                    step.completed
                                        ? "bg-green-100 text-green-600"
                                        : "bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600"
                                )}>
                                    {step.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-gray-400">Step {index + 1}</span>
                                    </div>
                                    <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                                        {step.title}
                                    </p>
                                    <p className="text-sm text-gray-500">{step.description}</p>
                                </div>
                                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export function TemplatesEmptyState() {
    return (
        <div className="text-center py-16 px-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border-2 border-dashed border-purple-200">
            <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 bg-purple-200 rounded-2xl rotate-6" />
                <div className="relative w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl">
                    <Palette className="w-10 h-10 text-white" />
                </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Templates Yet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Templates are reusable pin designs. Create one with dynamic fields,
                then use it to generate hundreds of variations.
            </p>
            <Link
                href="/editor"
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/25 hover:shadow-xl hover:-translate-y-0.5"
            >
                <Plus className="w-5 h-5" />
                Create Your First Template
            </Link>
        </div>
    );
}

export function PinsEmptyState() {
    return (
        <div className="text-center py-16 px-8 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-dashed border-green-200">
            <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 bg-green-200 rounded-2xl rotate-6" />
                <div className="relative w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-xl">
                    <Sparkles className="w-10 h-10 text-white" />
                </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Pins Generated</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Generated pins will appear here. Start a campaign to create
                bulk pins from your templates and data.
            </p>
            <Link
                href="/dashboard/campaigns/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all shadow-lg shadow-green-500/25 hover:shadow-xl hover:-translate-y-0.5"
            >
                <Plus className="w-5 h-5" />
                Start a Campaign
            </Link>
        </div>
    );
}
