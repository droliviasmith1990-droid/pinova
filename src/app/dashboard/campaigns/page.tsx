'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Plus,
    Loader2,
    Trash2,
    FileSpreadsheet,
    Clock,
    CheckCircle,
    XCircle,
    Eye,
    Play,
    Sparkles,
    ArrowRight,
    Layout,
    Upload,
    Link2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';
import { getCampaigns, deleteCampaign, CampaignListItem } from '@/lib/db/campaigns';
import { CampaignStatus } from '@/types/database.types';
import { toast } from 'sonner';
import { isSupabaseConfigured } from '@/lib/supabase';

// Demo campaigns for when database is not configured
const demoCampaigns: CampaignListItem[] = [
    {
        id: 'demo-1',
        name: 'Summer Products 2025',
        template_id: 'demo-template',
        total_pins: 50,
        generated_pins: 50,
        status: 'completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'demo-2',
        name: 'Recipe Cards Batch',
        template_id: 'demo-template',
        total_pins: 25,
        generated_pins: 10,
        status: 'processing',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
];

const statusConfig: Record<CampaignStatus, { icon: typeof CheckCircle; label: string; color: string; bgColor: string; borderColor: string }> = {
    pending: {
        icon: Clock,
        label: 'Pending',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-200'
    },
    processing: {
        icon: Loader2,
        label: 'In Progress',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
    },
    paused: {
        icon: Clock,
        label: 'Paused',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200'
    },
    completed: {
        icon: CheckCircle,
        label: 'Completed',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
    },
    failed: {
        icon: XCircle,
        label: 'Failed',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
    },
};

// Skeleton loading card
function CampaignCardSkeleton() {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="h-6 w-48 bg-gray-200 rounded shimmer" />
                        <div className="h-6 w-20 bg-gray-100 rounded-full shimmer" />
                    </div>
                    <div className="h-4 w-32 bg-gray-100 rounded shimmer" />
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-center">
                        <div className="h-8 w-16 bg-gray-200 rounded shimmer mx-auto" />
                        <div className="h-3 w-12 bg-gray-100 rounded shimmer mt-1 mx-auto" />
                    </div>
                    <div className="w-32">
                        <div className="h-3 bg-gray-200 rounded-full shimmer" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CampaignsPage() {
    const router = useRouter();
    const { currentUser, loading: authLoading } = useAuth();

    const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    // Redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !currentUser) {
            router.push('/login');
        }
    }, [authLoading, currentUser, router]);

    // Fetch campaigns
    useEffect(() => {
        const fetchCampaigns = async () => {
            if (!currentUser) return;

            setIsLoading(true);
            try {
                if (isSupabaseConfigured()) {
                    const data = await getCampaigns();
                    setCampaigns(data);
                } else {
                    setCampaigns(demoCampaigns);
                }
            } catch (error) {
                console.error('Error fetching campaigns:', error);
                setCampaigns(demoCampaigns);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCampaigns();
    }, [currentUser]);

    const handleDelete = async (campaignId: string, campaignName: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const confirmed = window.confirm(`Delete campaign "${campaignName}"? This cannot be undone.`);
        if (!confirmed) return;

        setDeletingId(campaignId);
        try {
            const success = await deleteCampaign(campaignId);
            if (success) {
                setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
                toast.success('Campaign deleted');
            } else {
                toast.error('Failed to delete campaign');
            }
        } catch (error) {
            console.error('Error deleting campaign:', error);
            toast.error('Failed to delete campaign');
        } finally {
            setDeletingId(null);
        }
    };

    if (authLoading || !currentUser) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header - Enhanced */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
                        <p className="text-gray-600 text-sm mt-1">Manage your bulk pin generation campaigns</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/editor"
                            className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                        >
                            Template Editor
                        </Link>
                        <Link
                            href="/dashboard/campaigns/new"
                            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30"
                        >
                            <Plus className="w-5 h-5" />
                            New Campaign
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                {/* Skeleton Loading State */}
                {isLoading ? (
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <CampaignCardSkeleton key={i} />
                        ))}
                    </div>
                ) : campaigns.length === 0 ? (
                    /* Enhanced Empty State */
                    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border-2 border-dashed border-gray-300 p-12">
                        <div className="max-w-lg mx-auto text-center">
                            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-6">
                                <Sparkles className="w-10 h-10 text-blue-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-3">Create Your First Campaign</h3>
                            <p className="text-gray-600 mb-8">
                                Transform your data into beautiful pins at scale.
                                Just upload a CSV, pick a template, and let us do the rest.
                            </p>

                            {/* Workflow Steps */}
                            <div className="flex items-center justify-center gap-3 mb-8">
                                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg text-sm text-blue-700">
                                    <Upload className="w-4 h-4" />
                                    <span>Upload CSV</span>
                                </div>
                                <ArrowRight className="w-4 h-4 text-gray-400" />
                                <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg text-sm text-purple-700">
                                    <Layout className="w-4 h-4" />
                                    <span>Pick Template</span>
                                </div>
                                <ArrowRight className="w-4 h-4 text-gray-400" />
                                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg text-sm text-green-700">
                                    <Link2 className="w-4 h-4" />
                                    <span>Map Fields</span>
                                </div>
                                <ArrowRight className="w-4 h-4 text-gray-400" />
                                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg text-sm text-amber-700">
                                    <Sparkles className="w-4 h-4" />
                                    <span>Generate!</span>
                                </div>
                            </div>

                            <Link
                                href="/dashboard/campaigns/new"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:-translate-y-0.5"
                            >
                                <Plus className="w-5 h-5" />
                                Start Your First Campaign
                            </Link>
                        </div>
                    </div>
                ) : (
                    /* Enhanced Campaign List */
                    <div className="space-y-4">
                        {campaigns.map((campaign) => {
                            const status = statusConfig[campaign.status];
                            const StatusIcon = status.icon;
                            const progress = campaign.total_pins > 0
                                ? Math.round((campaign.generated_pins / campaign.total_pins) * 100)
                                : 0;
                            const isHovered = hoveredId === campaign.id;

                            return (
                                <Link
                                    key={campaign.id}
                                    href={`/dashboard/campaigns/${campaign.id}`}
                                    className={cn(
                                        "group block bg-white rounded-xl border-2 p-6 cursor-pointer transition-all duration-300",
                                        isHovered
                                            ? "shadow-xl border-blue-400 scale-[1.01]"
                                            : "shadow-sm border-gray-200 hover:shadow-lg hover:border-blue-300"
                                    )}
                                    onMouseEnter={() => setHoveredId(campaign.id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-bold text-gray-900 truncate">
                                                    {campaign.name}
                                                </h3>
                                                <span className={cn(
                                                    "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border",
                                                    status.bgColor,
                                                    status.color,
                                                    status.borderColor
                                                )}>
                                                    <StatusIcon className={cn(
                                                        "w-3.5 h-3.5",
                                                        campaign.status === 'processing' && "animate-spin"
                                                    )} />
                                                    {status.label}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500">
                                                Created {new Date(campaign.created_at).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </p>
                                        </div>

                                        {/* Progress Section */}
                                        <div className="flex items-center gap-8">
                                            {/* Pins Counter */}
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-gray-900">
                                                    <span className={campaign.status === 'completed' ? 'text-green-600' : 'text-blue-600'}>
                                                        {campaign.generated_pins}
                                                    </span>
                                                    <span className="text-gray-400 font-normal text-lg">/{campaign.total_pins}</span>
                                                </p>
                                                <p className="text-xs text-gray-500 font-medium">Pins Generated</p>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="w-40">
                                                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full transition-all duration-500 rounded-full",
                                                            campaign.status === 'completed'
                                                                ? "bg-gradient-to-r from-green-400 to-emerald-500"
                                                                : campaign.status === 'failed'
                                                                    ? "bg-gradient-to-r from-red-400 to-red-500"
                                                                    : "bg-gradient-to-r from-blue-400 to-indigo-500"
                                                        )}
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-500 text-center mt-1.5 font-medium">
                                                    {progress}% complete
                                                </p>
                                            </div>

                                            {/* Hover Actions */}
                                            <div className={cn(
                                                "flex items-center gap-2 transition-all duration-300",
                                                isHovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2"
                                            )}>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        router.push(`/dashboard/campaigns/${campaign.id}`);
                                                    }}
                                                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    View
                                                </button>
                                                {(campaign.status === 'failed' || campaign.status === 'pending') && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            toast.info('Resume feature coming soon');
                                                        }}
                                                        className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                                                    >
                                                        <Play className="w-4 h-4" />
                                                        Resume
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => handleDelete(campaign.id, campaign.name, e)}
                                                    disabled={deletingId === campaign.id}
                                                    className={cn(
                                                        "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                                        deletingId === campaign.id
                                                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                            : "bg-red-50 text-red-600 hover:bg-red-100"
                                                    )}
                                                >
                                                    {deletingId === campaign.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
