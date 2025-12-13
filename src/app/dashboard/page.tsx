'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Plus,
    Sparkles,
    TrendingUp,
    Layers,
    FolderOpen,
    Clock,
    ArrowRight,
    Image,
    Zap,
    Eye,
    CheckCircle,
    Play,
    ChevronRight,
    Pause,
    AlertCircle,
    FileText,
    Edit3,
    Upload,
    Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';
import { DashboardEmptyState } from '@/components/ui/EmptyStates';

// Mock data - replace with real API calls
const MOCK_STATS = {
    templates: 12,
    campaigns: 5,
    pinsGenerated: 847,
    thisMonth: 234,
};

const MOCK_RECENT_ACTIVITY = [
    {
        id: '1',
        type: 'campaign_complete',
        title: 'Summer Products 2025',
        description: 'Campaign completed successfully',
        meta: '50 pins generated',
        time: '2 hours ago',
        icon: CheckCircle,
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600'
    },
    {
        id: '2',
        type: 'template_created',
        title: 'Product Showcase',
        description: 'New template created',
        meta: '3 dynamic fields',
        time: '5 hours ago',
        icon: Plus,
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600'
    },
    {
        id: '3',
        type: 'campaign_started',
        title: 'Recipe Cards Batch',
        description: 'Campaign is processing',
        meta: '10 of 25 completed',
        time: '1 day ago',
        icon: Play,
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-600'
    },
    {
        id: '4',
        type: 'template_edited',
        title: 'Blog Header v2',
        description: 'Template updated',
        meta: 'Added new text field',
        time: '2 days ago',
        icon: Edit3,
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600'
    },
    {
        id: '5',
        type: 'csv_uploaded',
        title: 'products_summer.csv',
        description: 'Data file imported',
        meta: '150 rows',
        time: '3 days ago',
        icon: Upload,
        iconBg: 'bg-indigo-100',
        iconColor: 'text-indigo-600'
    },
];

const MOCK_CAMPAIGNS = [
    { id: '1', name: 'Summer Products 2025', status: 'completed', total: 50, generated: 50, thumbnail: null },
    { id: '2', name: 'Recipe Cards Batch', status: 'processing', total: 25, generated: 10, thumbnail: null },
    { id: '3', name: 'Blog Post Headers', status: 'pending', total: 30, generated: 0, thumbnail: null },
];

// Stat Card Component
function StatCard({
    label,
    value,
    icon: Icon,
    trend,
    color = 'blue'
}: {
    label: string;
    value: number | string;
    icon: React.ElementType;
    trend?: string;
    color?: 'blue' | 'purple' | 'green' | 'amber';
}) {
    const colors = {
        blue: 'from-blue-500 to-indigo-600',
        purple: 'from-purple-500 to-pink-600',
        green: 'from-green-500 to-emerald-600',
        amber: 'from-amber-500 to-orange-600',
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
                    <p className="text-3xl font-bold text-gray-900">{value}</p>
                    {trend && (
                        <p className="text-sm text-green-600 font-medium mt-1 flex items-center gap-1">
                            <TrendingUp className="w-4 h-4" />
                            {trend}
                        </p>
                    )}
                </div>
                <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br",
                    colors[color]
                )}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
            </div>
        </div>
    );
}

// Quick Action Card
function QuickAction({
    href,
    icon: Icon,
    label,
    description,
    color
}: {
    href: string;
    icon: React.ElementType;
    label: string;
    description: string;
    color: string;
}) {
    return (
        <Link
            href={href}
            className="group bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-blue-300 transition-all flex items-center gap-4"
        >
            <div className={cn(
                "w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0",
                color
            )}>
                <Icon className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {label}
                </h3>
                <p className="text-sm text-gray-500">{description}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
        </Link>
    );
}

// Enhanced Activity Item
function ActivityItem({ activity }: { activity: typeof MOCK_RECENT_ACTIVITY[0] }) {
    const Icon = activity.icon;

    return (
        <div className="flex gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors group cursor-pointer">
            <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                activity.iconBg
            )}>
                <Icon className={cn("w-5 h-5", activity.iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                            {activity.title}
                        </p>
                        <p className="text-sm text-gray-500">{activity.description}</p>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{activity.time}</span>
                </div>
                <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {activity.meta}
                    </span>
                </div>
            </div>
        </div>
    );
}

// Enhanced Campaign Card
function CampaignCard({ campaign }: { campaign: typeof MOCK_CAMPAIGNS[0] }) {
    const progress = campaign.total > 0
        ? Math.round((campaign.generated / campaign.total) * 100)
        : 0;

    const getStatusConfig = () => {
        switch (campaign.status) {
            case 'completed':
                return {
                    badge: 'Completed',
                    badgeClass: 'bg-green-100 text-green-700 border-green-200',
                    progressClass: 'bg-gradient-to-r from-green-400 to-emerald-500',
                    icon: CheckCircle
                };
            case 'processing':
                return {
                    badge: 'In Progress',
                    badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
                    progressClass: 'bg-gradient-to-r from-blue-400 to-indigo-500',
                    icon: Play
                };
            case 'pending':
                return {
                    badge: 'Pending',
                    badgeClass: 'bg-gray-100 text-gray-600 border-gray-200',
                    progressClass: 'bg-gray-300',
                    icon: Pause
                };
            default:
                return {
                    badge: 'Unknown',
                    badgeClass: 'bg-gray-100 text-gray-600 border-gray-200',
                    progressClass: 'bg-gray-300',
                    icon: AlertCircle
                };
        }
    };

    const config = getStatusConfig();
    const StatusIcon = config.icon;

    return (
        <Link
            href={`/dashboard/campaigns/${campaign.id}`}
            className="group block bg-white rounded-xl border-2 border-gray-100 p-5 hover:shadow-lg hover:border-blue-200 transition-all"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0">
                        <Layers className="w-6 h-6 text-gray-500" />
                    </div>
                    <div className="min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                            {campaign.name}
                        </h4>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                            <StatusIcon className="w-3.5 h-3.5" />
                            <span>{config.badge}</span>
                        </div>
                    </div>
                </div>
                <span className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-semibold border",
                    config.badgeClass
                )}>
                    {progress}%
                </span>
            </div>

            {/* Progress */}
            <div className="space-y-2">
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className={cn("h-full rounded-full transition-all duration-500", config.progressClass)}
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                        <span className="font-semibold text-gray-900">{campaign.generated}</span> of {campaign.total} pins
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </div>
            </div>
        </Link>
    );
}

export default function DashboardPage() {
    const { currentUser } = useAuth();
    const [hasData, setHasData] = useState(true);

    if (!hasData) {
        return <DashboardEmptyState />;
    }

    return (
        <div className="space-y-8">
            {/* Welcome Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Welcome back{currentUser?.email ? `, ${currentUser.email.split('@')[0]}` : ''}! 👋
                    </h1>
                    <p className="text-gray-500 mt-1">Here&apos;s what&apos;s happening with your pins</p>
                </div>
                <Link
                    href="/editor"
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl"
                >
                    <Plus className="w-5 h-5" />
                    Create New
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Total Templates"
                    value={MOCK_STATS.templates}
                    icon={Layers}
                    color="blue"
                />
                <StatCard
                    label="Active Campaigns"
                    value={MOCK_STATS.campaigns}
                    icon={FolderOpen}
                    color="purple"
                />
                <StatCard
                    label="Pins Generated"
                    value={MOCK_STATS.pinsGenerated.toLocaleString()}
                    icon={Image}
                    trend="+234 this month"
                    color="green"
                />
                <StatCard
                    label="This Month"
                    value={MOCK_STATS.thisMonth}
                    icon={Sparkles}
                    color="amber"
                />
            </div>

            {/* Quick Actions */}
            <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid md:grid-cols-3 gap-4">
                    <QuickAction
                        href="/editor"
                        icon={Plus}
                        label="New Template"
                        description="Design a reusable pin layout"
                        color="bg-gradient-to-br from-blue-500 to-indigo-600"
                    />
                    <QuickAction
                        href="/dashboard/campaigns/new"
                        icon={Zap}
                        label="Bulk Generate"
                        description="Create pins from CSV data"
                        color="bg-gradient-to-br from-purple-500 to-pink-600"
                    />
                    <QuickAction
                        href="/dashboard/templates"
                        icon={Eye}
                        label="Browse Templates"
                        description="View and manage your designs"
                        color="bg-gradient-to-br from-green-500 to-emerald-600"
                    />
                </div>
            </section>

            {/* Campaigns Section - Full Width */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <FolderOpen className="w-5 h-5 text-gray-400" />
                        Your Campaigns
                    </h2>
                    <Link
                        href="/dashboard/campaigns"
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                        View all
                        <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                    {MOCK_CAMPAIGNS.map((campaign) => (
                        <CampaignCard key={campaign.id} campaign={campaign} />
                    ))}
                </div>
            </section>

            {/* Recent Activity - Full Width, Card Style */}
            <section>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-gray-400" />
                            Recent Activity
                        </h2>
                        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                            View all
                        </button>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {MOCK_RECENT_ACTIVITY.map((activity) => (
                            <ActivityItem key={activity.id} activity={activity} />
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
